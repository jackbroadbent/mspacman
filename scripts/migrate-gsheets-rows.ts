import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

// Player name to ID mapping (need to look up from DB)
const PLAYER_MAP: Record<string, string> = {}

// Maze number to start level
const MAZE_STARTS: Record<number, number> = {
  1: 1,  // Maze A
  2: 3,  // Maze B
  3: 6,  // Maze C
  4: 10, // Maze D
}

// Fruit name to key (Orange -> peach for reverse mapping)
const FRUIT_NAME_TO_KEY: Record<string, string> = {
  'Cherry': 'cherry',
  'Strawberry': 'strawberry',
  'Peach': 'peach',
  'Orange': 'peach',  // GSheets uses Orange for Peach
  'Pretzel': 'pretzel',
  'Apple': 'apple',
  'Pear': 'pear',
  'Banana': 'banana',
  'Mystery': 'banana', // Default for unknown
}

interface RawRow {
  timestamp: string
  playerId: string
  termIt: string
  score: number
  fruitGobble?: {
    level8?: [string | null, string | null]
    level9?: [string | null, string | null]
    level10?: [string | null, string | null]
    level11?: [string | null, string | null]
  }
}

// Parse TERM_IT format: "1.3.2 - Banana" -> { level: 7, fruit: 'banana' }
function parseTermIt(termIt: string): { level: number; fruit: string } {
  const match = termIt.match(/^1\.(\d+)\.(\d+)\s*-\s*(.+)$/)
  if (!match) throw new Error(`Invalid TERM_IT format: ${termIt}`)

  const mazeNum = parseInt(match[1])
  const posInMaze = parseInt(match[2])
  const fruitName = match[3].trim()

  const mazeStart = MAZE_STARTS[mazeNum]
  if (!mazeStart) throw new Error(`Invalid maze number: ${mazeNum}`)

  const level = mazeStart + posInMaze - 1
  const fruit = FRUIT_NAME_TO_KEY[fruitName] || 'cherry'

  return { level, fruit }
}

// Parse timestamp: "12/19/2025 20:49:28" -> ISO string
function parseTimestamp(ts: string): string {
  const [datePart, timePart] = ts.split(' ')
  const [month, day, year] = datePart.split('/')
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${timePart}.000Z`
}

// Raw data from Google Sheets
const rawRows: RawRow[] = [
  {
    timestamp: '12/19/2025 20:49:28',
    playerId: 'SMB',
    termIt: '1.3.3 - Mystery',
    score: 94620,
    fruitGobble: { level8: ['Pear', 'Pretzel'] }
  },
  {
    timestamp: '12/19/2025 21:07:38',
    playerId: 'SMB',
    termIt: '1.3.2 - Banana',
    score: 82700
  },
  {
    timestamp: '12/20/2025 0:06:40',
    playerId: 'SMB',
    termIt: '1.3.1 - Pear',
    score: 59330
  },
  {
    timestamp: '12/20/2025 0:17:57',
    playerId: 'SMB',
    termIt: '1.3.1 - Pear',
    score: 72070
  },
  {
    timestamp: '12/20/2025 21:17:36',
    playerId: 'JMB',
    termIt: '1.2.2 - Pretzel',
    score: 42630
  },
  {
    timestamp: '12/20/2025 21:18:08',
    playerId: 'JMB',
    termIt: '1.3.2 - Banana',
    score: 72990
  },
  {
    timestamp: '12/20/2025 21:18:40',
    playerId: 'JMB',
    termIt: '1.2.1 - Orange',
    score: 31230
  },
]

async function migrate() {
  console.log('Fetching players from Supabase...')

  // Get player IDs
  const { data: players, error: playersError } = await supabase
    .from('players')
    .select('id, name')

  if (playersError) {
    console.error('Failed to fetch players:', playersError)
    return
  }

  for (const player of players || []) {
    PLAYER_MAP[player.name] = player.id
  }

  console.log('Player map:', PLAYER_MAP)

  // Process each row
  const inserts = []
  for (const row of rawRows) {
    const playerUuid = PLAYER_MAP[row.playerId]
    if (!playerUuid) {
      console.error(`Unknown player: ${row.playerId}`)
      continue
    }

    const { level, fruit } = parseTermIt(row.termIt)
    const createdAt = parseTimestamp(row.timestamp)

    // Build level_fruits if we have fruit gobble data or level >= 8
    let levelFruits: Record<string, [string | null, string | null]> | null = null

    if (row.fruitGobble) {
      levelFruits = {}
      if (row.fruitGobble.level8) {
        levelFruits['8'] = [
          row.fruitGobble.level8[0] ? FRUIT_NAME_TO_KEY[row.fruitGobble.level8[0]] : null,
          row.fruitGobble.level8[1] ? FRUIT_NAME_TO_KEY[row.fruitGobble.level8[1]] : null,
        ]
      }
      if (row.fruitGobble.level9) {
        levelFruits['9'] = [
          row.fruitGobble.level9[0] ? FRUIT_NAME_TO_KEY[row.fruitGobble.level9[0]] : null,
          row.fruitGobble.level9[1] ? FRUIT_NAME_TO_KEY[row.fruitGobble.level9[1]] : null,
        ]
      }
      if (row.fruitGobble.level10) {
        levelFruits['10'] = [
          row.fruitGobble.level10[0] ? FRUIT_NAME_TO_KEY[row.fruitGobble.level10[0]] : null,
          row.fruitGobble.level10[1] ? FRUIT_NAME_TO_KEY[row.fruitGobble.level10[1]] : null,
        ]
      }
      if (row.fruitGobble.level11) {
        levelFruits['11'] = [
          row.fruitGobble.level11[0] ? FRUIT_NAME_TO_KEY[row.fruitGobble.level11[0]] : null,
          row.fruitGobble.level11[1] ? FRUIT_NAME_TO_KEY[row.fruitGobble.level11[1]] : null,
        ]
      }
    }

    const record = {
      player_id: playerUuid,
      score: row.score,
      level,
      level_fruits: levelFruits,
      features: [],
      logged_by: null,
      created_at: createdAt,
    }

    console.log(`Preparing: ${row.playerId} - Level ${level} (${fruit}) - ${row.score}`)
    inserts.push(record)
  }

  console.log(`\nInserting ${inserts.length} records...`)

  const { data, error } = await supabase
    .from('scores')
    .insert(inserts)
    .select()

  if (error) {
    console.error('Insert error:', error)
    return
  }

  console.log(`Successfully inserted ${data?.length} records!`)
  for (const record of data || []) {
    console.log(`  - ID: ${record.id}, Score: ${record.score}, Level: ${record.level}`)
  }
}

migrate().catch(console.error)
