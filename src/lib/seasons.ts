const TOP_REWARDS: Record<number, number> = { 1: 200, 2: 150, 3: 100 }
const OTHER_REWARD = 50
const REWARDED_RANKS = 10

export function getSeasonReward(rank: number): number {
  if (TOP_REWARDS[rank]) return TOP_REWARDS[rank]
  return rank <= REWARDED_RANKS ? OTHER_REWARD : 0
}

export function formatTimeRemaining(endsAt: string): string {
  const ms = new Date(endsAt).getTime() - Date.now()
  if (ms <= 0) return 'Ending soon'
  const days = Math.floor(ms / (1000 * 60 * 60 * 24))
  if (days >= 1) return `${days}d left`
  const hours = Math.floor(ms / (1000 * 60 * 60))
  if (hours >= 1) return `${hours}h left`
  const mins = Math.max(1, Math.floor(ms / (1000 * 60)))
  return `${mins}m left`
}
