'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { BattleRoom, type BotDifficulty } from '@/components/battle/BattleRoom'
import { User, Question, Battle, Subject } from '@/types'
import { getQuestionsForBattle } from '@/lib/questions'
import { calculateElo, getRankTier } from '@/types'
import { COIN_REWARDS } from '@/lib/games'
import { useRouter, useParams, useSearchParams } from 'next/navigation'

export default function BattlePage() {
  const { id } = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const botDifficulty = (searchParams.get('difficulty') ?? 'medium') as BotDifficulty
  const [battle, setBattle] = useState<Battle | null>(null)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [opponent, setOpponent] = useState<User | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [done, setDone] = useState<{ myScore: number; theirScore: number; eloDelta: number; coinsEarned: number } | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isSolo, setIsSolo] = useState(true)
  const [waitingForOpponent, setWaitingForOpponent] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [{ data: profile }, { data: battleData }] = await Promise.all([
        supabase.from('users').select('*').eq('id', user.id).single(),
        supabase.from('battles').select('*').eq('id', id).single(),
      ])

      if (!profile || !battleData) { setLoadError('Could not load battle. Please try again.'); return }
      setCurrentUser(profile)
      setBattle(battleData)

      // Load opponent (for solo practice, opponent = self)
      const opponentId = battleData.challenger_id === user.id ? battleData.opponent_id : battleData.challenger_id
      if (opponentId !== user.id) {
        const { data: opp } = await supabase.from('users').select('*').eq('id', opponentId).single()
        if (opp) { setOpponent(opp); setIsSolo(false) }
        // If battle is still pending, poll until opponent accepts
        if (battleData.status === 'pending') {
          setWaitingForOpponent(true)
          const poll = setInterval(async () => {
            const { data } = await supabase
              .from('battles')
              .select('status')
              .eq('id', id)
              .single()
            if (data?.status === 'in_progress') {
              clearInterval(poll)
              setWaitingForOpponent(false)
            }
          }, 2000)
        }
      } else {
        setOpponent({ ...profile, username: 'Scholar Bot 🎓' })
        setIsSolo(true)
      }

      const selected = getQuestionsForBattle(battleData.subject as Subject, battleData.grade_level)
        .map((q, i) => ({ ...q, id: `q-${i}` }))

      setQuestions(selected)
    }
    load()
  }, [id])

  async function handleComplete(myScore: number, theirScore: number) {
    if (!battle || !currentUser) return

    const iAmChallenger = battle.challenger_id === currentUser.id
    const iWon = myScore > theirScore
    const tied = myScore === theirScore
    // For solo battles opponent_id === currentUser.id, so never use it as winner
    const opponentId = iAmChallenger ? battle.opponent_id : battle.challenger_id
    const winnerId = tied ? null : iWon ? currentUser.id : (isSolo ? null : opponentId)

    await supabase.from('battles').update({
      status: 'completed',
      challenger_score: iAmChallenger ? myScore : theirScore,
      opponent_score: iAmChallenger ? theirScore : myScore,
      winner_id: winnerId,
      completed_at: new Date().toISOString(),
    }).eq('id', battle.id)

    const { data: myProfile, error: profileErr } = await supabase.from('users').select('elo_rating, total_wins, total_battles, coins').eq('id', currentUser.id).single()
    if (profileErr) console.error('[Battle] profile fetch failed:', profileErr.message)
    const currentElo = myProfile?.elo_rating ?? currentUser.elo_rating ?? 1000
    const currentCoins = myProfile?.coins ?? 0
    let eloDelta = 0
    let coinsEarned = 0

    if (isSolo) {
      const difficultyBonus: Record<string, number> = { easy: 6, medium: 10, hard: 16 }
      const base = difficultyBonus[botDifficulty] ?? 10
      if (iWon) eloDelta = base
      else if (!tied) eloDelta = -Math.floor(base / 2)

      const coinKey = `bot_${botDifficulty}` as keyof typeof COIN_REWARDS
      coinsEarned = iWon ? (COIN_REWARDS[coinKey] ?? 10) : Math.floor((COIN_REWARDS[coinKey] ?? 10) / 2)

      const newElo = Math.max(100, currentElo + eloDelta)
      const soloUpdate: Record<string, unknown> = {
        elo_rating: newElo,
        rank_tier: getRankTier(newElo),
        total_wins: iWon ? (myProfile?.total_wins ?? 0) + 1 : (myProfile?.total_wins ?? 0),
        total_battles: (myProfile?.total_battles ?? 0) + 1,
      }
      if (myProfile?.coins !== undefined) soloUpdate.coins = currentCoins + coinsEarned
      const { error: updateErr } = await supabase.from('users').update(soloUpdate).eq('id', currentUser.id)
      if (updateErr) console.error('[Battle] ELO update failed:', updateErr.message)
    } else {
      coinsEarned = iWon ? COIN_REWARDS.pvp_win : tied ? COIN_REWARDS.pvp_tie : COIN_REWARDS.pvp_loss

      const loserId = winnerId === battle.challenger_id ? battle.opponent_id : battle.challenger_id
      const { data: loserProfile } = await supabase.from('users').select('elo_rating, total_wins, total_battles, coins').eq('id', loserId).single()

      if (loserProfile && !tied) {
        const [newWinnerElo, newLoserElo] = calculateElo(currentElo, loserProfile.elo_rating)
        eloDelta = iWon ? newWinnerElo - currentElo : newLoserElo - currentElo
        const myNewElo = iWon ? newWinnerElo : newLoserElo
        const theirNewElo = iWon ? newLoserElo : newWinnerElo

        const pvpUpdate: Record<string, unknown> = {
          elo_rating: myNewElo,
          rank_tier: getRankTier(myNewElo),
          total_wins: iWon ? (myProfile?.total_wins ?? 0) + 1 : (myProfile?.total_wins ?? 0),
          total_battles: (myProfile?.total_battles ?? 0) + 1,
        }
        if (myProfile?.coins !== undefined) pvpUpdate.coins = currentCoins + coinsEarned
        const { error: pvpErr } = await supabase.from('users').update(pvpUpdate).eq('id', currentUser.id)
        if (pvpErr) console.error('[Battle] PvP ELO update failed:', pvpErr.message)
        await supabase.from('users').update({
          elo_rating: theirNewElo,
          rank_tier: getRankTier(theirNewElo),
          total_battles: (loserProfile.total_battles ?? 0) + 1,
          coins: (loserProfile.coins ?? 0) + COIN_REWARDS.pvp_loss,
        }).eq('id', loserId)
      } else if (tied) {
        await supabase.from('users').update({
          total_battles: (myProfile?.total_battles ?? 0) + 1,
          coins: currentCoins + coinsEarned,
        }).eq('id', currentUser.id)
      }
    }

    setDone({ myScore, theirScore, eloDelta, coinsEarned })
  }

  if (done) {
    const won = done.myScore > done.theirScore
    const tied = done.myScore === done.theirScore
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-xl p-8 max-w-sm w-full text-center space-y-4">
          <div className="text-6xl">{won ? '🏆' : tied ? '🤝' : '😤'}</div>
          <h1 className="text-2xl font-black text-gray-900">
            {won ? 'You Won!' : tied ? 'It\'s a Tie!' : 'You Lost!'}
          </h1>
          <div className="flex justify-center gap-6 py-2">
            <div>
              <p className="text-4xl font-black text-indigo-600">{done.myScore}</p>
              <p className="text-xs text-gray-500">You</p>
            </div>
            <div className="text-2xl font-black text-gray-300 self-center">vs</div>
            <div>
              <p className="text-4xl font-black text-orange-500">{done.theirScore}</p>
              <p className="text-xs text-gray-500">Opponent</p>
            </div>
          </div>

          <div className="flex gap-2 justify-center">
            {done.eloDelta !== 0 && (
              <div className={`py-2 px-4 rounded-xl text-sm font-bold ${done.eloDelta > 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                {done.eloDelta > 0 ? `⬆️ +${done.eloDelta} ELO` : `⬇️ ${done.eloDelta} ELO`}
                {isSolo && <span className="font-normal text-xs ml-1 opacity-70">(vs bot)</span>}
              </div>
            )}
            {done.coinsEarned > 0 && (
              <div className="py-2 px-4 rounded-xl text-sm font-bold bg-yellow-50 text-yellow-700">
                🪙 +{done.coinsEarned} coins
              </div>
            )}
          </div>
          {done.eloDelta === 0 && done.coinsEarned === 0 && <p className="text-xs text-gray-400">No ELO change (tie)</p>}
          <div className="flex gap-2">
            <button onClick={() => router.push('/battle')} className="flex-1 border border-gray-200 rounded-xl py-3 text-sm font-bold text-gray-700 hover:bg-gray-50 transition">
              Play Again
            </button>
            <button onClick={() => router.push('/dashboard')} className="flex-1 bg-indigo-600 text-white rounded-xl py-3 text-sm font-bold hover:bg-indigo-700 transition">
              Dashboard
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="text-4xl">😵</div>
          <p className="font-bold text-gray-800">{loadError}</p>
          <button onClick={() => router.push('/battle')} className="px-5 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold">
            Back to Battle
          </button>
        </div>
      </div>
    )
  }

  if (waitingForOpponent) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-xl p-8 max-w-sm w-full text-center space-y-4">
          <div className="text-5xl animate-pulse">⏳</div>
          <h2 className="text-xl font-black text-gray-900">Waiting for opponent...</h2>
          <p className="text-sm text-gray-500">
            Challenge sent to <span className="font-bold text-gray-700">{opponent?.username}</span>.
            <br />They'll see a notification to accept.
          </p>
          <div className="flex gap-1 justify-center">
            {[0,1,2].map(i => (
              <div key={i} className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
          <button onClick={() => router.push('/friends')} className="text-sm text-gray-400 underline">
            Cancel
          </button>
        </div>
      </div>
    )
  }

  if (!currentUser || !opponent || !battle || questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="text-4xl animate-bounce">⚔️</div>
          <p className="text-gray-500 font-semibold">Loading battle...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white">
      <BattleRoom
        battleId={battle.id}
        questions={questions}
        currentUser={currentUser}
        opponent={opponent}
        isSolo={isSolo}
        botDifficulty={botDifficulty}
        subject={battle.subject as Subject}
        gradeLevel={battle.grade_level}
        onComplete={handleComplete}
      />
    </div>
  )
}
