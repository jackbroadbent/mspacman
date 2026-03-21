'use client'

interface ChartSkeletonProps {
  height?: number
}

export function ChartSkeleton({ height = 200 }: ChartSkeletonProps) {
  return <div className="chart-skeleton" style={{ height: `${height}px` }} />
}
