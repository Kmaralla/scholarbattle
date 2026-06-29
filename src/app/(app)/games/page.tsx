'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { GAMES, GameDef } from '@/lib/games'
import { User, Subject } from '@/types'
import { Lock, Star } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

const SUBJECTS = ['math', 'science', 'history', 'english'] as Subject[]
const GRADES = [3, 4, 5, 6, 7, 8, 9, 10]

export default function GamesPage() {
  const [profile, setProfile] = useState<(User & { coins: number; unlocked_games: string[] }) | null>(null)
  const [subject, setSubject] = useState<Subject>('math')
  const [grade, setGrade] = useState(5)
  const [unlocking, setUnlocking] = useState<string | null>(null)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase.from('users').select('*').eq('id', user.id).single()
          .then(({ data }) => { if (data) setProfile(data as any) })
      }
    })
  }, [])

  const filteredGames = GAMES.filter(g =>
    g.subjects.includes('all') || g.subjects.includes(subject)
  )

  async function handleGameClick(game: GameDef) {
    if (!profile) return
    const isUnlocked = game.coinCost === 0 || (profile.unlocked_games ?? []).includes(game.id)

    if (!isUnlocked) {
      if (profile.coins < game.coinCost) return
      // Unlock it
      setUnlocking(game.id)
      const newUnlocked = [...(profile.unlocked_games ?? []), game.id]
      await supabase.from('users').update({
        coins: profile.coins - game.coinCost,
        unlocked_games: newUnlocked,
      }).eq('id', profile.id)
      setProfile(p => p ? { ...p, coins: p.coins - game.coinCost, unlocked_games: newUnlocked } : p)
      setUnlocking(null)
    }

    router.push(`/games/play?game=${game.id}&subject=${subject}&grade=${grade}`)
  }

  if (!profile) return <div className="p-4 text-center text-gray-400">Loading...</div>

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-black text-gray-900">🎮 Games</h1>
        <div className="flex items-center gap-1 bg-yellow-50 border border-yellow-200 rounded-full px-3 py-1.5">
          <span>🪙</span>
          <span className="font-bold text-yellow-700">{profile.coins}</span>
        </div>
      </div>

      {/* Subject + grade picker */}
      <div className="space-y-3">
        <div className="flex gap-2 flex-wrap">
          {SUBJECTS.map(s => (
            <button
              key={s}
              onClick={() => setSubject(s)}
              className={cn(
                'px-4 py-1.5 rounded-full text-sm font-semibold capitalize transition',
                subject === s
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="flex gap-2 flex-wrap">
          {GRADES.map(g => (
            <button
              key={g}
              onClick={() => setGrade(g)}
              className={cn(
                'w-10 h-10 rounded-xl text-sm font-bold transition',
                grade === g
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {/* Games grid */}
      <div className="grid grid-cols-2 gap-3">
        {filteredGames.map(game => {
          const isUnlocked = game.coinCost === 0 || (profile.unlocked_games ?? []).includes(game.id)
          const canAfford = profile.coins >= game.coinCost
          return (
            <button
              key={game.id}
              onClick={() => handleGameClick(game)}
              disabled={!isUnlocked && !canAfford}
              className={cn(
                'relative rounded-2xl p-4 text-left transition shadow-sm',
                `bg-gradient-to-br ${game.color} text-white`,
                (!isUnlocked && !canAfford) && 'opacity-50 cursor-not-allowed',
                (isUnlocked || canAfford) && 'hover:scale-[1.02] active:scale-[0.98]'
              )}
            >
              {/* Lock overlay */}
              {!isUnlocked && (
                <div className="absolute top-2 right-2 bg-black/30 rounded-full p-1">
                  <Lock className="w-3.5 h-3.5 text-white" />
                </div>
              )}

              <div className="text-3xl mb-2">{game.emoji}</div>
              <p className="font-bold text-sm leading-tight">{game.name}</p>
              <p className="text-xs opacity-80 mt-0.5 line-clamp-2">{game.description}</p>

              {/* Fun stars */}
              <div className="flex gap-0.5 mt-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className={cn('w-3 h-3', i < game.fun ? 'fill-white text-white' : 'text-white/30')} />
                ))}
              </div>

              {/* Cost / status */}
              <div className="mt-2">
                {isUnlocked ? (
                  <span className="text-xs bg-white/20 rounded-full px-2 py-0.5 font-semibold">Play</span>
                ) : (
                  <span className={cn(
                    'text-xs rounded-full px-2 py-0.5 font-semibold',
                    canAfford ? 'bg-yellow-300 text-yellow-900' : 'bg-black/20 text-white'
                  )}>
                    🪙 {game.coinCost} to unlock
                  </span>
                )}
              </div>

              {unlocking === game.id && (
                <div className="absolute inset-0 bg-black/30 rounded-2xl flex items-center justify-center">
                  <span className="text-white text-sm font-bold animate-pulse">Unlocking...</span>
                </div>
              )}
            </button>
          )
        })}
      </div>

      <p className="text-xs text-center text-gray-400">Win battles to earn 🪙 coins and unlock more games!</p>
    </div>
  )
}
