export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getRankTier, RANK_THRESHOLDS, type RankTier } from '@/types'
import { Swords, Trophy, Users, Gamepad2, Target } from 'lucide-react'
import Link from 'next/link'
import { TierBanner } from '@/components/dashboard/TierBanner'

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
      <TierBanner
        tier={tier}
        username={profile.username}
        eloRating={profile.elo_rating}
        coins={(profile as any).coins}
        progress={progress}
      />

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
            <p className="font-black text-white text-base">Battle ⚔️</p>
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
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${isTie ? 'bg-yellow-400/30 text-yellow-600 dark:text-yellow-300' : isWinner ? 'bg-green-400/30 text-green-700 dark:text-green-300' : 'bg-red-400/30 text-red-700 dark:text-red-300'}`}>
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
