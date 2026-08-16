import { cn } from '@/lib/utils'
import { BADGES, RARITY_STYLES } from '@/lib/badges'

export function BadgesSection({ earnedBadges }: { earnedBadges: string[] }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
      <h2 className="font-black text-white text-sm flex items-center gap-2 mb-3">
        🎖️ Badges
        <span className="text-white/30 font-normal text-xs">{earnedBadges.length}/{BADGES.length} earned</span>
      </h2>
      <div className="grid grid-cols-4 gap-1.5">
        {BADGES.map(badge => {
          const earned = earnedBadges.includes(badge.id)
          const s = RARITY_STYLES[badge.rarity]
          return (
            <div
              key={badge.id}
              title={`${badge.name} — ${badge.description}`}
              className={cn(
                'flex flex-col items-center text-center rounded-xl border p-2 transition-all',
                earned
                  ? `${s.border} ${s.bg} ${s.glow && `shadow-sm ${s.glow}`}`
                  : 'border-white/5 bg-white/3 opacity-25'
              )}
            >
              <span className={cn('text-2xl', !earned && 'grayscale')}>{badge.emoji}</span>
              <p className="font-bold text-white text-[9px] leading-tight mt-0.5 line-clamp-2">{badge.name}</p>
            </div>
          )
        })}
      </div>

      <p className="text-[10px] text-white/25 text-center mt-2">
        {earnedBadges.length >= BADGES.length
          ? '🏆 All badges collected!'
          : `${BADGES.length - earnedBadges.length} badges remaining.`}
      </p>
    </div>
  )
}
