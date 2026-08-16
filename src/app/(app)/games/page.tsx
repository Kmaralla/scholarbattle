'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { GAMES, GameDef } from '@/lib/games'
import { User, Subject } from '@/types'
import { Lock } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

const SUBJECTS: { id: Subject; label: string; emoji: string }[] = [
  { id: 'math',    label: 'Math',    emoji: '🔢' },
  { id: 'science', label: 'Science', emoji: '🔬' },
  { id: 'history', label: 'History', emoji: '📜' },
  { id: 'english', label: 'English', emoji: '📖' },
]
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

  if (!profile) return (
    <div className="p-8 text-center text-white/40">
      <div className="text-4xl mb-3 animate-pulse">🎮</div>
      <p>Loading games...</p>
    </div>
  )

  const unlockedCount = filteredGames.filter(g => g.coinCost === 0 || (profile.unlocked_games ?? []).includes(g.id)).length

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-5 pb-24">

      {/* Hero */}
      <div className="rounded-3xl bg-gradient-to-br from-violet-600/30 to-indigo-600/20 border border-violet-400/20 p-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">🎮 Games</h1>
          <p className="text-white/50 text-sm mt-1">
            {unlockedCount}/{filteredGames.length} unlocked
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-1.5 bg-yellow-400/15 border border-yellow-400/30 rounded-full px-4 py-1.5">
            <span>🪙</span>
            <span className="font-black text-yellow-300 text-lg">{profile.coins}</span>
          </div>
          <p className="text-[10px] text-white/30">your coins</p>
        </div>
      </div>

      {/* Subject picker */}
      <div className="grid grid-cols-4 gap-2">
        {SUBJECTS.map(s => (
          <button
            key={s.id}
            onClick={() => setSubject(s.id)}
            className={cn(
              'flex flex-col items-center gap-1 py-3 rounded-2xl border font-bold text-xs transition-all',
              subject === s.id
                ? 'bg-indigo-500/25 border-indigo-400/40 text-white'
                : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/8 hover:text-white'
            )}
          >
            <span className="text-xl">{s.emoji}</span>
            {s.label}
          </button>
        ))}
      </div>

      {/* Grade picker */}
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-white/25 mb-2">Grade</p>
        <div className="flex gap-2 flex-wrap">
          {GRADES.map(g => (
            <button
              key={g}
              onClick={() => setGrade(g)}
              className={cn(
                'w-10 h-10 rounded-xl text-sm font-black transition-all',
                grade === g
                  ? 'bg-indigo-600 text-white scale-110'
                  : 'bg-white/5 border border-white/10 text-white/50 hover:bg-white/10 hover:text-white'
              )}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {/* Games grid */}
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-white/25 mb-3">Available Games</p>
        <div className="grid grid-cols-2 gap-3">
          {filteredGames.map(game => {
            const isUnlocked = game.coinCost === 0 || (profile.unlocked_games ?? []).includes(game.id)
            const canAfford = profile.coins >= game.coinCost
            const locked = !isUnlocked && !canAfford
            return (
              <button
                key={game.id}
                onClick={() => handleGameClick(game)}
                disabled={locked}
                className={cn(
                  'relative rounded-2xl p-4 text-left transition-all border',
                  `bg-gradient-to-br ${game.color}`,
                  locked
                    ? 'opacity-40 cursor-not-allowed border-white/5'
                    : 'border-white/10 hover:scale-[1.03] hover:border-white/20 active:scale-[0.98] shadow-lg'
                )}
              >
                {!isUnlocked && (
                  <div className="absolute top-3 right-3 bg-black/40 rounded-full p-1.5">
                    <Lock className="w-3 h-3 text-white" />
                  </div>
                )}

                <div className="text-3xl mb-2">{game.emoji}</div>
                <p className="font-black text-white text-sm leading-tight">{game.name}</p>
                <p className="text-xs text-white/70 mt-1 line-clamp-2 leading-snug">{game.description}</p>

                {/* Fun rating */}
                <div className="flex gap-0.5 mt-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className={cn('w-1.5 h-1.5 rounded-full', i < game.fun ? 'bg-white' : 'bg-white/20')} />
                  ))}
                </div>

                <div className="mt-3">
                  {isUnlocked ? (
                    <span className="text-xs bg-white/25 rounded-full px-3 py-1 font-black">Play →</span>
                  ) : canAfford ? (
                    <span className="text-xs bg-yellow-300 text-yellow-900 rounded-full px-3 py-1 font-black">
                      🪙 {game.coinCost} — Unlock
                    </span>
                  ) : (
                    <span className="text-xs bg-black/20 text-white/60 rounded-full px-3 py-1 font-semibold">
                      🪙 {game.coinCost} needed
                    </span>
                  )}
                </div>

                {unlocking === game.id && (
                  <div className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center">
                    <span className="text-white text-sm font-black animate-pulse">Unlocking...</span>
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      <p className="text-xs text-center text-white/20">Win battles to earn 🪙 coins and unlock more games!</p>
    </div>
  )
}
