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

// Players, keyed by the initials used in the sheet's P_ID column
export const PLAYERS = [
  { id: 'JMB', name: 'JMB', isActive: true },
  { id: 'HSG', name: 'HSG', isActive: true },
  { id: 'SMB', name: 'SMB', isActive: true },
  { id: 'ACM', name: 'ACM', isActive: true },
  { id: 'CBC', name: 'CBC', isActive: true },
  { id: 'DTG', name: 'DTG', isActive: true },
  { id: 'RTA', name: 'RTA', isActive: true },
  { id: 'MLK', name: 'MLK', isActive: true },
  { id: 'SRG', name: 'SRG', isActive: false },
  { id: 'NVB', name: 'NVB', isActive: false },
  { id: 'LEZ', name: 'LEZ', isActive: false },
  { id: 'DPC', name: 'DPC', isActive: false },
  { id: 'BSA', name: 'BSA', isActive: false },
  { id: 'LD', name: 'LD', isActive: false },
  // Historical players from the sheet (shown under "more" in the log form)
  { id: 'JCH', name: 'JCH', isActive: false },
  { id: 'ZRF', name: 'ZRF', isActive: false },
  { id: 'KHM', name: 'KHM', isActive: false },
  { id: 'HBG', name: 'HBG', isActive: false },
  { id: 'IPD', name: 'IPD', isActive: false },
  { id: 'CBG', name: 'CBG', isActive: false },
  { id: 'AMK', name: 'AMK', isActive: false },
  { id: 'BCW', name: 'BCW', isActive: false },
  { id: 'KBO', name: 'KBO', isActive: false },
  { id: 'LMB', name: 'LMB', isActive: false },
  { id: 'WBC', name: 'WBC', isActive: false },
  { id: 'MRC', name: 'MRC', isActive: false },
]

// Tier thresholds for level selector
export const LEVEL_TIERS = {
  TIER_1_MAX: 7,    // Levels 1-7 (fixed fruit)
  TIER_2_MAX: 20,   // Levels 8-20 (expanded)
  MAX_LEVEL: 136,   // Theoretical max
} as const
