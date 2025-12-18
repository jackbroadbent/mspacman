// Fruit definitions
export const FRUITS = {
  cherry: { emoji: '🍒', name: 'Cherry', points: 100 },
  strawberry: { emoji: '🍓', name: 'Strawberry', points: 200 },
  peach: { emoji: '🍑', name: 'Peach', points: 500 },
  pretzel: { emoji: '🥨', name: 'Pretzel', points: 700 },
  apple: { emoji: '🍎', name: 'Apple', points: 1000 },
  pear: { emoji: '🍐', name: 'Pear', points: 2000 },
  banana: { emoji: '🍌', name: 'Banana', points: 5000 },
} as const

export type FruitKey = keyof typeof FRUITS

// Type for tracking fruits per level (levels 8+)
export type LevelFruits = Record<number, [FruitKey | null, FruitKey | null]>

// All fruits for the random picker (levels 8+)
export const ALL_FRUITS: FruitKey[] = ['cherry', 'strawberry', 'peach', 'pretzel', 'apple', 'pear', 'banana']

// Maze definitions
export const MAZES = {
  A: { color: '#FFB6C1', name: 'Pink' },
  B: { color: '#87CEEB', name: 'Light Blue' },
  C: { color: '#FFA500', name: 'Orange' },
  D: { color: '#4169E1', name: 'Dark Blue' },
} as const

export type MazeKey = keyof typeof MAZES

// Level data for levels 1-7 (fixed fruit)
export const FIXED_LEVELS: { level: number; maze: MazeKey; fruit: FruitKey }[] = [
  { level: 1, maze: 'A', fruit: 'cherry' },
  { level: 2, maze: 'A', fruit: 'strawberry' },
  { level: 3, maze: 'B', fruit: 'peach' },
  { level: 4, maze: 'B', fruit: 'pretzel' },
  { level: 5, maze: 'B', fruit: 'apple' },
  { level: 6, maze: 'C', fruit: 'pear' },
  { level: 7, maze: 'C', fruit: 'banana' },
]

// Helper to calculate maze from level
export function getMaze(level: number): MazeKey {
  if (level <= 2) return 'A'
  if (level <= 5) return 'B'
  if (level <= 9) return 'C'
  if (level <= 13) return 'D'
  // After 13, alternates C/D every 4 levels
  const cyclePosition = Math.floor((level - 14) / 4)
  return cyclePosition % 2 === 0 ? 'C' : 'D'
}

// Game features (custom achievements/notes)
export const GAME_FEATURES = [
  { id: 'creamdoms-reach', name: "Creamdom's Reach" },
  { id: 'offhand', name: 'Offhand' },
  { id: 'anomaly', name: 'Anomaly' },
  { id: 'the-standard', name: 'The Standard' },
  { id: 'templins', name: 'Templins' },
  { id: 'footsmans', name: 'Footsmans' },
] as const

// Hardcoded players for static UI (will be replaced with Supabase data)
export const MOCK_PLAYERS = [
  { id: '1', name: 'JMB', isActive: true },
  { id: '2', name: 'HSG', isActive: true },
  { id: '3', name: 'SMB', isActive: true },
  { id: '4', name: 'ACM', isActive: true },
  { id: '5', name: 'CBC', isActive: true },
  { id: '6', name: 'DTG', isActive: true },
  { id: '7', name: 'RTA', isActive: true },
  { id: '8', name: 'MLK', isActive: true },
  { id: '9', name: 'SRG', isActive: false },
  { id: '10', name: 'NVB', isActive: false },
  { id: '11', name: 'LEZ', isActive: false },
  { id: '12', name: 'DPC', isActive: false },
  { id: '13', name: 'BSA', isActive: false },
  { id: '14', name: 'LD', isActive: false },
]

// Tier thresholds for level selector
export const LEVEL_TIERS = {
  TIER_1_MAX: 7,    // Levels 1-7 (fixed fruit)
  TIER_2_MAX: 20,   // Levels 8-20 (expanded)
  MAX_LEVEL: 136,   // Theoretical max
} as const
