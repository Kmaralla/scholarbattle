import { Badge, RARITY_STYLES } from '@/lib/badges'
import { cn } from '@/lib/utils'

export function BadgeCard({ badge, size = 'md' }: { badge: Badge; size?: 'sm' | 'md' | 'lg' }) {
  const s = RARITY_STYLES[badge.rarity]
  return (
    <div className={cn(
      'flex flex-col items-center text-center rounded-2xl border p-3 transition-all',
      s.border, s.bg, s.glow && `shadow-lg ${s.glow}`,
      size === 'sm' && 'p-2',
      size === 'lg' && 'p-4'
    )}>
      <span className={cn(size === 'sm' ? 'text-2xl' : size === 'lg' ? 'text-5xl' : 'text-3xl')}>{badge.emoji}</span>
      <p className={cn('font-black text-white leading-tight mt-1', size === 'sm' ? 'text-xs' : 'text-sm')}>{badge.name}</p>
      {size !== 'sm' && <p className="text-xs text-white/40 mt-0.5 leading-tight">{badge.description}</p>}
      <span className={cn('text-xs font-bold capitalize mt-1', s.label)}>{badge.rarity}</span>
    </div>
  )
}
