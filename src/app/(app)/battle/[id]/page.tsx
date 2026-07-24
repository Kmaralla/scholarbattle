'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { BattleRoom, type BotDifficulty, type QuestionResult } from '@/components/battle/BattleRoom'
import { User, Question, Battle, Subject } from '@/types'
import { getQuestionsForBattle, pickQuestionIndices, getQuestionsByIndices } from '@/lib/questions'
import { calculateElo, getRankTier } from '@/types'
import { COIN_REWARDS } from '@/lib/games'
import { checkNewBadges, BADGE_MAP } from '@/lib/badges'
import { BadgeCard } from '@/components/BadgeCard'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { sounds } from '@/lib/sounds'

export default function BattlePage() {
  const { id } = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const botDifficulty = (searchParams.get('difficulty') ?? 'medium') as BotDifficulty
  const [battle, setBattle] = useState<Battle | null>(null)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [opponent, setOpponent] = useState<User | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [done, setDone] = useState<{ myScore: number; theirScore: number; eloDelta: number; coinsEarned: number; newBadges: string[]; results: QuestionResult[] } | null>(null)
  const [showReview, setShowReview] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isSolo, setIsSolo] = useState(true)
  const [waitingForOpponent, setWaitingForOpponent] = useState(false)
  const [challengeDeclined, setChallengeDeclined] = useState(false)
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
              // Reload to pick up question_ids saved by challenger
              window.location.reload()
            } else if (data?.status === 'declined') {
              clearInterval(poll)
              setWaitingForOpponent(false)
              setChallengeDeclined(true)
            }
          }, 2000)
        }
      } else {
        setOpponent({ ...profile, username: 'Scholar Bot 🎓' })
        setIsSolo(true)
      }

      let questionList: Omit<Question, 'id'>[]
      const isChallenger = battleData.challenger_id === user.id
      const existingIndices: number[] = battleData.question_ids ?? []

      if (!isSolo && existingIndices.length === 0 && isChallenger) {
        // Challenger picks questions and saves indices so opponent gets the same set
        const indices = pickQuestionIndices(battleData.subject as Subject, battleData.grade_level)
        await supabase.from('battles').update({ question_ids: indices }).eq('id', id)
        questionList = getQuestionsByIndices(indices)
      } else if (!isSolo && existingIndices.length > 0) {
        // Opponent (or challenger on reload) uses the saved indices
        questionList = getQuestionsByIndices(existingIndices)
      } else {
        // Solo practice — random as before
        questionList = getQuestionsForBattle(battleData.subject as Subject, battleData.grade_level)
      }

      setQuestions(questionList.map((q, i) => ({ ...q, id: `q-${i}` })))
    }
    load()
  }, [id])

  async function handleComplete(myScore: number, theirScore: number, results: QuestionResult[]) {
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

    const { data: myProfile, error: profileErr } = await supabase.from('users').select('elo_rating, total_wins, total_battles').eq('id', currentUser.id).single()
    if (profileErr) console.error('[Battle] profile fetch failed:', profileErr.message)
    const currentElo = myProfile?.elo_rating ?? currentUser.elo_rating ?? 1000

    // Fetch coins separately so a missing column doesn't break ELO updates
    const { data: coinsRow } = await supabase.from('users').select('coins, unlocked_games').eq('id', currentUser.id).single()
    const currentCoins = (coinsRow as any)?.coins ?? 0
    let eloDelta = 0
    let coinsEarned = 0

    if (isSolo) {
      const difficultyBonus: Record<string, number> = { easy: 6, medium: 10, hard: 16 }
      const base = difficultyBonus[botDifficulty] ?? 10
      if (iWon) eloDelta = base
      else if (!tied) eloDelta = -Math.floor(base / 2)

      const coinKey = `bot_${botDifficulty}` as keyof typeof COIN_REWARDS
      const baseReward = COIN_REWARDS[coinKey] ?? 10
      coinsEarned = iWon ? baseReward : tied ? 0 : -Math.floor(baseReward / 2)

      const newElo = Math.max(100, currentElo + eloDelta)
      const soloUpdate: Record<string, unknown> = {
        elo_rating: newElo,
        rank_tier: getRankTier(newElo),
        total_wins: iWon ? (myProfile?.total_wins ?? 0) + 1 : (myProfile?.total_wins ?? 0),
        total_battles: (myProfile?.total_battles ?? 0) + 1,
      }
      if ((coinsRow as any)?.coins !== undefined) soloUpdate.coins = Math.max(0, currentCoins + coinsEarned)
      const { error: updateErr } = await supabase.from('users').update(soloUpdate).eq('id', currentUser.id)
      if (updateErr) console.error('[Battle] ELO update failed:', updateErr.message)
    } else {
      coinsEarned = iWon ? COIN_REWARDS.pvp_win : tied ? COIN_REWARDS.pvp_tie : -COIN_REWARDS.pvp_loss

      const loserId = winnerId === battle.challenger_id ? battle.opponent_id : battle.challenger_id
      const { data: loserProfile } = await supabase.from('users').select('elo_rating, total_wins, total_battles').eq('id', loserId).single()
      const { data: loserCoinsRow } = await supabase.from('users').select('coins').eq('id', loserId).single()

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
        if ((coinsRow as any)?.coins !== undefined) pvpUpdate.coins = Math.max(0, currentCoins + coinsEarned)
        const { error: pvpErr } = await supabase.from('users').update(pvpUpdate).eq('id', currentUser.id)
        if (pvpErr) console.error('[Battle] PvP ELO update failed:', pvpErr.message)
        await supabase.from('users').update({
          elo_rating: theirNewElo,
          rank_tier: getRankTier(theirNewElo),
          total_battles: (loserProfile.total_battles ?? 0) + 1,
          ...((loserCoinsRow as any)?.coins !== undefined ? { coins: Math.max(0, ((loserCoinsRow as any).coins ?? 0) - COIN_REWARDS.pvp_loss) } : {}),
        }).eq('id', loserId)
      } else if (tied) {
        await supabase.from('users').update({
          total_battles: (myProfile?.total_battles ?? 0) + 1,
          coins: currentCoins + coinsEarned,
        }).eq('id', currentUser.id)
      }
    }

    // Badge checking
    const { data: badgeRow } = await supabase.from('users').select('badges, elo_rating, total_wins, total_battles').eq('id', currentUser.id).single()
    const currentBadges: string[] = (badgeRow as any)?.badges ?? []
    const newEloForBadge = (badgeRow as any)?.elo_rating ?? currentElo
    const newTotalWins = (badgeRow as any)?.total_wins ?? 0
    const newTotalBattles = (badgeRow as any)?.total_battles ?? 0

    const newBadges = checkNewBadges({
      iWon, tied,
      myScore,
      totalQuestions: questions.length,
      subject: battle.subject,
      isSolo,
      botDifficulty,
      newElo: newEloForBadge,
      newTotalBattles,
      newTotalWins,
      currentBadges,
    })

    if (newBadges.length > 0) {
      await supabase.from('users').update({ badges: [...currentBadges, ...newBadges] }).eq('id', currentUser.id)
    }

    const iWonFinal = myScore > theirScore
    const tiedFinal = myScore === theirScore
    if (iWonFinal) sounds.win()
    else if (!tiedFinal) sounds.lose()

    setDone({ myScore, theirScore, eloDelta, coinsEarned, newBadges, results })
  }

  if (done) {
    const won = done.myScore > done.theirScore
    const tied = done.myScore === done.theirScore

    async function handleRematch() {
      if (!battle || !currentUser || !opponent) return
      const { data: newBattle } = await supabase.from('battles').insert({
        challenger_id: currentUser.id,
        opponent_id: isSolo ? currentUser.id : opponent.id,
        subject: battle.subject,
        grade_level: battle.grade_level,
        status: isSolo ? 'in_progress' : 'pending',
        challenger_score: 0, opponent_score: 0, question_ids: [],
      }).select().single()
      if (!newBattle) return
      if (!isSolo) {
        const ch = supabase.channel(`challenge:${opponent.id}`)
        await ch.subscribe()
        await ch.send({ type: 'broadcast', event: 'incoming_challenge', payload: {
          battle_id: newBattle.id, challenger_username: currentUser.username,
          subject: battle.subject, grade_level: battle.grade_level,
        }})
        supabase.removeChannel(ch)
      }
      router.push(`/battle/${newBattle.id}${isSolo ? `?difficulty=${botDifficulty}` : ''}`)
    }

    function shareScore() {
      const result = won ? 'WON' : tied ? 'TIED' : 'LOST'
      const d = done!
      const myUsername = currentUser?.username ?? 'me'
      const challengeUrl = `${window.location.origin}/challenge/${myUsername}`
      const text = `I just ${result} a ScholarBattle! 🎮\n${d.myScore}–${d.theirScore} in ${battle?.subject ?? 'a battle'} · ${d.eloDelta > 0 ? `+${d.eloDelta}` : d.eloDelta} ELO\n\nThink you can beat me? 👇\n${challengeUrl}`
      if (navigator.share) {
        navigator.share({ title: `Can you beat @${myUsername} on ScholarBattle?`, text, url: challengeUrl })
      } else {
        navigator.clipboard.writeText(text)
        alert('Link copied to clipboard!')
      }
    }

    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--bg-base)]">
        <div className="rounded-3xl p-8 max-w-sm w-full text-center space-y-5 bg-white/5 border border-white/10 shadow-2xl backdrop-blur">
          <div className="text-7xl float">{won ? '🏆' : tied ? '🤝' : '😤'}</div>
          <h1 className={`text-3xl font-black ${won ? 'shimmer-text' : tied ? 'text-yellow-300' : 'text-red-400'}`}>
            {won ? 'You Won!' : tied ? "It's a Tie!" : 'You Lost!'}
          </h1>
          <div className="flex justify-center gap-8 py-2">
            <div>
              <p className="text-5xl font-black text-violet-400">{done.myScore}</p>
              <p className="text-xs text-white/40 mt-1">You</p>
            </div>
            <div className="text-2xl font-black text-white/20 self-center">vs</div>
            <div>
              <p className="text-5xl font-black text-orange-400">{done.theirScore}</p>
              <p className="text-xs text-white/40 mt-1">{opponent?.username ?? 'Opponent'}</p>
            </div>
          </div>

          <div className="flex gap-2 justify-center flex-wrap">
            {done.eloDelta !== 0 && (
              <div className={`py-2 px-4 rounded-xl text-sm font-bold ${done.eloDelta > 0 ? 'bg-green-400/20 text-green-300 border border-green-400/30' : 'bg-red-400/20 text-red-300 border border-red-400/30'}`}>
                {done.eloDelta > 0 ? `⬆️ +${done.eloDelta} ELO` : `⬇️ ${done.eloDelta} ELO`}
                {isSolo && <span className="font-normal text-xs ml-1 opacity-70">(vs bot)</span>}
              </div>
            )}
            {done.coinsEarned !== 0 && (
              <div className={`py-2 px-4 rounded-xl text-sm font-bold border ${done.coinsEarned > 0 ? 'bg-yellow-400/20 text-yellow-300 border-yellow-400/30' : 'bg-red-400/20 text-red-300 border-red-400/30'}`}>
                🪙 {done.coinsEarned > 0 ? `+${done.coinsEarned}` : done.coinsEarned} coins
              </div>
            )}
          </div>
          {done.eloDelta === 0 && done.coinsEarned === 0 && <p className="text-xs text-white/30">No ELO or coin change (tie)</p>}

          {/* New badges earned */}
          {done.newBadges.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 justify-center">
                <span className="text-lg">🎖️</span>
                <p className="text-sm font-black text-white">Badge{done.newBadges.length > 1 ? 's' : ''} Unlocked!</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {done.newBadges.map(bid => {
                  const badge = BADGE_MAP[bid]
                  return badge ? <BadgeCard key={bid} badge={badge} size="sm" /> : null
                })}
              </div>
            </div>
          )}

          {/* Share (win/tie) or Review (loss) */}
          {won || tied ? (
            <button
              onClick={shareScore}
              className="w-full py-3 rounded-2xl bg-white/8 border border-white/15 text-white/70 font-bold text-sm hover:bg-white/12 hover:text-white transition flex items-center justify-center gap-2"
            >
              📤 Share Result
            </button>
          ) : (
            <button
              onClick={() => setShowReview(r => !r)}
              className="w-full py-3 rounded-2xl bg-red-500/15 border border-red-400/30 text-red-300 font-bold text-sm hover:bg-red-500/25 transition flex items-center justify-center gap-2"
            >
              🔍 {showReview ? 'Hide Review' : 'Review What Went Wrong'}
            </button>
          )}

          {/* Review panel */}
          {showReview && !won && (
            <div className="space-y-2 text-left">
              <p className="text-xs text-white/40 font-semibold uppercase tracking-wide px-1">Question Review</p>
              {done.results.map((r, i) => (
                <div
                  key={i}
                  className={`rounded-2xl p-3 border text-sm space-y-1.5 ${r.isCorrect ? 'bg-green-500/10 border-green-400/20' : 'bg-red-500/10 border-red-400/20'}`}
                >
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 flex-shrink-0">{r.isCorrect ? '✅' : '❌'}</span>
                    <p className="text-white/90 font-medium leading-snug">{r.question.question_text}</p>
                  </div>
                  {!r.isCorrect && (
                    <div className="pl-6 space-y-0.5">
                      {r.userAnswer ? (
                        <p className="text-red-400 text-xs">Your answer: <span className="font-bold">{r.userAnswer}</span></p>
                      ) : (
                        <p className="text-white/30 text-xs italic">No answer — ran out of time</p>
                      )}
                      <p className="text-green-400 text-xs">Correct: <span className="font-bold">{r.question.correct_answer}</span></p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleRematch}
              className="flex-1 border border-indigo-400/30 bg-indigo-500/15 rounded-2xl py-3 text-sm font-black text-indigo-300 hover:bg-indigo-500/25 transition"
            >
              🔁 Rematch
            </button>
            <button onClick={() => router.push('/dashboard')} className="flex-1 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white rounded-2xl py-3 text-sm font-bold hover:opacity-90 transition shadow-lg shadow-violet-500/30">
              Dashboard
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--bg-base)]">
        <div className="text-center space-y-3">
          <div className="text-4xl">😵</div>
          <p className="font-bold text-white">{loadError}</p>
          <button onClick={() => router.push('/battle')} className="px-5 py-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white rounded-xl text-sm font-bold">
            Back to Battle
          </button>
        </div>
      </div>
    )
  }

  if (challengeDeclined) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--bg-base)]">
        <div className="rounded-3xl p-8 max-w-sm w-full text-center space-y-4 bg-red-500/10 border border-red-400/30">
          <div className="text-5xl">😤</div>
          <h2 className="text-2xl font-black text-red-400">CHALLENGE DECLINED!</h2>
          <p className="text-sm text-white/50">
            <span className="font-bold text-white">{opponent?.username}</span> turned down your challenge.
          </p>
          <button
            onClick={() => router.push('/matchmaking')}
            className="w-full py-3 rounded-2xl bg-indigo-500 hover:bg-indigo-400 font-black text-white transition-all"
          >
            Find Another Opponent
          </button>
          <button onClick={() => router.push('/dashboard')} className="text-sm text-white/30 underline">
            Go Home
          </button>
        </div>
      </div>
    )
  }

  if (waitingForOpponent) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--bg-base)]">
        <div className="rounded-3xl p-8 max-w-sm w-full text-center space-y-4 bg-white/5 border border-white/10">
          <div className="text-5xl animate-pulse">⏳</div>
          <h2 className="text-xl font-black text-white">Waiting for opponent...</h2>
          <p className="text-sm text-white/50">
            Challenge sent to <span className="font-bold text-violet-300">{opponent?.username}</span>.
            <br />They'll see a notification to accept.
          </p>
          <div className="flex gap-1 justify-center">
            {[0,1,2].map(i => (
              <div key={i} className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
          <button onClick={() => router.push('/friends')} className="text-sm text-white/30 underline">Cancel</button>
        </div>
      </div>
    )
  }

  if (!currentUser || !opponent || !battle || questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-base)]">
        <div className="text-center space-y-2">
          <div className="text-4xl animate-bounce">⚔️</div>
          <p className="text-white/50 font-semibold">Loading battle...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-700">
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
