export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { RankBadge } from '@/components/RankBadge'
import { getRankTier } from '@/types'
import { Card, CardContent } from '@/components/ui/card'
import { Crown } from 'lucide-react'
import { UserAvatar } from '@/components/profile/UserAvatar'
import Link from 'next/link'

const GRADES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ grade?: string }>
}) {
  const { grade } = await searchParams
  const selectedGrade = grade ? parseInt(grade) : null

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let query = supabase
    .from('users')
    .select('id, username, elo_rating, total_wins, total_battles, rank_tier, avatar_url, grade_level')
    .order('elo_rating', { ascending: false })
    .limit(50)

  if (selectedGrade) {
    query = query.eq('grade_level', selectedGrade)
  }

  const { data: players } = await query

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4 pb-24">
      <div className="flex items-center gap-2">
        <Crown className="w-6 h-6 text-yellow-500" />
        <h1 className="text-xl font-black text-white">
          {selectedGrade ? `Grade ${selectedGrade} Rankings` : 'Overall Rankings'}
        </h1>
      </div>

      {/* Grade filter buttons */}
      <div className="flex flex-wrap gap-2">
        <Link
          href="/leaderboard"
          className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
            !selectedGrade
              ? 'bg-indigo-500 text-white'
              : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'
          }`}
        >
          Overall
        </Link>
        {GRADES.map(g => (
          <Link
            key={g}
            href={`/leaderboard?grade=${g}`}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
              selectedGrade === g
                ? 'bg-indigo-500 text-white'
                : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'
            }`}
          >
            Gr.{g}
          </Link>
        ))}
      </div>

      {/* No players */}
      {(!players || players.length === 0) && (
        <div className="text-center py-16 text-white/30">
          <p className="text-4xl mb-3">🏆</p>
          <p className="font-semibold">No players in Grade {selectedGrade} yet</p>
        </div>
      )}

      {/* Top 3 podium */}
      {players && players.length >= 3 && (
        <div className="flex items-end justify-center gap-3 py-4">
          {/* 2nd */}
          <div className="flex flex-col items-center gap-1">
            <UserAvatar username={players[1].username} avatarUrl={(players[1] as any).avatar_url} size="md" />
            <p className="text-xs font-bold text-white max-w-[70px] truncate text-center">{players[1].username}</p>
            <div className="bg-white/15 w-16 h-12 rounded-t-lg flex items-center justify-center">
              <span className="text-lg">🥈</span>
            </div>
          </div>
          {/* 1st */}
          <div className="flex flex-col items-center gap-1">
            <span className="text-xl">👑</span>
            <UserAvatar username={players[0].username} avatarUrl={(players[0] as any).avatar_url} size="lg" />
            <p className="text-xs font-bold text-white max-w-[70px] truncate text-center">{players[0].username}</p>
            <div className="bg-yellow-400/30 w-16 h-16 rounded-t-lg flex items-center justify-center">
              <span className="text-lg">🥇</span>
            </div>
          </div>
          {/* 3rd */}
          <div className="flex flex-col items-center gap-1">
            <UserAvatar username={players[2].username} avatarUrl={(players[2] as any).avatar_url} size="md" />
            <p className="text-xs font-bold text-white max-w-[70px] truncate text-center">{players[2].username}</p>
            <div className="bg-amber-400/20 w-16 h-8 rounded-t-lg flex items-center justify-center">
              <span className="text-lg">🥉</span>
            </div>
          </div>
        </div>
      )}

      {/* Full list */}
      {players && players.length > 0 && (
        <Card>
          <CardContent className="p-0">
            {players.map((player, i) => {
              const isMe = player.id === user?.id
              const tier = getRankTier(player.elo_rating)
              const winRate = player.total_battles > 0
                ? Math.round((player.total_wins / player.total_battles) * 100)
                : 0
              return (
                <div
                  key={player.id}
                  className={`flex items-center gap-3 px-4 py-3 border-b border-white/5 last:border-0 ${isMe ? 'bg-indigo-500/20' : ''}`}
                >
                  <span className={`w-7 text-center text-sm font-black ${i < 3 ? 'text-yellow-500' : 'text-white/40'}`}>
                    {i + 1}
                  </span>
                  <UserAvatar username={player.username} avatarUrl={(player as any).avatar_url} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-bold truncate ${isMe ? 'text-indigo-300' : 'text-white'}`}>
                      {player.username} {isMe && <span className="text-xs">(you)</span>}
                    </p>
                    <p className="text-xs text-white/40">
                      {!selectedGrade && `Gr.${(player as any).grade_level} · `}{player.total_battles} battles · {winRate}% WR
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <RankBadge tier={tier} />
                    <span className="text-xs font-bold text-white/60">{player.elo_rating}</span>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
