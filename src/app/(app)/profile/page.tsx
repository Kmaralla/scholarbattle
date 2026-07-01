import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getRankTier } from '@/types'
import { LogOut } from 'lucide-react'
import { AvatarUpload } from '@/components/profile/AvatarUpload'
import { BADGES, BADGE_MAP, RARITY_STYLES } from '@/lib/badges'

const TIER_COLORS: Record<string, string> = {
  bronze:   'from-orange-700 to-amber-600',
  silver:   'from-slate-400 to-slate-300',
  gold:     'from-yellow-500 to-amber-400',
  platinum: 'from-cyan-500 to-teal-400',
  diamond:  'from-violet-500 to-fuchsia-400',
}

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('users').select('*').eq('id', user.id).single()
  if (!profile) redirect('/onboarding')

  const tier = getRankTier(profile.elo_rating)
  const winRate = profile.total_battles > 0
    ? Math.round((profile.total_wins / profile.total_battles) * 100)
    : 0

  return (
    <div className="max-w-lg mx-auto p-4 space-y-4 pb-24">
      <h1 className="text-xl font-black text-dark">👤 Profile</h1>

      {/* Profile card */}
      <div className="bg-white rounded-3xl p-6 flex flex-col items-center gap-4 shadow-sm">
        <AvatarUpload
          userId={user.id}
          username={profile.username}
          currentUrl={(profile as any).avatar_url ?? null}
        />
        <div className="text-center">
          <h2 className="text-2xl font-black text-dark">{profile.username}</h2>
          <p className="text-sm text-gray-400 mt-0.5">{user.email}</p>
          <div className={`mt-3 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r ${TIER_COLORS[tier]} text-white font-bold text-sm shadow-lg`}>
            <span>{tier === 'diamond' ? '👑' : tier === 'platinum' ? '💎' : tier === 'gold' ? '🥇' : tier === 'silver' ? '🥈' : '🥉'}</span>
            <span className="capitalize">{tier}</span>
            <span className="text-white/70">· {profile.elo_rating} ELO</span>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Battles', value: profile.total_battles, emoji: '⚔️', bg: 'from-indigo-600 to-blue-500' },
          { label: 'Wins',    value: profile.total_wins,    emoji: '🏆', bg: 'from-yellow-500 to-orange-400' },
          { label: 'Win Rate',value: `${winRate}%`,         emoji: '⚡', bg: 'from-green-500 to-emerald-400' },
        ].map(({ label, value, emoji, bg }) => (
          <div key={label} className={`rounded-2xl p-4 text-center bg-gradient-to-br ${bg} shadow-lg`}>
            <div className="text-2xl mb-1">{emoji}</div>
            <p className="text-xl font-black text-white">{value}</p>
            <p className="text-white/70 text-xs font-medium">{label}</p>
          </div>
        ))}
      </div>

      {/* Info grid */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'ELO Rating',    value: profile.elo_rating },
          { label: 'Rank',          value: tier.charAt(0).toUpperCase() + tier.slice(1) },
          { label: 'Total Battles', value: profile.total_battles },
          { label: 'Total Wins',    value: profile.total_wins },
          { label: 'Win Rate',      value: `${winRate}%` },
          { label: 'Grade Level',   value: `Grade ${profile.grade_level}` },
          { label: 'Coins',         value: `🪙 ${(profile as any).coins ?? 0}` },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white rounded-2xl p-4 shadow-sm">
            <p className="text-lg font-black text-dark">{value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Badges */}
      <div className="space-y-3">
        <h2 className="font-black text-white text-base flex items-center gap-2">🎖️ Badges <span className="text-white/40 font-normal text-sm">({((profile as any).badges ?? []).length}/{BADGES.length})</span></h2>
        <div className="grid grid-cols-3 gap-2">
          {BADGES.map(badge => {
            const earned = ((profile as any).badges ?? []).includes(badge.id)
            const s = RARITY_STYLES[badge.rarity]
            return (
              <div
                key={badge.id}
                className={`flex flex-col items-center text-center rounded-2xl border p-3 transition-all ${earned ? `${s.border} ${s.bg} ${s.glow ? `shadow-lg ${s.glow}` : ''}` : 'border-white/5 bg-white/3 opacity-30'}`}
              >
                <span className={`text-3xl ${!earned && 'grayscale'}`}>{badge.emoji}</span>
                <p className="font-black text-white text-xs leading-tight mt-1">{badge.name}</p>
                <p className="text-xs text-white/40 mt-0.5 leading-tight">{badge.description}</p>
                <span className={`text-xs font-bold capitalize mt-1 ${earned ? s.label : 'text-white/20'}`}>{badge.rarity}</span>
              </div>
            )
          })}
        </div>
      </div>

      <form action="/auth/signout" method="post">
        <button type="submit" className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-red-400/30 bg-red-900/20 text-red-400 text-sm font-bold hover:bg-red-900/40 transition">
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </form>
    </div>
  )
}
