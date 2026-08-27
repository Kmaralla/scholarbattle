'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn, clipOptionDisplay, getEffectiveSeconds } from '@/lib/utils'
import { Question } from '@/types'
import { getQuestionsByIndices } from '@/lib/questions'
import { UserAvatar } from '@/components/profile/UserAvatar'
import {
  TeamBattle,
  TeamBattleParticipant,
  TeamBattleAnswer,
  currentQuestionIndex,
  computeQuestionSchedule,
  msUntilStart,
  computeTeamScores,
} from '@/lib/teamBattle'

const POLL_MS = 500
const TICK_MS = 250

export default function TeamBattlePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()

  const [userId, setUserId] = useState<string | null>(null)
  const [battle, setBattle] = useState<TeamBattle | null>(null)
  const [participants, setParticipants] = useState<TeamBattleParticipant[]>([])
  const [questions, setQuestions] = useState<Question[]>([])
  const [answers, setAnswers] = useState<TeamBattleAnswer[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [tick, setTick] = useState(0)

  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [typedAnswer, setTypedAnswer] = useState('')
  const [answeredIndex, setAnsweredIndex] = useState(-1)
  const questionStartRef = useRef<number>(Date.now())
  const lastQIndexRef = useRef<number>(-2)
  const clockOffsetRef = useRef<number>(0) // server time minus this device's Date.now()

  // Two devices' system clocks can be a few seconds apart. All schedule
  // math below compares against a shared absolute server timestamp
  // (start_at / answer created_at), so we correct this device's Date.now()
  // by its offset from the DB server's clock once up front.
  useEffect(() => {
    async function syncClock() {
      const t0 = Date.now()
      const { data } = await supabase.rpc('server_now')
      const t1 = Date.now()
      if (!data) return
      const serverMs = new Date(data).getTime()
      clockOffsetRef.current = serverMs - (t0 + t1) / 2
    }
    syncClock()
  }, [])

  function now() {
    return Date.now() + clockOffsetRef.current
  }

  const loadAll = useCallback(async () => {
    const [{ data: battleRow }, { data: parts }, { data: ans }] = await Promise.all([
      supabase.from('team_battles').select('*').eq('id', id).maybeSingle(),
      supabase.from('team_battle_participants')
        .select('*, users!team_battle_participants_user_id_fkey(username, avatar_url, equipped_frame)')
        .eq('team_battle_id', id),
      supabase.from('team_battle_answers').select('*').eq('team_battle_id', id),
    ])
    // start_at can shift slightly right after creation (host finishes
    // sending invites before locking in the countdown) — keep it in sync
    // so every participant's clock is derived from the same value.
    if (battleRow) setBattle(battleRow)
    if (parts) {
      setParticipants(parts.map((row: any) => ({
        ...row,
        username: row.users?.username ?? 'Scholar',
        avatar_url: row.users?.avatar_url ?? null,
        equipped_frame: row.users?.equipped_frame ?? null,
      })))
    }
    if (ans) setAnswers(ans as TeamBattleAnswer[])
  }, [id])

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserId(user.id)

      const { data: battleRow } = await supabase.from('team_battles').select('*').eq('id', id).maybeSingle()
      if (!battleRow) { setNotFound(true); setLoading(false); return }
      setBattle(battleRow)
      setQuestions(getQuestionsByIndices(battleRow.question_ids).map((q, i) => ({ ...q, id: `q-${i}` })))
      await loadAll()
      setLoading(false)
    }
    load()
  }, [id])

  // Live-updating clock + scoreboard poll
  useEffect(() => {
    if (!battle) return
    const clockInterval = setInterval(() => setTick(t => t + 1), TICK_MS)
    const pollInterval = setInterval(loadAll, POLL_MS)
    return () => { clearInterval(clockInterval); clearInterval(pollInterval) }
  }, [battle, loadAll])

  const questionTexts = questions.map(q => q.question_text)
  const qIndex = battle ? currentQuestionIndex(battle, answers, participants, questions.length, now(), questionTexts) : -1
  const startsInMs = battle ? msUntilStart(battle, now()) : 0
  const me = participants.find(p => p.user_id === userId)
  const scores = battle ? computeTeamScores(answers, participants, Math.min(qIndex + 1, questions.length)) : {}
  const teamNumbers = [...new Set(participants.filter(p => p.status === 'accepted').map(p => p.team_number))].sort()
  const winningTeam = teamNumbers.find(t => (scores[t] ?? 0) >= (battle?.points_to_win ?? 5)) ?? null
  const exhausted = qIndex >= questions.length
  const gameOver = winningTeam != null || exhausted

  // Reset per-question answer state when the question changes
  useEffect(() => {
    if (qIndex !== lastQIndexRef.current) {
      lastQIndexRef.current = qIndex
      setSelectedAnswer(null)
      setTypedAnswer('')
      questionStartRef.current = Date.now()
    }
  }, [qIndex])

  async function submitAnswer(answer: string) {
    if (!battle || !userId || qIndex < 0 || qIndex >= questions.length) return
    if (answeredIndex === qIndex) return
    setAnsweredIndex(qIndex)
    const q = questions[qIndex]
    const isCorrect = answer.trim().toLowerCase() === q.correct_answer.trim().toLowerCase()
    const timeMs = Date.now() - questionStartRef.current
    await supabase.from('team_battle_answers').insert({
      team_battle_id: battle.id,
      user_id: userId,
      question_index: qIndex,
      is_correct: isCorrect,
      time_ms: timeMs,
    })
    loadAll()
  }

  function handleChoiceSubmit() {
    if (!selectedAnswer) return
    submitAnswer(selectedAnswer)
  }

  function handleTypedSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!typedAnswer.trim()) return
    submitAnswer(typedAnswer.trim())
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="text-4xl animate-bounce">⚔️</div>
          <p className="text-white/50 font-semibold">Loading battle...</p>
        </div>
      </div>
    )
  }

  if (notFound || !battle) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="text-5xl">😵</div>
          <p className="font-bold text-white">Battle not found.</p>
          <button onClick={() => router.push('/friends')} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold transition">
            Back to Friends
          </button>
        </div>
      </div>
    )
  }

  if (!me || me.status !== 'accepted') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="text-5xl">🚫</div>
          <p className="font-bold text-white">You're not part of this battle.</p>
          <button onClick={() => router.push('/friends')} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold transition">
            Back to Friends
          </button>
        </div>
      </div>
    )
  }

  // Countdown before start
  if (startsInMs > 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="text-6xl font-black text-white animate-pulse">{Math.ceil(startsInMs / 1000)}</div>
          <p className="text-white/50 font-semibold">Get ready...</p>
          <p className="text-xs text-white/30 capitalize">{battle.subject} · Grade {battle.grade_level}</p>
        </div>
      </div>
    )
  }

  const myTeamMates = participants.filter(p => p.status === 'accepted' && p.team_number === me.team_number)

  if (gameOver) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="rounded-3xl p-8 max-w-sm w-full text-center space-y-5 bg-white/5 border border-white/10 shadow-2xl">
          <div className="text-6xl">{winningTeam ? (winningTeam === me.team_number ? '🏆' : '😤') : '🤝'}</div>
          <h1 className="text-2xl font-black text-white">
            {winningTeam ? (winningTeam === me.team_number ? 'Your Team Won!' : `Team ${winningTeam} Wins!`) : "It's a Draw!"}
          </h1>
          <div className="flex justify-center gap-6">
            {teamNumbers.map(t => (
              <div key={t}>
                <p className={cn('text-4xl font-black', t === winningTeam ? 'text-yellow-400' : 'text-white/70')}>{scores[t] ?? 0}</p>
                <p className="text-xs text-white/40">Team {t}</p>
              </div>
            ))}
          </div>
          <button onClick={() => router.push('/friends')} className="w-full py-3 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-black text-sm hover:opacity-90 transition">
            Back to Friends
          </button>
        </div>
      </div>
    )
  }

  const q = questions[qIndex]
  const questionSeconds = getEffectiveSeconds(q?.question_text ?? '', battle.seconds_per_question)
  const schedule = computeQuestionSchedule(battle, answers, participants, questions.length, questionTexts)
  const endTime = schedule[qIndex] ?? now()
  const timeLeft = Math.max(0, Math.ceil((endTime - now()) / 1000))
  const alreadyAnswered = answeredIndex === qIndex

  return (
    <div className="max-w-lg mx-auto p-4 space-y-4 pb-8">
      {/* Header: scoreboard */}
      <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
        <div className="flex gap-4">
          {teamNumbers.map(t => (
            <div key={t} className="text-center">
              <p className={cn('text-xl font-black', t === me.team_number ? 'text-violet-300' : 'text-white/60')}>{scores[t] ?? 0}</p>
              <p className="text-[10px] text-white/40">Team {t}{t === me.team_number && ' (you)'}</p>
            </div>
          ))}
        </div>
        <div className="text-right">
          <p className="text-xs text-white/40">Q {qIndex + 1}</p>
          <p className={cn('text-lg font-black', timeLeft <= 3 ? 'text-red-400 animate-pulse' : 'text-white')}>{timeLeft}s</p>
        </div>
      </div>

      {/* Teammates */}
      {myTeamMates.length > 1 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {myTeamMates.map(p => (
            <div key={p.id} className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-full pl-1 pr-2 py-0.5">
              <UserAvatar username={p.username ?? '?'} avatarUrl={p.avatar_url} frameId={p.equipped_frame} size="sm" />
              <span className="text-[10px] font-semibold text-white/70">{p.username}</span>
            </div>
          ))}
        </div>
      )}

      {/* Timer bar */}
      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-1000', timeLeft <= 3 ? 'bg-red-500' : 'bg-violet-500')}
          style={{ width: `${(timeLeft / questionSeconds) * 100}%` }}
        />
      </div>

      {/* Question */}
      {q && (
        <div className="rounded-3xl bg-white/5 border border-white/10 p-5">
          <p className="text-white font-bold text-base leading-relaxed mb-4">{q.question_text}</p>

          {q.type === 'multiple_choice' && q.options ? (
            <div className="grid gap-2.5">
              {(() => {
                const opts = q.options as string[]
                const displayOpts = clipOptionDisplay(opts)
                return opts.map((opt, i) => (
                  <button
                    key={opt}
                    disabled={alreadyAnswered}
                    onClick={() => setSelectedAnswer(opt)}
                    className={cn(
                      'w-full text-left px-4 py-3 rounded-2xl border-2 text-sm font-semibold transition-all',
                      selectedAnswer === opt ? 'border-violet-400 bg-violet-500/20 text-white' : 'border-white/10 bg-white/5 text-white/80 hover:border-white/20',
                      alreadyAnswered && 'opacity-60 cursor-not-allowed'
                    )}
                  >
                    {displayOpts[i]}
                  </button>
                ))
              })()}
              {!alreadyAnswered && selectedAnswer && (
                <button onClick={handleChoiceSubmit} className="w-full mt-1 py-3 rounded-2xl font-black text-white text-sm bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:opacity-90 transition">
                  Submit Answer ✓
                </button>
              )}
            </div>
          ) : (
            <form onSubmit={handleTypedSubmit} className="space-y-2">
              <input
                value={typedAnswer}
                onChange={e => setTypedAnswer(e.target.value)}
                disabled={alreadyAnswered}
                placeholder="Type your answer..."
                className="w-full px-4 py-3 rounded-2xl border-2 border-white/10 bg-white/5 text-white placeholder:text-white/30 text-sm font-semibold outline-none focus:border-violet-400 transition"
                autoFocus
              />
              {!alreadyAnswered && (
                <button type="submit" className="w-full py-3 rounded-2xl font-black text-white text-sm bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:opacity-90 transition">
                  Submit ↵
                </button>
              )}
            </form>
          )}

          {alreadyAnswered && (
            <p className="text-center text-xs text-white/40 mt-3">Answer locked in — waiting for the next question...</p>
          )}
        </div>
      )}
    </div>
  )
}
