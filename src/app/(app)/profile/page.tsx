import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getDisplayTier } from '@/types'
import { LogOut } from 'lucide-react'
import { AvatarPicker } from '@/components/profile/AvatarPicker'
import { ColorsSidePanel } from '@/components/profile/ColorsSidePanel'
import { BadgesSection } from '@/components/profile/BadgesSection'
import { ReportCardsButton } from '@/components/profile/ReportCardsButton'
import type { PrestigeMap } from '@/lib/badges'

const TIER_COLORS: Record<string, string> = {
  bronze:   'from-orange-900/70 to-amber-800/50',
  silver:   'from-slate-700 to-slate-600',
  gold:     'from-yellow-900/70 to-amber-800/50',
  platinum: 'from-cyan-900/70 to-teal-800/50',
  diamond:  'from-violet-900/70 to-indigo-800/50',
  legend:   'from-yellow-800/60 to-purple-900/60',
}

const TIER_EMOJI: Record<string, string> = {
  bronze: '🥉', silver: '🥈', gold: '🥇', platinum: '💎', diamond: '👑', legend: '🌟',
}

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('users').select('*').eq('id', user.id).single()
  if (!profile) redirect('/onboarding')

  const tier = getDisplayTier(profile.elo_rating, profile.rank_tier)
  const winRate = profile.total_battles > 0
    ? Math.round((profile.total_wins / profile.total_battles) * 100)
    : 0
  const earnedBadges: string[] = (profile as any).badges ?? []
  const prestigeMap: PrestigeMap = (profile as any).badge_prestige ?? {}

  return (
    <div className="max-w-lg mx-auto p-4 space-y-3 pb-24">
      <h1 className="text-xl font-black text-white">👤 Profile</h1>

      {/* Compact profile header */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-4">
        <AvatarPicker
          userId={user.id}
          username={profile.username}
          currentAvatar={(profile as any).avatar_url ?? null}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg font-black text-white truncate">{profile.username}</h2>
            <ReportCardsButton userId={user.id} />
          </div>
          <p className="text-xs text-white/40 truncate">{user.email}</p>
          <div className={`mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r ${TIER_COLORS[tier]} text-white font-bold text-xs`}>
            <span>{TIER_EMOJI[tier]}</span>
            <span className="capitalize">{tier}</span>
            <span className="text-white/60">· {profile.elo_rating} ELO</span>
          </div>
        </div>
        <form action="/auth/signout" method="post">
          <button type="submit" title="Sign out" className="p-2 rounded-xl border border-red-400/20 bg-red-900/10 text-red-400 hover:bg-red-900/30 transition">
            <LogOut className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: 'Battles', value: profile.total_battles, emoji: '⚔️' },
          { label: 'Wins',    value: profile.total_wins,    emoji: '🏆' },
          { label: 'Win Rate',value: `${winRate}%`,         emoji: '⚡' },
          { label: 'Coins',   value: (profile as any).coins ?? 0, emoji: '🪙' },
        ].map(({ label, value, emoji }) => (
          <div key={label} className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
            <div className="text-lg mb-0.5">{emoji}</div>
            <p className="text-base font-black text-white leading-none">{value}</p>
            <p className="text-white/40 text-[10px] font-medium mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'ELO Rating', value: profile.elo_rating },
          { label: 'Rank',       value: tier.charAt(0).toUpperCase() + tier.slice(1) },
          { label: 'Grade',      value: `Grade ${profile.grade_level}` },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white/5 border border-white/10 rounded-xl p-3">
            <p className="text-sm font-black text-white">{value}</p>
            <p className="text-[10px] text-white/40 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Interactive badges section with prestige support */}
      <BadgesSection
        earnedBadges={earnedBadges}
        prestigeMap={prestigeMap}
        userId={user.id}
      />

      <ColorsSidePanel />
    </div>
  )
}
