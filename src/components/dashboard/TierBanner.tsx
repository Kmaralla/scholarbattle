'use client'
import { useTheme } from '@/components/ThemeProvider'
import type { RankTier } from '@/types'

type TierStyle = { gradient: string; shadow: string; text: string; muted: string; badge: string; bar: string }
type TierEntry = { emoji: string; dark: TierStyle; light: TierStyle }

const TIER_CONFIG: Record<RankTier, TierEntry> = {
  bronze: {
    emoji: '🥉',
    dark:  { gradient: 'from-amber-800  to-orange-700',  shadow: 'shadow-amber-900/60',   text: 'text-amber-100',  muted: 'text-amber-200/70',  badge: 'bg-amber-900/40 text-amber-100',  bar: 'bg-white/40' },
    light: { gradient: 'from-amber-400  to-orange-300',  shadow: 'shadow-amber-400/40',   text: 'text-amber-950',  muted: 'text-amber-800/70',  badge: 'bg-amber-800/20 text-amber-950',  bar: 'bg-black/30' },
  },
  silver: {
    emoji: '🥈',
    dark:  { gradient: 'from-slate-600  to-slate-500',   shadow: 'shadow-slate-700/60',   text: 'text-slate-100',  muted: 'text-slate-200/70',  badge: 'bg-slate-800/40 text-slate-100',  bar: 'bg-white/40' },
    light: { gradient: 'from-slate-300  to-slate-200',   shadow: 'shadow-slate-300/40',   text: 'text-slate-800',  muted: 'text-slate-600',     badge: 'bg-slate-500/20 text-slate-800',  bar: 'bg-black/30' },
  },
  gold: {
    emoji: '🥇',
    dark:  { gradient: 'from-yellow-700 to-amber-600',   shadow: 'shadow-yellow-900/60',  text: 'text-yellow-100', muted: 'text-yellow-200/70', badge: 'bg-yellow-900/40 text-yellow-100', bar: 'bg-white/40' },
    light: { gradient: 'from-yellow-400 to-amber-300',   shadow: 'shadow-yellow-300/40',  text: 'text-yellow-950', muted: 'text-yellow-800/70', badge: 'bg-yellow-800/20 text-yellow-950', bar: 'bg-black/30' },
  },
  platinum: {
    emoji: '💎',
    dark:  { gradient: 'from-cyan-700   to-teal-600',    shadow: 'shadow-cyan-900/60',    text: 'text-cyan-100',   muted: 'text-cyan-200/70',   badge: 'bg-cyan-900/40 text-cyan-100',    bar: 'bg-white/40' },
    light: { gradient: 'from-cyan-300   to-teal-200',    shadow: 'shadow-cyan-300/40',    text: 'text-cyan-950',   muted: 'text-cyan-700',      badge: 'bg-cyan-700/20 text-cyan-950',    bar: 'bg-black/30' },
  },
  diamond: {
    emoji: '👑',
    dark:  { gradient: 'from-violet-700 to-indigo-600',  shadow: 'shadow-violet-900/60',  text: 'text-violet-100', muted: 'text-violet-200/70', badge: 'bg-violet-900/40 text-violet-100', bar: 'bg-white/40' },
    light: { gradient: 'from-violet-400 to-indigo-300',  shadow: 'shadow-violet-400/40',  text: 'text-violet-950', muted: 'text-violet-700',    badge: 'bg-violet-700/20 text-violet-950', bar: 'bg-black/30' },
  },
}

interface Props {
  tier: RankTier
  username: string
  eloRating: number
  coins?: number
  progress: number
}

export function TierBanner({ tier, username, eloRating, coins, progress }: Props) {
  const { theme } = useTheme()
  const entry = TIER_CONFIG[tier]
  const s = theme === 'light' ? entry.light : entry.dark

  return (
    <div className={`relative rounded-3xl p-6 bg-gradient-to-br ${s.gradient} border border-black/10 overflow-hidden shadow-xl ${s.shadow}`}>
      <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/20 rounded-full blur-2xl" />
      <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-black/10 rounded-full blur-2xl" />

      <div className="relative flex items-start justify-between">
        <div>
          <p className={`${s.muted} text-sm font-medium`}>Welcome back,</p>
          <h1 className={`text-3xl font-black ${s.text} tracking-tight`}>{username} 👋</h1>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-2xl">{entry.emoji}</span>
            <span className={`font-bold capitalize text-sm ${s.badge} px-3 py-0.5 rounded-full`}>{tier}</span>
          </div>
        </div>
        <div className="text-right">
          <p className={`text-4xl font-black ${s.text}`}>{eloRating}</p>
          <p className={`${s.muted} text-xs`}>ELO Rating</p>
          {coins !== undefined && (
            <p className={`${s.text} font-bold text-sm mt-1 opacity-80 flex items-center gap-1`}><img src="/coin.avif" alt="coin" width={16} height={16} className="inline-block object-contain" /> {coins}</p>
          )}
        </div>
      </div>

      {tier !== 'diamond' && (
        <div className="relative mt-5">
          <div className={`flex justify-between ${s.muted} text-xs mb-1.5`}>
            <span className="font-semibold capitalize">{tier}</span>
            <span>{progress}% to next rank</span>
          </div>
          <div className="h-3 bg-black/15 rounded-full overflow-hidden">
            <div className={`h-full ${s.bar} rounded-full transition-all duration-700`} style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}
    </div>
  )
}
