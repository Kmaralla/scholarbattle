export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getRankTier, RANK_THRESHOLDS, type RankTier } from '@/types'
import { Swords, Trophy, Zap, Users, Gamepad2, Target } from 'lucide-react'
import Link from 'next/link'

const TIER_CONFIG: Record<RankTier, { emoji: string; gradient: string; glow: string }> = {
  bronze:   { emoji: '🥉', gradient: 'from-orange-900/80 to-amber-800/60',   glow: '' },
  silver:   { emoji: '🥈', gradient: 'from-slate-700 to-slate-600',          glow: '' },
  gold:     { emoji: '🥇', gradient: 'from-yellow-900/80 to-amber-800/60',   glow: '' },
  platinum: { emoji: '💎', gradient: 'from-cyan-900/80 to-teal-800/60',      glow: '' },
  diamond:  { emoji: '👑', gradient: 'from-violet-900/80 to-indigo-800/60',  glow: '' },
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('users').select('*').eq('id', user.id).single()
  if (!profile) redirect('/onboarding')

  const tier = getRankTier(profile.elo_rating) as RankTier
  const [minElo, maxElo] = RANK_THRESHOLDS[tier]
  const progress = maxElo === 9999 ? 100 : Math.round(((profile.elo_rating - minElo) / (maxElo - minElo)) * 100)
  const winRate = profile.total_battles > 0 ? Math.round((profile.total_wins / profile.total_battles) * 100) : 0
  const tierCfg = TIER_CONFIG[tier]

  const { data: recentBattles } = await supabase
    .from('battles').select('*')
    .or(`challenger_id.eq.${user.id},opponent_id.eq.${user.id}`)
    .eq('status', 'completed')
    .not('completed_at', 'is', null)
    .or(`challenger_score.gt.0,opponent_score.gt.0`)
    .order('completed_at', { ascending: false })
    .limit(5)

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-5 pb-24 md:pb-6">

      {/* Hero banner */}
      <div className={`relative rounded-3xl p-6 bg-gradient-to-br ${tierCfg.gradient} border border-white/10 overflow-hidden`}>
        {/* decorative blobs */}
        <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
        <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-black/10 rounded-full blur-2xl" />

        <div className="relative flex items-start justify-between">
          <div>
            <p className="text-white/70 text-sm font-medium">Welcome back,</p>
            <h1 className="text-3xl font-black text-white tracking-tight">{profile.username} 👋</h1>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-2xl">{tierCfg.emoji}</span>
              <span className="text-white/90 font-bold capitalize text-sm bg-white/20 px-3 py-0.5 rounded-full">{tier}</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-4xl font-black text-white">{profile.elo_rating}</p>
            <p className="text-white/60 text-xs">ELO Rating</p>
            {(profile as any).coins !== undefined && (
              <p className="text-yellow-300 font-bold text-sm mt-1">🪙 {(profile as any).coins ?? 0}</p>
            )}
          </div>
        </div>

        {tier !== 'diamond' && (
          <div className="relative mt-5">
            <div className="flex justify-between text-white/70 text-xs mb-1.5">
              <span className="font-semibold capitalize">{tier}</span>
              <span>{progress}% to next rank</span>
            </div>
            <div className="h-3 bg-black/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-white/80 rounded-full transition-all duration-700"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Battles', value: profile.total_battles, icon: '⚔️', bg: 'bg-white/5 border border-white/10' },
          { label: 'Wins',    value: profile.total_wins,    icon: '🏆', bg: 'bg-white/5 border border-white/10' },
          { label: 'Win Rate', value: `${winRate}%`,        icon: '⚡', bg: 'bg-white/5 border border-white/10' },
        ].map(({ label, value, icon, bg }) => (
          <div key={label} className={`rounded-2xl p-4 text-center ${bg}`}>
            <div className="text-2xl mb-1">{icon}</div>
            <p className="text-2xl font-black text-white">{value}</p>
            <p className="text-white/70 text-xs font-medium">{label}</p>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="space-y-3">
        <Link href="/matchmaking" className="btn-pop flex items-center gap-4 p-5 rounded-3xl bg-indigo-500/20 border border-indigo-400/20 hover:bg-indigo-500/30 transition-all hover:scale-[1.02]">
          <div className="w-12 h-12 bg-indigo-400/20 rounded-2xl flex items-center justify-center flex-shrink-0">
            <Swords className="w-6 h-6 text-indigo-300" />
          </div>
          <div className="flex-1">
            <p className="font-black text-white text-base">Battle Online ⚔️</p>
            <p className="text-white/40 text-xs">Ranked · Match with a real player now</p>
          </div>
          <span className="text-white/30 text-xl">→</span>
        </Link>

        <div className="grid grid-cols-2 gap-3">
          <Link href="/battle" className="btn-pop flex flex-col gap-2 p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:scale-[1.02] transition-all">
            <span className="text-3xl float">🎓</span>
            <p className="font-black text-white">Practice</p>
            <p className="text-white/40 text-xs">vs Scholar Bot</p>
          </Link>
          <Link href="/friends" className="btn-pop flex flex-col gap-2 p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:scale-[1.02] transition-all">
            <Users className="w-8 h-8 text-white/70" />
            <p className="font-black text-white">Challenge</p>
            <p className="text-white/40 text-xs">Battle a friend</p>
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Link href="/games" className="btn-pop flex flex-col gap-2 p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:scale-[1.02] transition-all">
            <Gamepad2 className="w-8 h-8 text-white/70" />
            <p className="font-black text-white">Games 🎮</p>
            <p className="text-white/40 text-xs">Spend your coins</p>
          </Link>
          <Link href="/leaderboard" className="btn-pop flex flex-col gap-2 p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:scale-[1.02] transition-all">
            <Trophy className="w-8 h-8 text-white/70" />
            <p className="font-black text-white">Rankings</p>
            <p className="text-white/40 text-xs">See top scholars</p>
          </Link>
        </div>
      </div>

      {/* Recent battles */}
      {recentBattles && recentBattles.length > 0 && (
        <div className="rounded-3xl bg-white/5 border border-white/10 p-4">
          <h2 className="font-black text-white text-base mb-3 flex items-center gap-2">
            <Target className="w-4 h-4 text-violet-400" /> Recent Battles
          </h2>
          <div className="space-y-2">
            {recentBattles.map((battle: any) => {
              const myScore = battle.challenger_id === user.id ? battle.challenger_score : battle.opponent_score
              const theirScore = battle.challenger_id === user.id ? battle.opponent_score : battle.challenger_score
              const isTie = myScore === theirScore
              const isWinner = myScore > theirScore
              return (
                <div key={battle.id} className="flex items-center justify-between py-2.5 px-3 rounded-2xl bg-white/5 hover:bg-white/10 transition">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{isTie ? '🤝' : isWinner ? '🏆' : '😤'}</span>
                    <div>
                      <span className="text-sm font-bold text-white capitalize">{battle.subject}</span>
                      <span className="text-xs text-white/40 ml-2">Gr.{battle.grade_level}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-white/80">{myScore}–{theirScore}</span>
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${isTie ? 'bg-yellow-400/20 text-yellow-300' : isWinner ? 'bg-green-400/20 text-green-300' : 'bg-red-400/20 text-red-300'}`}>
                      {isTie ? 'TIE' : isWinner ? 'WIN' : 'LOSS'}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
