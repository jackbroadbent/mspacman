/**
 * Google Sheets as the database.
 *
 * Source of truth: the MPM_V3 spreadsheet, tab Sheath2_RawData (GOOGLE_SHEET_TAB).
 * One row per game. Columns the app reads/writes:
 *   A  Timestamp            (date, in the spreadsheet's time zone)
 *   B  P_ID                 (player initials, e.g. "JMB")
 *   C  TERM_IT              ("1.3.2 - Banana"; levels 8+ use "Mystery")
 *   D  FINAL_SCORE
 *   I-P Fruit Gobble Log    (I,J = level 8 · K,L = 9 · M,N = 10 · O,P = 11)
 *   Q  Features / notes     (comma-separated free text, e.g. "Anomaly, The Standard")
 *   R,S legacy 1.4.2 fruit log (read-only fallback for level 11)
 * Columns E-H and T hold the sheet owner's formulas and are never written.
 *
 * Server-only: uses the service account credentials.
 */
import { google, sheets_v4 } from 'googleapis'
import { createHash } from 'crypto'
import { readFileSync } from 'fs'
import { FRUITS, FruitKey, GAME_FEATURES, getMaze, LevelFruitCounts } from './constants'
import { LevelFruitsJson } from './types'

export interface ScoreRecord {
  /** Stable-enough handle: `${sheetRow}-${fingerprint}`. Verified before any write. */
  id: string
  row: number
  playerId: string
  playerName: string
  score: number
  level: number
  levelFruits: LevelFruitsJson | null
  /** Known GAME_FEATURES ids found in column Q */
  features: string[]
  /** Column Q text that isn't a known feature (kept intact on edits) */
  notes: string[]
  /** ISO 8601 UTC */
  createdAt: string
}

export interface ScoreInput {
  playerId: string
  score: number
  level: number
  levelFruits?: Record<string | number, LevelFruitCounts>
  features?: string[]
  customFeature?: string
}

export class SheetsDbError extends Error {
  constructor(message: string, public status: number = 500) {
    super(message)
  }
}

// ---------------------------------------------------------------------------
// Config & client
// ---------------------------------------------------------------------------

const LAST_COL = 'S'
const WRITE_LAST_COL = 'Q'
const COL = { A: 0, B: 1, C: 2, D: 3, I: 8, Q: 16, R: 17, S: 18 } as const
const CACHE_TTL_MS = 15_000

// Strip whitespace and a literal trailing "\n" (seen in env values pasted into Vercel)
function cleanEnv(value: string | undefined): string | undefined {
  return value?.trim().replace(/(\\n)+$/, '').trim() || undefined
}

function getConfig() {
  const email = cleanEnv(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL)
  const key = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n')
  const spreadsheetId = cleanEnv(process.env.GOOGLE_SHEET_ID)
  const tab = cleanEnv(process.env.GOOGLE_SHEET_TAB) || 'Sheath2_RawData'
  if (!email || !key || !spreadsheetId) {
    throw new SheetsDbError(
      'Google Sheets is not configured (GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, GOOGLE_SHEET_ID)'
    )
  }
  return { email, key, spreadsheetId, tab }
}

let client: sheets_v4.Sheets | null = null
function sheetsClient(): sheets_v4.Sheets {
  if (!client) {
    const { email, key } = getConfig()
    const auth = new google.auth.JWT({
      email,
      key,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    })
    client = google.sheets({ version: 'v4', auth })
  }
  return client
}

/** Quote a tab name for A1 notation */
function a1(tab: string, range: string): string {
  return `'${tab.replace(/'/g, "''")}'!${range}`
}

let metaPromise: Promise<{ sheetId: number; timeZone: string }> | null = null
function getSheetMeta() {
  if (!metaPromise) {
    metaPromise = (async () => {
      const { spreadsheetId, tab } = getConfig()
      const res = await sheetsClient().spreadsheets.get({
        spreadsheetId,
        fields: 'properties(timeZone),sheets(properties(sheetId,title))',
      })
      const sheet = res.data.sheets?.find(s => s.properties?.title === tab)
      if (sheet?.properties?.sheetId == null) {
        throw new SheetsDbError(`Tab "${tab}" not found in spreadsheet`)
      }
      return {
        sheetId: sheet.properties.sheetId,
        timeZone: res.data.properties?.timeZone || 'America/New_York',
      }
    })().catch(err => {
      metaPromise = null
      throw err
    })
  }
  return metaPromise
}

// ---------------------------------------------------------------------------
// Time zone helpers (sheet stores wall-clock time in the spreadsheet's zone)
// ---------------------------------------------------------------------------

function tzOffsetMs(timeZone: string, date: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric', month: 'numeric', day: 'numeric',
    hour: 'numeric', minute: 'numeric', second: 'numeric',
  }).formatToParts(date)
  const get = (t: string) => Number(parts.find(p => p.type === t)?.value)
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'))
  return asUtc - Math.floor(date.getTime() / 1000) * 1000
}

/** Interpret wall-clock milliseconds (as if UTC) in `timeZone` and return the real instant */
function wallClockToUtc(wallMs: number, timeZone: string): Date {
  const guess = wallMs - tzOffsetMs(timeZone, new Date(wallMs))
  return new Date(wallMs - tzOffsetMs(timeZone, new Date(guess)))
}

/** Format an instant as "YYYY-MM-DD HH:mm:ss" wall-clock in `timeZone` (locale-independent for Sheets) */
export function formatSheetTimestamp(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(date)
  const get = (t: string) => parts.find(p => p.type === t)?.value
  return `${get('year')}-${get('month')}-${get('day')} ${get('hour')}:${get('minute')}:${get('second')}`
}

const SHEETS_EPOCH_OFFSET_DAYS = 25569 // 1899-12-30 -> 1970-01-01

export function parseSheetTimestamp(value: unknown, timeZone: string): Date | null {
  if (typeof value === 'number' && isFinite(value)) {
    const wallMs = Math.round((value - SHEETS_EPOCH_OFFSET_DAYS) * 86400000)
    return wallClockToUtc(wallMs, timeZone)
  }
  if (typeof value !== 'string' || !value.trim()) return null
  const s = value.trim()
  // M/D/YYYY H:MM(:SS)
  let m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/)
  if (m) {
    const wall = Date.UTC(+m[3], +m[1] - 1, +m[2], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0))
    return wallClockToUtc(wall, timeZone)
  }
  // YYYY-MM-DD HH:MM(:SS)
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/)
  if (m && !/[zZ]|[+-]\d{2}:?\d{2}$/.test(s)) {
    const wall = Date.UTC(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0))
    return wallClockToUtc(wall, timeZone)
  }
  const d = new Date(s)
  return isNaN(d.getTime()) ? null : d
}

// ---------------------------------------------------------------------------
// TERM_IT <-> level
// ---------------------------------------------------------------------------

const MAZE_NUMBER = { A: 1, B: 2, C: 3, D: 4 } as const
const MAZE_START: Record<number, number> = { 1: 1, 2: 3, 3: 6, 4: 10 }
const FIXED_FRUIT_NAMES = ['Cherry', 'Strawberry', 'Orange', 'Pretzel', 'Apple', 'Pear', 'Banana']

/**
 * Level -> TERM_IT. Levels 1-13 use the sheet's existing "1.{maze}.{n}" scheme.
 * Levels 14+ (never reached so far) continue as "{loop}.{3|4}.{n}" so they decode unambiguously.
 */
export function levelToTermIt(level: number): string {
  const fruit = level <= 7 ? FIXED_FRUIT_NAMES[level - 1] : 'Mystery'
  if (level <= 13) {
    const maze = MAZE_NUMBER[getMaze(level)]
    return `1.${maze}.${level - MAZE_START[maze] + 1} - ${fruit}`
  }
  const k = level - 14
  const loop = 2 + Math.floor(k / 8)
  const within = k % 8
  return `${loop}.${within < 4 ? 3 : 4}.${(within % 4) + 1} - ${fruit}`
}

export function termItToLevel(termIt: string): number | null {
  const m = termIt.trim().match(/^(\d+)\.(\d+)\.(\d+)/)
  if (!m) return null
  const [loop, maze, pos] = [+m[1], +m[2], +m[3]]
  if (pos < 1) return null
  if (loop === 1) {
    const start = MAZE_START[maze]
    return start ? start + pos - 1 : null
  }
  if (loop >= 2 && (maze === 3 || maze === 4) && pos <= 4) {
    return 14 + (loop - 2) * 8 + (maze === 4 ? 4 : 0) + pos - 1
  }
  return null
}

// ---------------------------------------------------------------------------
// Fruits & features
// ---------------------------------------------------------------------------

const FRUIT_ALIASES: Record<string, FruitKey> = {
  cherry: 'cherry', cherritziana: 'cherry',
  strawberry: 'strawberry', stawberry: 'strawberry',
  orange: 'peach', peach: 'peach',
  pretzel: 'pretzel', pretziliana: 'pretzel',
  apple: 'apple', pear: 'pear', banana: 'banana',
}

function parseFruit(value: unknown): FruitKey | null {
  if (typeof value !== 'string') return null
  return FRUIT_ALIASES[value.trim().toLowerCase()] ?? null
}

function fruitSheetName(fruit: FruitKey): string {
  return fruit === 'peach' ? 'Orange' : FRUITS[fruit].name
}

const FEATURE_ALIASES: Record<string, string> = {
  templin: 'templins',
  footsman: 'footsmans',
}

function featureIdForText(text: string): string | null {
  const t = text.trim().toLowerCase()
  const byName = GAME_FEATURES.find(f => f.name.toLowerCase() === t || f.id === t)
  return byName?.id ?? FEATURE_ALIASES[t] ?? null
}

function parseFeatureCell(value: unknown): { features: string[]; notes: string[] } {
  const features: string[] = []
  const notes: string[] = []
  if (typeof value !== 'string' || !value.trim()) return { features, notes }
  for (const raw of value.split(',')) {
    const token = raw.trim()
    if (!token) continue
    const id = featureIdForText(token)
    if (id) {
      if (!features.includes(id)) features.push(id)
    } else {
      notes.push(token)
    }
  }
  return { features, notes }
}

function buildFeatureCell(features: string[], notes: string[]): string {
  const names = features.map(id => GAME_FEATURES.find(f => f.id === id)?.name ?? id)
  return [...names, ...notes].join(', ')
}

/** { cherry: 1, banana: 1 } -> ['cherry', 'banana'] */
export function countsToTuple(counts: LevelFruitCounts | undefined): [FruitKey | null, FruitKey | null] {
  const result: FruitKey[] = []
  for (const [fruit, count] of Object.entries(counts || {})) {
    for (let i = 0; i < (count || 0); i++) result.push(fruit as FruitKey)
  }
  return [result[0] || null, result[1] || null]
}

/** Fruit log columns for levels 8-11 -> zero-based column index of "Part I" */
const FRUIT_LOG_COL: Record<number, number> = { 8: 8, 9: 10, 10: 12, 11: 14 }

// ---------------------------------------------------------------------------
// Row parsing
// ---------------------------------------------------------------------------

type RawRow = unknown[]

function fingerprint(row: RawRow): string {
  const key = JSON.stringify([row[COL.A] ?? '', row[COL.B] ?? '', row[COL.C] ?? '', row[COL.D] ?? ''])
  return createHash('sha1').update(key).digest('hex').slice(0, 10)
}

function parseScoreValue(value: unknown): number | null {
  if (typeof value === 'number' && isFinite(value)) return Math.round(value)
  if (typeof value === 'string') {
    const n = parseInt(value.replace(/[,\s]/g, ''), 10)
    return isNaN(n) ? null : n
  }
  return null
}

export function parseRow(raw: RawRow, rowNumber: number, timeZone: string): ScoreRecord | null {
  const playerId = typeof raw[COL.B] === 'string' ? (raw[COL.B] as string).trim().toUpperCase() : ''
  const level = typeof raw[COL.C] === 'string' ? termItToLevel(raw[COL.C] as string) : null
  const score = parseScoreValue(raw[COL.D])
  const createdAt = parseSheetTimestamp(raw[COL.A], timeZone)
  if (!playerId || level == null || score == null || !createdAt) return null

  let levelFruits: LevelFruitsJson | null = null
  for (const [lvl, col] of Object.entries(FRUIT_LOG_COL)) {
    let pair: [FruitKey | null, FruitKey | null] = [parseFruit(raw[col]), parseFruit(raw[col + 1])]
    if (lvl === '11' && !pair[0] && !pair[1]) {
      pair = [parseFruit(raw[COL.R]), parseFruit(raw[COL.S])]
    }
    if (pair[0] || pair[1]) {
      levelFruits ??= {}
      levelFruits[lvl] = pair
    }
  }

  const { features, notes } = parseFeatureCell(raw[COL.Q])

  return {
    id: `${rowNumber}-${fingerprint(raw)}`,
    row: rowNumber,
    playerId,
    playerName: playerId,
    score,
    level,
    levelFruits,
    features,
    notes,
    createdAt: createdAt.toISOString(),
  }
}

// ---------------------------------------------------------------------------
// Reads (cached per server instance)
// ---------------------------------------------------------------------------

let cache: { at: number; scores: ScoreRecord[] } | null = null
let inflight: Promise<ScoreRecord[]> | null = null

function invalidate() {
  cache = null
}

// Dev-only: SHEETS_DB_FIXTURE=path/to/rows.json (array of raw A:S rows starting at sheet row 2)
function loadFixture(): ScoreRecord[] | null {
  const path = process.env.SHEETS_DB_FIXTURE
  if (!path || process.env.NODE_ENV === 'production') return null
  const rows = JSON.parse(readFileSync(path, 'utf-8')) as RawRow[]
  const tz = process.env.SHEETS_DB_FIXTURE_TZ || 'America/New_York'
  return sortNewestFirst(rows.map((r, i) => parseRow(r, i + 2, tz)).filter((s): s is ScoreRecord => !!s))
}

function sortNewestFirst(scores: ScoreRecord[]): ScoreRecord[] {
  return scores.sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.row - a.row)
}

async function fetchAllScores(): Promise<ScoreRecord[]> {
  const fixture = loadFixture()
  if (fixture) return fixture

  const { spreadsheetId, tab } = getConfig()
  const [{ timeZone }, res] = await Promise.all([
    getSheetMeta(),
    sheetsClient().spreadsheets.values.get({
      spreadsheetId,
      range: a1(tab, `A2:${LAST_COL}`),
      valueRenderOption: 'UNFORMATTED_VALUE',
      dateTimeRenderOption: 'SERIAL_NUMBER',
    }),
  ])
  const rows = (res.data.values || []) as RawRow[]
  const scores: ScoreRecord[] = []
  rows.forEach((raw, i) => {
    const parsed = parseRow(raw, i + 2, timeZone)
    if (parsed) scores.push(parsed)
  })
  return sortNewestFirst(scores)
}

/**
 * All scores, newest first (ties broken by sheet row, later row first).
 * Callers must not mutate the returned array; copy before sorting.
 */
export async function getScores(): Promise<readonly ScoreRecord[]> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.scores
  if (!inflight) {
    inflight = fetchAllScores()
      .then(scores => {
        cache = { at: Date.now(), scores }
        return scores
      })
      .finally(() => {
        inflight = null
      })
  }
  return inflight
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

function assertWritable() {
  if (process.env.SHEETS_DB_FIXTURE && process.env.NODE_ENV !== 'production') {
    throw new SheetsDbError('Fixture mode is read-only', 503)
  }
}

/** Values for columns I..Q (fruit log + features). null = leave cell untouched. */
function buildTail(
  levelFruits: Record<string, [FruitKey | null, FruitKey | null]> | null,
  featureCell: string | null
): (string | null)[] {
  const tail: (string | null)[] = Array(8).fill('')
  for (const [lvl, pair] of Object.entries(levelFruits || {})) {
    const col = FRUIT_LOG_COL[Number(lvl)]
    if (col === undefined) continue // no sheet columns for levels 12+
    tail[col - COL.I] = pair[0] ? fruitSheetName(pair[0]) : ''
    tail[col - COL.I + 1] = pair[1] ? fruitSheetName(pair[1]) : ''
  }
  tail.push(featureCell)
  return tail
}

function countsMapToTuples(
  levelFruits: Record<string | number, LevelFruitCounts> | undefined
): Record<string, [FruitKey | null, FruitKey | null]> | null {
  if (!levelFruits) return null
  const out: Record<string, [FruitKey | null, FruitKey | null]> = {}
  for (const [lvl, counts] of Object.entries(levelFruits)) out[String(lvl)] = countsToTuple(counts)
  return out
}

function customNotes(customFeature: string | undefined): string[] {
  return (customFeature || '').split(',').map(s => s.trim()).filter(Boolean)
}

export function validateScoreFields(input: Partial<ScoreInput>) {
  if (input.playerId !== undefined && !/^[A-Z]{1,5}$/i.test(input.playerId)) {
    throw new SheetsDbError('Invalid playerId', 400)
  }
  if (input.score !== undefined && (typeof input.score !== 'number' || input.score < 0 || !isFinite(input.score))) {
    throw new SheetsDbError('Score must be non-negative', 400)
  }
  if (input.level !== undefined && (!Number.isInteger(input.level) || input.level < 1 || input.level > 136)) {
    throw new SheetsDbError('Level must be between 1 and 136', 400)
  }
}

export async function appendScore(input: ScoreInput): Promise<ScoreRecord> {
  assertWritable()
  validateScoreFields(input)
  const { spreadsheetId, tab } = getConfig()
  const { timeZone } = await getSheetMeta()
  const sheets = sheetsClient()
  const now = new Date()

  const head = [
    formatSheetTimestamp(now, timeZone),
    input.playerId.toUpperCase(),
    levelToTermIt(input.level),
    Math.round(input.score),
  ]

  // Append only A:D so the sheet's table detection ignores formula columns E-H
  const appended = await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: a1(tab, 'A:D'),
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'OVERWRITE',
    requestBody: { values: [head] },
  })
  const updatedRange = appended.data.updates?.updatedRange || ''
  const rowMatch = updatedRange.match(/![A-Z]+(\d+)/)
  if (!rowMatch) throw new SheetsDbError(`Unexpected append result: ${updatedRange}`)
  const row = Number(rowMatch[1])

  const features = input.features || []
  const notes = customNotes(input.customFeature)
  const levelFruits = countsMapToTuples(input.levelFruits)
  const featureCell = buildFeatureCell(features, notes)
  const tail = buildTail(levelFruits, featureCell || null)

  if (tail.some(v => v)) {
    try {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: a1(tab, `I${row}:${WRITE_LAST_COL}${row}`),
        valueInputOption: 'RAW',
        requestBody: { values: [tail] },
      })
    } catch (err) {
      // The score itself is saved; don't report failure (a retry would duplicate the game)
      console.error('[sheets-db] Saved score but failed to write fruit log/features for row', row, err)
    }
  }

  invalidate()
  return {
    ...parseRow([...head, null, null, null, null, ...tail.map(v => v ?? '')], row, timeZone)!,
    // Sheets stores A as a date serial, so the fingerprint is only known after a re-read
    id: '',
    createdAt: now.toISOString(),
  }
}

/** Parse an id and re-read its row, refusing if the row no longer holds that game */
async function loadRowForWrite(id: string) {
  const m = id.match(/^(\d+)-([0-9a-f]{10})$/)
  if (!m || Number(m[1]) < 2) throw new SheetsDbError('Invalid score id', 400)
  const row = Number(m[1])
  const { spreadsheetId, tab } = getConfig()
  const [{ timeZone, sheetId }, res] = await Promise.all([
    getSheetMeta(),
    sheetsClient().spreadsheets.values.get({
      spreadsheetId,
      range: a1(tab, `A${row}:${LAST_COL}${row}`),
      valueRenderOption: 'UNFORMATTED_VALUE',
      dateTimeRenderOption: 'SERIAL_NUMBER',
    }),
  ])
  const raw = (res.data.values?.[0] || []) as RawRow
  if (fingerprint(raw) !== m[2]) {
    invalidate()
    throw new SheetsDbError('This score changed in the sheet since it was loaded. Refresh and try again.', 409)
  }
  const record = parseRow(raw, row, timeZone)
  if (!record) throw new SheetsDbError('Score not found', 404)
  return { row, record, raw, timeZone, sheetId, spreadsheetId, tab }
}

export async function updateScore(id: string, patch: Partial<ScoreInput>): Promise<ScoreRecord> {
  assertWritable()
  validateScoreFields(patch)
  const { row, record, raw, timeZone, spreadsheetId, tab } = await loadRowForWrite(id)

  const playerId = (patch.playerId ?? record.playerId).toUpperCase()
  const level = patch.level ?? record.level
  const score = patch.score ?? record.score
  const levelFruits =
    patch.levelFruits !== undefined ? countsMapToTuples(patch.levelFruits) : record.levelFruits
  const features = patch.features ?? record.features
  const notes = [...record.notes, ...customNotes(patch.customFeature).filter(n => !record.notes.includes(n))]

  // Drop fruit logs above the new level (matches the form's behaviour)
  const trimmedFruits = levelFruits
    ? Object.fromEntries(Object.entries(levelFruits).filter(([l]) => Number(l) <= level))
    : null

  const values: (string | number | null)[] = [
    null, // A: keep original timestamp
    playerId,
    levelToTermIt(level),
    score,
    null, null, null, null, // E-H: formulas, untouched
    ...buildTail(trimmedFruits, buildFeatureCell(features, notes)),
  ]

  // Keep TERM_IT text if the level didn't change (preserves historic fruit labels/typos)
  if (level === record.level) values[COL.C] = null

  await sheetsClient().spreadsheets.values.update({
    spreadsheetId,
    range: a1(tab, `A${row}:${WRITE_LAST_COL}${row}`),
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [values] },
  })
  invalidate()

  const next: RawRow = [...raw]
  values.forEach((v, i) => {
    if (v !== null) next[i] = v
  })
  return parseRow(next, row, timeZone)!
}

export async function deleteScore(id: string): Promise<void> {
  assertWritable()
  const { row, sheetId, spreadsheetId } = await loadRowForWrite(id)
  await sheetsClient().spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [{
        deleteDimension: {
          range: { sheetId, dimension: 'ROWS', startIndex: row - 1, endIndex: row },
        },
      }],
    },
  })
  invalidate()
}

/** Convenience for routes: map a thrown error to a status + message */
export function errorResponseInit(err: unknown, fallback: string): { status: number; message: string } {
  if (err instanceof SheetsDbError) return { status: err.status, message: err.status >= 500 ? fallback : err.message }
  return { status: 500, message: fallback }
}
