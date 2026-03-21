'use client'

import { QuickStats } from './QuickStats'
import { Leaderboard } from './Leaderboard'
import { RollingAverageChart } from './RollingAverageChart'

export function Dashboard() {
  return (
    <div className="dashboard">
      <QuickStats />
      <Leaderboard />
      <RollingAverageChart />
    </div>
  )
}
