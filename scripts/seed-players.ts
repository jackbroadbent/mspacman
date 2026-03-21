import { createClient } from '@supabase/supabase-js'

/**
 * One-time script to seed players into Supabase
 * Run with: npx tsx scripts/seed-players.ts
 *
 * Prerequisites:
 * - Create the players table in Supabase first (see plan for SQL)
 * - Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

const MOCK_PLAYERS = [
  // Active players
  { name: 'JMB', is_active: true },
  { name: 'HSG', is_active: true },
  { name: 'SMB', is_active: true },
  { name: 'ACM', is_active: true },
  { name: 'CBC', is_active: true },
  { name: 'DTG', is_active: true },
  { name: 'RTA', is_active: true },
  { name: 'MLK', is_active: true },
  // Inactive players (original)
  { name: 'SRG', is_active: false },
  { name: 'NVB', is_active: false },
  { name: 'LEZ', is_active: false },
  { name: 'DPC', is_active: false },
  { name: 'BSA', is_active: false },
  { name: 'LD', is_active: false },
  // Additional players from historical CSV data
  { name: 'JCH', is_active: false },
  { name: 'ZRF', is_active: false },
  { name: 'KHM', is_active: false },
  { name: 'HBG', is_active: false },
  { name: 'IPD', is_active: false },
  { name: 'CBG', is_active: false },
  // Additional players found during migration
  { name: 'AMK', is_active: false },
  { name: 'BCW', is_active: false },
  { name: 'KBO', is_active: false },
  { name: 'LMB', is_active: false },
  { name: 'WBC', is_active: false },
  { name: 'MRC', is_active: false },
]

async function seedPlayers() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing environment variables:')
    console.error('  NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'set' : 'MISSING')
    console.error('  SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? 'set' : 'MISSING')
    console.error('\nMake sure .env.local is loaded or variables are exported')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  console.log('Seeding players to Supabase...')
  console.log('URL:', supabaseUrl)

  const { data, error } = await supabase
    .from('players')
    .upsert(MOCK_PLAYERS, { onConflict: 'name' })
    .select()

  if (error) {
    console.error('Error seeding players:', error)
    process.exit(1)
  }

  console.log(`\nSuccessfully seeded ${data.length} players:\n`)
  data.forEach(player => {
    console.log(`  ${player.is_active ? '✓' : '○'} ${player.name.padEnd(4)} ${player.id}`)
  })

  console.log('\n✅ Done! Copy a player ID above to use as LOGGED_IN_PLAYER_ID')
}

seedPlayers()
