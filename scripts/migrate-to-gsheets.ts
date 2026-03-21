import { createClient } from '@supabase/supabase-js'
import { appendScoreToSheet } from '../lib/google-sheets'
import { FruitKey } from '../lib/constants'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

// Convert tuple format [fruit1, fruit2] to counts format { fruit1: 1, fruit2: 1 }
function tupleToCountsFormat(
  levelFruits: Record<string, [string | null, string | null]> | null
): Record<string, Partial<Record<FruitKey, 0 | 1 | 2>>> | undefined {
  if (!levelFruits) return undefined

  const result: Record<string, Partial<Record<FruitKey, 0 | 1 | 2>>> = {}

  for (const [level, tuple] of Object.entries(levelFruits)) {
    const counts: Partial<Record<FruitKey, 0 | 1 | 2>> = {}

    for (const fruit of tuple) {
      if (fruit) {
        const key = fruit as FruitKey
        counts[key] = ((counts[key] || 0) + 1) as 0 | 1 | 2
      }
    }

    if (Object.keys(counts).length > 0) {
      result[level] = counts
    }
  }

  return Object.keys(result).length > 0 ? result : undefined
}

async function migrate() {
  console.log('Fetching last 6 scores from Supabase...')

  const { data: scores, error } = await supabase
    .from('scores')
    .select('*, player:players!scores_player_id_fkey(id, name)')
    .order('created_at', { ascending: false })
    .limit(6)

  if (error) {
    console.error('Failed to fetch scores:', error)
    return
  }

  if (!scores || scores.length === 0) {
    console.log('No scores found')
    return
  }

  console.log(`Found ${scores.length} scores to migrate:\n`)

  // Process in chronological order (oldest first) for proper sheet ordering
  const sortedScores = [...scores].reverse()

  let successCount = 0
  for (const score of sortedScores) {
    const playerName = score.player?.name || 'UNK'
    console.log(`Migrating: ${playerName} - Level ${score.level} - Score ${score.score.toLocaleString()}`)

    const levelFruits = tupleToCountsFormat(score.level_fruits as Record<string, [string | null, string | null]> | null)

    const success = await appendScoreToSheet({
      playerId: score.player_id,
      score: score.score,
      level: score.level,
      levelFruits,
    })

    if (success) {
      successCount++
      console.log(`  ✓ Added to Google Sheets\n`)
    } else {
      console.log(`  ✗ Failed to add to Google Sheets\n`)
    }

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500))
  }

  console.log(`\nMigration complete: ${successCount}/${scores.length} scores added to Google Sheets`)
}

migrate().catch(console.error)
