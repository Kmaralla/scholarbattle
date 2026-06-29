export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { RankBadge } from '@/components/RankBadge'
import { getRankTier, RANK_THRESHOLDS, type RankTier } from '@/types'
import { formatElo } from '@/lib/utils'
import { Swords, Trophy, Users, Zap } from 'lucide-react'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/onboarding')

  const tier = getRankTier(profile.elo_rating) as RankTier
  const [minElo, maxElo] = RANK_THRESHOLDS[tier]
  const progress = maxElo === 9999
    ? 100
    : Math.round(((profile.elo_rating - minElo) / (maxElo - minElo)) * 100)

  const { data: recentBattles } = await supabase
    .from('battles')
    .select('*')
    .or(`challenger_id.eq.${user.id},opponent_id.eq.${user.id}`)
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })
    .limit(5)

  const winRate = profile.total_battles > 0
    ? Math.round((profile.total_wins / profile.total_battles) * 100)
    : 0

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      {/* Hero card */}
      <Card className="bg-gradient-to-br from-indigo-600 to-purple-700 text-white border-0">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-indigo-200 text-sm">Welcome back,</p>
              <h1 className="text-2xl font-black">{profile.username} 👋</h1>
              <div className="mt-2">
                <RankBadge tier={tier} elo={profile.elo_rating} showElo className="bg-white/20 text-white border-white/30" />
              </div>
            </div>
            <div className="text-right">
              <p className="text-3xl font-black">{formatElo(profile.elo_rating)}</p>
              <p className="text-indigo-200 text-xs">ELO Rating</p>
            </div>
          </div>

          {/* Progress to next tier */}
          {tier !== 'diamond' && (
            <div className="mt-4">
              <div className="flex justify-between text-xs text-indigo-200 mb-1">
                <span className="capitalize">{tier}</span>
                <span>{progress}% to next rank</span>
              </div>
              <div className="h-2 bg-white/20 rounded-full">
                <div className="h-full bg-white rounded-full transition-all" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Battles', value: profile.total_battles, icon: Swords, color: 'text-indigo-600' },
          { label: 'Wins', value: profile.total_wins, icon: Trophy, color: 'text-yellow-500' },
          { label: 'Win Rate', value: `${winRate}%`, icon: Zap, color: 'text-green-500' },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="p-4 text-center">
              <Icon className={`w-5 h-5 mx-auto mb-1 ${color}`} />
              <p className="text-xl font-black text-gray-900">{value}</p>
              <p className="text-xs text-gray-500">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 gap-3">
        <Link href="/matchmaking" className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl p-4 flex items-center gap-3 hover:opacity-90 transition shadow-md">
          <Swords className="w-6 h-6 flex-shrink-0" />
          <div>
            <p className="font-bold text-sm">Battle Random Opponent</p>
            <p className="text-indigo-200 text-xs">Ranked · Match with someone online now</p>
          </div>
          <span className="ml-auto text-indigo-200 text-lg">→</span>
        </Link>
        <div className="grid grid-cols-2 gap-3">
          <Link href="/battle" className="bg-white border border-gray-100 shadow-sm rounded-2xl p-4 flex items-center gap-3 hover:bg-gray-50 transition">
            <span className="text-xl">🎓</span>
            <div>
              <p className="font-bold text-sm text-gray-900">Practice</p>
              <p className="text-gray-400 text-xs">vs Scholar Bot</p>
            </div>
          </Link>
          <Link href="/friends" className="bg-white border border-gray-100 shadow-sm rounded-2xl p-4 flex items-center gap-3 hover:bg-gray-50 transition">
            <Users className="w-5 h-5 text-indigo-600 flex-shrink-0" />
            <div>
              <p className="font-bold text-sm text-gray-900">Challenge Friend</p>
              <p className="text-gray-400 text-xs">Pick topic + grade</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Recent battles */}
      {recentBattles && recentBattles.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h2 className="font-bold text-gray-900 mb-3">Recent Battles</h2>
            <div className="space-y-2">
              {recentBattles.map((battle: any) => {
                const isTie = battle.winner_id === null
                const isWinner = battle.winner_id === user.id
                const myScore = battle.challenger_id === user.id ? battle.challenger_score : battle.opponent_score
                const theirScore = battle.challenger_id === user.id ? battle.opponent_score : battle.challenger_score
                const dotColor = isTie ? 'bg-yellow-400' : isWinner ? 'bg-green-400' : 'bg-red-400'
                const scoreColor = isTie ? 'text-yellow-600' : isWinner ? 'text-green-600' : 'text-red-500'
                const badgeClass = isTie ? 'bg-yellow-100 text-yellow-700' : isWinner ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                const label = isTie ? 'TIE' : isWinner ? 'WIN' : 'LOSS'
                return (
                  <div key={battle.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${dotColor}`} />
                      <span className="text-sm capitalize text-gray-700">{battle.subject}</span>
                      <span className="text-xs text-gray-400">Gr.{battle.grade_level}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-bold ${scoreColor}`}>
                        {myScore}–{theirScore}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${badgeClass}`}>
                        {label}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
