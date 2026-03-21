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
// Each fruit can appear 0, 1, or 2 times per level
export type LevelFruitCounts = Partial<Record<FruitKey, 0 | 1 | 2>>
export type LevelFruits = Record<number, LevelFruitCounts>

// Legacy type for backward compatibility
export type LevelFruitsLegacy = Record<number, [FruitKey | null, FruitKey | null]>

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

// Players with Supabase UUIDs (TODO: fetch from API instead of hardcoding)
export const MOCK_PLAYERS = [
  { id: '529dd0be-df3a-4135-a86d-dd8ede641eb8', name: 'JMB', isActive: true },
  { id: '03ab4e1a-9c19-4e1a-b5b8-887c977479e9', name: 'HSG', isActive: true },
  { id: 'd5d3e5b6-cadf-4459-ae2d-7940e9c2ad07', name: 'SMB', isActive: true },
  { id: 'b11b4e5c-4b90-437e-8b9b-bd612a1a48b0', name: 'ACM', isActive: true },
  { id: 'a88980e3-38c0-41f6-85cd-6d1eb56126f6', name: 'CBC', isActive: true },
  { id: '43776f37-0114-485a-b7fa-4316c1c1b6ab', name: 'DTG', isActive: true },
  { id: 'caffa5c0-d14d-4962-903c-e4de55eec21e', name: 'RTA', isActive: true },
  { id: '58eec6b2-5842-445a-9378-e9917a1d9f5e', name: 'MLK', isActive: true },
  { id: 'd05ec150-8cf8-490a-8f41-d68876d54a73', name: 'SRG', isActive: false },
  { id: '47da6ea5-6019-4eca-9664-99deb3b19c0e', name: 'NVB', isActive: false },
  { id: '948c734e-ba26-49c9-a50b-5d3ec639e1bc', name: 'LEZ', isActive: false },
  { id: '6bcaebce-b38f-4f6c-99cb-602a6fe4d5fd', name: 'DPC', isActive: false },
  { id: '234503d3-0160-4d6a-a5ad-71101633c33f', name: 'BSA', isActive: false },
  { id: '061bcb4c-d9f1-4df5-9ea2-b5348253355c', name: 'LD', isActive: false },
]

// Tier thresholds for level selector
export const LEVEL_TIERS = {
  TIER_1_MAX: 7,    // Levels 1-7 (fixed fruit)
  TIER_2_MAX: 20,   // Levels 8-20 (expanded)
  MAX_LEVEL: 136,   // Theoretical max
} as const
