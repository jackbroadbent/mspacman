import { createClient } from '@supabase/supabase-js'
import { parse } from 'csv-parse/sync'
import * as fs from 'fs'
import * as path from 'path'

/**
 * Migration script to import historical scores from CSV to Supabase
 * Run with: source .env.local && npx tsx scripts/migrate-scores.ts
 */

// Fruit name mapping from CSV to our system
const FRUIT_MAP: Record<string, string> = {
  'cherry': 'cherry',
  'strawberry': 'strawberry',
  'stawberry': 'strawberry', // typo in data
  'orange': 'peach', // different name in CSV
  'peach': 'peach',
  'pretzel': 'pretzel',
  'apple': 'apple',
  'pear': 'pear',
  'banana': 'banana',
}

// Known feature names
const FEATURE_NAMES = [
  'anomaly',
  "creamdom's reach",
  'offhand',
  'the standard',
  'templins',
  'footsmans',
]

// Feature ID mapping
const FEATURE_ID_MAP: Record<string, string> = {
  'anomaly': 'anomaly',
  "creamdom's reach": 'creamdoms-reach',
  'offhand': 'offhand',
  'the standard': 'the-standard',
  'templins': 'templins',
  'footsmans': 'footsmans',
}

/**
 * Convert TERM_IT notation to level number
 * Format: "1.X.Y - FruitName" where X=maze (1-4), Y=position in maze
 */
function termItToLevel(termIt: string): number {
  // Extract the version part (e.g., "1.3.2" from "1.3.2 - Banana")
  const match = termIt.match(/^1\.(\d+)\.(\d+)/)
  if (!match) {
    console.warn(`Could not parse TERM_IT: ${termIt}`)
    return 0
  }

  const maze = parseInt(match[1])
  const pos = parseInt(match[2])

  // Calculate actual level based on maze and position
  switch (maze) {
    case 1: return pos           // Maze A: levels 1-2
    case 2: return 2 + pos       // Maze B: levels 3-5
    case 3: return 5 + pos       // Maze C: levels 6-9
    case 4: return 9 + pos       // Maze D: levels 10-13
    default:
      console.warn(`Unknown maze number: ${maze} in ${termIt}`)
      return 0
  }
}

/**
 * Parse score string with commas (e.g., "80,720" -> 80720)
 */
function parseScore(scoreStr: string): number {
  return parseInt(scoreStr.replace(/,/g, '').replace(/"/g, '')) || 0
}

/**
 * Parse timestamp to ISO string
 */
function parseTimestamp(timestamp: string): string {
  // Format: "1/15/2011 0:00:00" or "2/9/2018 0:00:00"
  const date = new Date(timestamp)
  if (isNaN(date.getTime())) {
    console.warn(`Could not parse timestamp: ${timestamp}`)
    return new Date().toISOString()
  }
  return date.toISOString()
}

/**
 * Extract fruits and features from row data (columns 4+)
 */
function extractFruitsAndFeatures(row: string[], level: number): {
  levelFruits: Record<string, [string | null, string | null]> | null
  features: string[]
} {
  const features: string[] = []
  const fruits: string[] = []

  // Process columns 4+ for fruits and features
  for (let i = 4; i < row.length; i++) {
    const value = row[i]?.trim().toLowerCase()
    if (!value) continue

    // Check if it's a feature
    if (FEATURE_NAMES.includes(value)) {
      const featureId = FEATURE_ID_MAP[value]
      if (featureId && !features.includes(featureId)) {
        features.push(featureId)
      }
      continue
    }

    // Check if it's a fruit
    const fruitKey = FRUIT_MAP[value]
    if (fruitKey) {
      fruits.push(fruitKey)
    }
  }

  // Build levelFruits object for levels 8+
  let levelFruits: Record<string, [string | null, string | null]> | null = null

  if (level >= 8 && fruits.length > 0) {
    levelFruits = {}
    let fruitIndex = 0

    // For each level from 8 to the terminal level, assign 2 fruits
    for (let l = 8; l <= level; l++) {
      const fruit1 = fruits[fruitIndex] || null
      const fruit2 = fruits[fruitIndex + 1] || null

      // Only add if at least one fruit exists
      if (fruit1 !== null || fruit2 !== null) {
        levelFruits[l.toString()] = [fruit1, fruit2]
      }

      fruitIndex += 2
    }
  }

  return { levelFruits, features }
}

async function migrateScores() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing environment variables')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  // Read CSV file
  const csvPath = path.join(process.cwd(), 'Untitled spreadsheet - data_to_migrate.csv')
  if (!fs.existsSync(csvPath)) {
    console.error(`CSV file not found: ${csvPath}`)
    process.exit(1)
  }

  console.log('Reading CSV file...')
  const csvContent = fs.readFileSync(csvPath, 'utf-8')
  const records = parse(csvContent, {
    columns: false,
    skip_empty_lines: true,
    relax_quotes: true,
  })

  // Skip header row
  const dataRows = records.slice(1)
  console.log(`Found ${dataRows.length} records to migrate`)

  // Fetch all players to build name -> UUID map
  console.log('Fetching players from Supabase...')
  const { data: players, error: playersError } = await supabase
    .from('players')
    .select('id, name')

  if (playersError || !players) {
    console.error('Error fetching players:', playersError)
    process.exit(1)
  }

  const playerMap = new Map<string, string>()
  players.forEach(p => playerMap.set(p.name.toUpperCase(), p.id))
  console.log(`Loaded ${playerMap.size} players`)

  // Process and insert scores in batches
  const BATCH_SIZE = 100
  let successCount = 0
  let errorCount = 0
  let skippedCount = 0
  const errors: string[] = []

  for (let i = 0; i < dataRows.length; i += BATCH_SIZE) {
    const batch = dataRows.slice(i, i + BATCH_SIZE)
    const scoresToInsert: any[] = []

    for (const row of batch) {
      const timestamp = row[0]
      const playerId = row[1]?.toUpperCase()
      const termIt = row[2]
      const scoreStr = row[3]

      // Skip if missing required fields
      if (!timestamp || !playerId || !termIt || !scoreStr) {
        skippedCount++
        continue
      }

      // Lookup player UUID
      const playerUuid = playerMap.get(playerId)
      if (!playerUuid) {
        errors.push(`Unknown player: ${playerId}`)
        skippedCount++
        continue
      }

      // Parse fields
      const level = termItToLevel(termIt)
      if (level === 0) {
        skippedCount++
        continue
      }

      const score = parseScore(scoreStr)
      const createdAt = parseTimestamp(timestamp)
      const { levelFruits, features } = extractFruitsAndFeatures(row, level)

      scoresToInsert.push({
        player_id: playerUuid,
        score,
        level,
        level_fruits: levelFruits,
        features,
        logged_by: null, // Historical data - no logged_by
        created_at: createdAt,
      })
    }

    // Insert batch
    if (scoresToInsert.length > 0) {
      const { error } = await supabase
        .from('scores')
        .insert(scoresToInsert)

      if (error) {
        console.error(`Batch ${Math.floor(i / BATCH_SIZE) + 1} error:`, error.message)
        errorCount += scoresToInsert.length
      } else {
        successCount += scoresToInsert.length
      }
    }

    // Progress update
    const progress = Math.min(i + BATCH_SIZE, dataRows.length)
    process.stdout.write(`\rProcessed ${progress}/${dataRows.length} rows...`)
  }

  console.log('\n')
  console.log('Migration complete!')
  console.log(`  ✓ Inserted: ${successCount}`)
  console.log(`  ✗ Errors: ${errorCount}`)
  console.log(`  ⊘ Skipped: ${skippedCount}`)

  if (errors.length > 0) {
    console.log('\nFirst 10 errors:')
    errors.slice(0, 10).forEach(e => console.log(`  - ${e}`))
  }
}

migrateScores()
