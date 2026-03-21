export interface AnalyticsSummary {
  highScore: {
    score: number
    playerName: string
    date: string
  }
  totalGames: number
}

export interface LeaderboardEntry {
  rank: number
  playerId: string
  playerName: string
  score: number
  level: number
  createdAt: string
}

export interface RecentScore {
  playerId: string
  playerName: string
  score: number
  level: number
  createdAt: string
  playerAverage: number
}

export interface ActivePlayerStats {
  playerId: string
  playerName: string
  gamesLast6Months: number
  bestScoreLast6Months: number
  avgScoreLast6Months: number
  overallAvgScore: number
  trend: 'up' | 'down' | 'same'
  lastPlayedAt: string
}

export interface RollingAverageDataPoint {
  gameNumber: number
  playerId: string
  playerName: string
  rollingAvg: number
}

export interface DistributionBucket {
  min: number
  max: number
  count: number
  playerId?: string
  playerName?: string
}

// Activity types
export interface ActivityStats {
  gamesThisMonth: number
  gamesLastMonth: number
  percentChange: number
  mostActiveDay: string
  mostActiveDayPlayers: { name: string; count: number }[]
}

export interface ActivityFeedEntry {
  playerId: string
  playerName: string
  score: number
  level: number
  createdAt: string
  playerAverage: number
}

export interface ActivityHeatmapMonth {
  year: number
  month: number
  count: number
}

export interface ActivityHeatmapDay {
  day: number
  count: number
}

// Player carousel types
export interface PlayerStats {
  playerId: string
  playerName: string
  rank: number
  highScore: number
  highScoreDate: string
  averageScore: number
  totalGames: number
  movingAverage50: number
  recentGames: {
    score: number
    level: number
    date: string
    deltaFromAvg: number
  }[]
  trendPercentage: number
  mostCommonDeathFruit: string
}

// Full page player view types
export interface PlayerFullStats extends PlayerStats {
  yearlyStats: {
    year: number
    gamesPlayed: number
    averageScore: number
    highScore: number
    highScoreDate: string
  }[]
  bestLevel: number
  avgLevelReached: number
  gamesThisMonth: number
  longestSession: {
    date: string
    gamesPlayed: number
  }
  longestHotStreak: {
    startDate: string
    endDate: string
    gamesCount: number
  }
  longestColdStreak: {
    startDate: string
    endDate: string
    gamesCount: number
  }
  allGames: {
    score: number
    level: number
    date: string
  }[]
}
