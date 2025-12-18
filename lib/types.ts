import { FruitKey, MazeKey } from './constants'

export interface Player {
  id: string
  name: string
  isActive: boolean
}

export interface ScoreEntry {
  playerId: string
  score: number
  level: number
  fruit?: FruitKey  // Required if level >= 8
  features: string[]
  loggedBy: string
  timestamp: Date
}

export interface LevelInfo {
  level: number
  maze: MazeKey
  fruit?: FruitKey  // Only set for levels 1-7
  isRandom: boolean
}
