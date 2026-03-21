import { google } from 'googleapis'
import { FruitKey, getMaze, FRUITS, MOCK_PLAYERS } from './constants'

// Environment variables
const GOOGLE_SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n')
const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID
const GOOGLE_SHEET_TAB = process.env.GOOGLE_SHEET_TAB || 'Sheet1'

// Maze letter to number mapping for TERM_IT format
const MAZE_TO_NUMBER: Record<string, number> = { A: 1, B: 2, C: 3, D: 4 }

// Level ranges for each maze (first occurrence only, levels 1-13)
const MAZE_LEVEL_STARTS: Record<string, number> = { A: 1, B: 3, C: 6, D: 10 }

/**
 * Convert a game level to TERM_IT format (e.g., "1.3.2 - Banana")
 * Format: 1.{mazeNumber}.{levelWithinMaze} - {FruitName}
 */
export function levelToTermIt(level: number, fruit: FruitKey): string {
  const maze = getMaze(level)
  const mazeNumber = MAZE_TO_NUMBER[maze]

  // Calculate level within the current maze sequence
  let levelInMaze: number

  if (level <= 13) {
    // First occurrence of each maze
    levelInMaze = level - MAZE_LEVEL_STARTS[maze] + 1
  } else {
    // After level 13, mazes C and D alternate every 4 levels
    const cycleStart = 14 + Math.floor((level - 14) / 4) * 4
    levelInMaze = level - cycleStart + 1
  }

  // Convert Peach -> Orange for Google Sheets
  const fruitName = FRUITS[fruit].name === 'Peach' ? 'Orange' : FRUITS[fruit].name
  return `1.${mazeNumber}.${levelInMaze} - ${fruitName}`
}

/**
 * Get the column index for a fruit gobble log entry
 * Returns null if level doesn't have fruit gobble columns (levels 1-7 or 12+)
 */
function getFruitGobbleColumnIndex(level: number, partIndex: 0 | 1): number | null {
  // Fruit gobble columns only exist for levels 8-11
  // Columns I-P (indices 8-15):
  // I,J = Level 8 (1.3.3), K,L = Level 9 (1.3.4), M,N = Level 10 (1.4.1), O,P = Level 11 (1.4.2)
  const columnMap: Record<number, number> = {
    8: 8,   // Column I
    9: 10,  // Column K
    10: 12, // Column M
    11: 14, // Column O
  }

  const baseColumn = columnMap[level]
  if (baseColumn === undefined) return null

  return baseColumn + partIndex
}

/**
 * Get player initials from player ID
 */
function getPlayerInitials(playerId: string): string {
  const player = MOCK_PLAYERS.find(p => p.id === playerId)
  return player?.name || 'UNK'
}

/**
 * Format score with commas (e.g., 80720 -> "80,720")
 */
function formatScore(score: number): string {
  return score.toLocaleString('en-US')
}

/**
 * Format timestamp for Google Sheets
 */
function formatTimestamp(): string {
  return new Date().toISOString().replace('T', ' ').replace('Z', '')
}

/**
 * Convert fruit name for Google Sheets (Peach -> Orange)
 */
function fruitNameForSheet(fruitKey: FruitKey): string {
  const name = FRUITS[fruitKey].name
  return name === 'Peach' ? 'Orange' : name
}

// Counts format from frontend: { cherry: 1, banana: 1 }
type LevelFruitCounts = Partial<Record<FruitKey, 0 | 1 | 2>>

interface ScoreData {
  playerId: string
  score: number
  level: number
  levelFruits?: Record<string, LevelFruitCounts>
}

/**
 * Convert fruit counts { cherry: 1, banana: 1 } to tuple ["cherry", "banana"]
 */
function countsToTuple(counts: LevelFruitCounts | undefined): [FruitKey | null, FruitKey | null] {
  if (!counts) return [null, null]

  const result: FruitKey[] = []
  for (const [fruit, count] of Object.entries(counts)) {
    if (count && count > 0) {
      for (let i = 0; i < count; i++) {
        result.push(fruit as FruitKey)
      }
    }
  }

  return [result[0] || null, result[1] || null]
}

/**
 * Append a score row to Google Sheets
 * Non-blocking - errors are logged but don't throw
 */
export async function appendScoreToSheet(data: ScoreData): Promise<boolean> {
  console.log('[GSheets] appendScoreToSheet called:', {
    playerId: data.playerId,
    score: data.score,
    level: data.level,
    hasLevelFruits: !!data.levelFruits,
  })

  console.log('[GSheets] Env check:', {
    hasEmail: !!GOOGLE_SERVICE_ACCOUNT_EMAIL,
    hasKey: !!GOOGLE_PRIVATE_KEY,
    hasSheetId: !!GOOGLE_SHEET_ID,
    sheetTab: GOOGLE_SHEET_TAB,
  })

  // Check for required env vars
  if (!GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_PRIVATE_KEY || !GOOGLE_SHEET_ID) {
    console.warn('[GSheets] Credentials not configured, skipping sheet update')
    return false
  }

  try {
    // Create auth client
    console.log('[GSheets] Creating JWT auth...')
    const auth = new google.auth.JWT({
      email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: GOOGLE_PRIVATE_KEY,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    })
    console.log('[GSheets] JWT auth created successfully')

    const sheets = google.sheets({ version: 'v4', auth })

    // Determine the fruit for TERM_IT
    // For levels 1-7, use fixed fruit mapping
    // For levels 8+, use the last fruit from levelFruits if available
    let fruit: FruitKey = 'cherry' // default
    if (data.level <= 7) {
      const fixedFruits: FruitKey[] = ['cherry', 'strawberry', 'peach', 'pretzel', 'apple', 'pear', 'banana']
      fruit = fixedFruits[data.level - 1]
    } else if (data.levelFruits) {
      // Get the fruit from the highest level in levelFruits
      const levelKeys = Object.keys(data.levelFruits).map(Number).sort((a, b) => b - a)
      for (const lvl of levelKeys) {
        const fruitCounts = data.levelFruits[String(lvl)]
        if (fruitCounts) {
          // Convert counts to tuple and use the last non-null fruit
          const fruits = countsToTuple(fruitCounts)
          if (fruits[1]) {
            fruit = fruits[1]
            break
          } else if (fruits[0]) {
            fruit = fruits[0]
            break
          }
        }
      }
    }

    // Build the row data
    // Columns: A=Timestamp, B=P_ID, C=TERM_IT, D=FINAL_SCORE, E-H=ignored, I-P=Fruit Gobble
    const row: (string | null)[] = [
      formatTimestamp(),                    // A: Timestamp
      getPlayerInitials(data.playerId),     // B: P_ID
      levelToTermIt(data.level, fruit),     // C: TERM_IT
      formatScore(data.score),              // D: FINAL_SCORE
      null, null, null, null,               // E-H: ignored columns
    ]

    // Add fruit gobble columns (I-P, indices 8-15)
    // Initialize with nulls for all 8 fruit gobble columns
    for (let i = 0; i < 8; i++) {
      row.push(null)
    }

    // Populate fruit gobble columns for levels 8-11
    if (data.levelFruits) {
      for (const [levelStr, fruitCounts] of Object.entries(data.levelFruits)) {
        const level = parseInt(levelStr)
        if (level >= 8 && level <= 11 && fruitCounts) {
          // Convert counts format to tuple format
          const fruits = countsToTuple(fruitCounts)
          const col0 = getFruitGobbleColumnIndex(level, 0)
          const col1 = getFruitGobbleColumnIndex(level, 1)

          if (col0 !== null && fruits[0]) {
            row[col0] = fruitNameForSheet(fruits[0])
          }
          if (col1 !== null && fruits[1]) {
            row[col1] = fruitNameForSheet(fruits[1])
          }
        }
      }
    }

    // Log row data
    console.log('[GSheets] Row data:', {
      timestamp: row[0],
      player: row[1],
      termIt: row[2],
      score: row[3],
      fruitGobbleCount: row.slice(8).filter(v => v !== null).length,
    })

    // Append row to sheet
    console.log('[GSheets] Appending to sheet:', {
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${GOOGLE_SHEET_TAB}!A:P`,
    })

    const result = await sheets.spreadsheets.values.append({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${GOOGLE_SHEET_TAB}!A:P`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: [row.map(v => v ?? '')],
      },
    })

    console.log('[GSheets] Success:', {
      updatedRange: result.data.updates?.updatedRange,
      updatedRows: result.data.updates?.updatedRows,
    })
    return true
  } catch (error) {
    const errorDetails = {
      message: error instanceof Error ? error.message : String(error),
      code: (error as any)?.code,
      status: (error as any)?.response?.status,
      statusText: (error as any)?.response?.statusText,
      errors: (error as any)?.errors,
    }
    console.error('[GSheets] Failed to append score:', errorDetails)
    return false
  }
}
