'use client'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { BADGES, RARITY_STYLES, PRESTIGE_STYLES, PrestigeLevel, PrestigeMap, getPrestigeLevel } from '@/lib/badges'
import { BadgePrestigeModal } from './BadgePrestigeModal'
import type { Badge } from '@/lib/badges'

export function BadgesSection({
  earnedBadges,
  prestigeMap,
  userId,
}: {
  earnedBadges: string[]
  prestigeMap: PrestigeMap
  userId: string
}) {
  const [selected, setSelected] = useState<Badge | null>(null)
  const [localPrestige, setLocalPrestige] = useState<PrestigeMap>(prestigeMap)

  function handleUpgraded(badgeId: string, newLevel: PrestigeLevel) {
    setLocalPrestige(prev => ({ ...prev, [badgeId]: newLevel }))
    setSelected(null)
  }

  return (
    <>
      <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
        <h2 className="font-black text-white text-sm flex items-center gap-2 mb-3">
          🎖️ Badges
          <span className="text-white/30 font-normal text-xs">{earnedBadges.length}/{BADGES.length} earned</span>
          <span className="ml-auto text-white/20 font-normal text-[10px]">Tap to prestige</span>
        </h2>
        <div className="grid grid-cols-4 gap-1.5">
          {BADGES.map(badge => {
            const earned = earnedBadges.includes(badge.id)
            const prestige = getPrestigeLevel(badge.id, localPrestige)
            const s = RARITY_STYLES[badge.rarity]
            const p = PRESTIGE_STYLES[prestige]
            return (
              <button
                key={badge.id}
                title={`${badge.name} — ${badge.description}${earned ? '\nTap to view prestige challenge' : ''}`}
                onClick={() => setSelected(badge)}
                className={cn(
                  'flex flex-col items-center text-center rounded-xl border p-2 transition-all',
                  earned
                    ? `${s.border} ${s.bg} ${p.ring} ${(s.glow || p.glow) ? `shadow-sm ${s.glow} ${p.glow}` : ''} hover:brightness-110 active:scale-95`
                    : 'border-white/5 bg-white/3 opacity-25 cursor-default'
                )}
              >
                <span className={cn('text-2xl', !earned && 'grayscale')}>{badge.emoji}</span>
                <p className="font-bold text-white text-[9px] leading-tight mt-0.5 line-clamp-2">{badge.name}</p>
                {earned && prestige > 0 && (
                  <span className="text-[9px] mt-0.5">{p.emoji}</span>
                )}
              </button>
            )
          })}
        </div>
        <p className="text-[10px] text-white/25 text-center mt-2">Tap an earned badge to attempt a prestige challenge</p>
      </div>

      {selected && (
        <BadgePrestigeModal
          badge={selected}
          earned={earnedBadges.includes(selected.id)}
          currentPrestige={getPrestigeLevel(selected.id, localPrestige)}
          userId={userId}
          onClose={() => setSelected(null)}
          onUpgraded={handleUpgraded}
        />
      )}
    </>
  )
}
