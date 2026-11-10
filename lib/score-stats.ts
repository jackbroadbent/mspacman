import type { ScoreRecord } from './sheets-db'

/** Average score per player id, rounded */
export function playerAverages(scores: readonly ScoreRecord[]): Record<string, number> {
  const totals: Record<string, { sum: number; n: number }> = {}
  for (const s of scores) {
    const t = (totals[s.playerId] ??= { sum: 0, n: 0 })
    t.sum += s.score
    t.n++
  }
  return Object.fromEntries(
    Object.entries(totals).map(([id, t]) => [id, Math.round(t.sum / t.n)])
  )
}
