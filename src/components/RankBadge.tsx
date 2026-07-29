import { RankTier, RANK_COLORS } from '@/types'
import { cn } from '@/lib/utils'

const RANK_EMOJI: Record<RankTier, string> = {
  bronze:  '🥉',
  silver:  '🥈',
  gold:    '🥇',
  platinum:'💎',
  diamond: '👑',
  legend:  '🌟',
}

export function RankBadge({ tier, elo, showElo = false, className }: {
  tier: RankTier
  elo?: number
  showElo?: boolean
  className?: string
}) {
  if (tier === 'legend') {
    return (
      <span className={cn('inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border-0 legend-rank-badge', className)}>
        <span className="animate-[spin_3s_linear_infinite]">{RANK_EMOJI.legend}</span>
        <span>Legend</span>
        {showElo && elo !== undefined && <span className="opacity-70">· {elo}</span>}
      </span>
    )
  }

  return (
    <span className={cn('inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border', RANK_COLORS[tier], className)}>
      <span>{RANK_EMOJI[tier]}</span>
      <span className="capitalize">{tier}</span>
      {showElo && elo !== undefined && <span className="opacity-70">· {elo}</span>}
    </span>
  )
}
