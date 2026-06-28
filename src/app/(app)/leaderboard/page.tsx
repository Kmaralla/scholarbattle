import { createClient } from '@/lib/supabase/server'
import { RankBadge } from '@/components/RankBadge'
import { getRankTier } from '@/types'
import { Card, CardContent } from '@/components/ui/card'
import { Crown } from 'lucide-react'

export default async function LeaderboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: players } = await supabase
    .from('users')
    .select('id, username, elo_rating, total_wins, total_battles, rank_tier')
    .order('elo_rating', { ascending: false })
    .limit(50)

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Crown className="w-6 h-6 text-yellow-500" />
        <h1 className="text-xl font-black text-gray-900">Global Rankings</h1>
      </div>

      {/* Top 3 podium */}
      {players && players.length >= 3 && (
        <div className="flex items-end justify-center gap-3 py-4">
          {/* 2nd */}
          <div className="flex flex-col items-center gap-1">
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-700">
              {players[1].username[0].toUpperCase()}
            </div>
            <p className="text-xs font-bold text-gray-700 max-w-[70px] truncate text-center">{players[1].username}</p>
            <div className="bg-gray-200 w-16 h-12 rounded-t-lg flex items-center justify-center">
              <span className="text-lg">🥈</span>
            </div>
          </div>
          {/* 1st */}
          <div className="flex flex-col items-center gap-1">
            <span className="text-xl">👑</span>
            <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center font-bold text-yellow-700 text-lg">
              {players[0].username[0].toUpperCase()}
            </div>
            <p className="text-xs font-bold text-gray-900 max-w-[70px] truncate text-center">{players[0].username}</p>
            <div className="bg-yellow-300 w-16 h-16 rounded-t-lg flex items-center justify-center">
              <span className="text-lg">🥇</span>
            </div>
          </div>
          {/* 3rd */}
          <div className="flex flex-col items-center gap-1">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center font-bold text-amber-700">
              {players[2].username[0].toUpperCase()}
            </div>
            <p className="text-xs font-bold text-gray-700 max-w-[70px] truncate text-center">{players[2].username}</p>
            <div className="bg-amber-200 w-16 h-8 rounded-t-lg flex items-center justify-center">
              <span className="text-lg">🥉</span>
            </div>
          </div>
        </div>
      )}

      {/* Full list */}
      <Card>
        <CardContent className="p-0">
          {players?.map((player, i) => {
            const isMe = player.id === user?.id
            const tier = getRankTier(player.elo_rating)
            const winRate = player.total_battles > 0
              ? Math.round((player.total_wins / player.total_battles) * 100)
              : 0
            return (
              <div
                key={player.id}
                className={`flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0 ${isMe ? 'bg-indigo-50' : ''}`}
              >
                <span className={`w-7 text-center text-sm font-black ${i < 3 ? 'text-yellow-500' : 'text-gray-400'}`}>
                  {i + 1}
                </span>
                <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center font-bold text-indigo-700 text-sm flex-shrink-0">
                  {player.username[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-bold truncate ${isMe ? 'text-indigo-700' : 'text-gray-900'}`}>
                    {player.username} {isMe && <span className="text-xs">(you)</span>}
                  </p>
                  <p className="text-xs text-gray-400">{player.total_battles} battles · {winRate}% WR</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <RankBadge tier={tier} />
                  <span className="text-xs font-bold text-gray-700">{player.elo_rating}</span>
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}
