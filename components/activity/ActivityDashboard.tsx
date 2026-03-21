'use client'

import { ActivityStats } from './ActivityStats'
import { ActivityFeed } from './ActivityFeed'
import { ActivityHeatmap } from './ActivityHeatmap'

export function ActivityDashboard() {
  return (
    <div className="dashboard">
      <h2 className="page-title">Activity</h2>
      <ActivityStats />
      <ActivityFeed />
      <ActivityHeatmap />
    </div>
  )
}
