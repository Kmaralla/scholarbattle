'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Question, User, Subject } from '@/types'
import { cn } from '@/lib/utils'
import { gradeLabel } from '@/lib/utils'
import { sounds } from '@/lib/sounds'

const SECONDS_PER_QUESTION = 15
const TOTAL_QUESTIONS = 10

export type BotDifficulty = 'easy' | 'medium' | 'hard'

const BOT_PROFILES: Record<BotDifficulty, { minDelay: number; maxDelay: number; accuracy: number; label: string }> = {
  easy:   { minDelay: 7000, maxDelay: 13000, accuracy: 0.45, label: '🟢 Easy'   },
  medium: { minDelay: 3500, maxDelay: 8000,  accuracy: 0.65, label: '🟡 Medium' },
  hard:   { minDelay: 1000, maxDelay: 4000,  accuracy: 0.85, label: '🔴 Hard'   },
}

interface BattleRoomProps {
  battleId: string
  questions: Question[]
  currentUser: User
  opponent: User
  isSolo: boolean
  botDifficulty?: BotDifficulty
  subject: Subject
  gradeLevel: number
  onComplete: (myScore: number, opponentScore: number, results: QuestionResult[]) => void
}

export interface QuestionResult {
  question: Question
  userAnswer: string | null
  isCorrect: boolean
}

export function BattleRoom({ battleId, questions, currentUser, opponent, isSolo, botDifficulty = 'medium', subject, gradeLevel, onComplete }: BattleRoomProps) {
  const supabase = createClient()

  // ── Scores ──────────────────────────────────────────────────────────────────
  const [myScore,       setMyScore]       = useState(0)
  const [opponentScore, setOpponentScore] = useState(0)
  const myScoreRef       = useRef(0)
  const opponentScoreRef = useRef(0)

  // ── Question index ───────────────────────────────────────────────────────────
  const [qIndex, setQIndex] = useState(0)
  const qIndexRef = useRef(0)

  // ── Per-question player state ────────────────────────────────────────────────
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [typedAnswer,    setTypedAnswer]    = useState('')
  const [answered,       setAnswered]       = useState(false)   // I answered
  const [myCorrect,      setMyCorrect]      = useState(false)
  const [showResult,     setShowResult]     = useState(false)

  // ── Per-question opponent state (PvP) ────────────────────────────────────────
  const [opponentAnswered, setOpponentAnswered] = useState(false)
  const [opponentCorrect,  setOpponentCorrect]  = useState(false)

  // Refs so callbacks always see current values without stale closure issues
  const answeredRef          = useRef(false)
  const myCorrectRef         = useRef(false)
  const opponentAnsweredRef  = useRef(false)
  const opponentCorrectRef   = useRef(false)
  const advanceScheduledRef  = useRef(false)
  const timeoutFallbackRef   = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Misc ────────────────────────────────────────────────────────────────────
  const [timeLeft,       setTimeLeft]       = useState(SECONDS_PER_QUESTION)
  const [botAnsweredFirst, setBotAnsweredFirst] = useState(false)
  const [botWasCorrect,    setBotWasCorrect]    = useState<boolean | null>(null)
  const startTime        = useRef(Date.now())
  const botTimerRef      = useRef<ReturnType<typeof setTimeout> | null>(null)
  const advanceTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const channelRef       = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const resultsRef       = useRef<QuestionResult[]>([])

  const [shuffledOptions, setShuffledOptions] = useState<string[]>([])

  const q = questions[qIndex]

  // ── Reset per question ───────────────────────────────────────────────────────
  useEffect(() => {
    setTimeLeft(SECONDS_PER_QUESTION)
    setAnswered(false);        answeredRef.current         = false
    setMyCorrect(false);       myCorrectRef.current        = false
    setOpponentAnswered(false); opponentAnsweredRef.current = false
    setOpponentCorrect(false);  opponentCorrectRef.current  = false
    advanceScheduledRef.current = false
    setSelectedAnswer(null)
    setTypedAnswer('')
    setShowResult(false)
    setBotAnsweredFirst(false)
    setBotWasCorrect(null)
    startTime.current = Date.now()
    if (advanceTimerRef.current)   { clearTimeout(advanceTimerRef.current);   advanceTimerRef.current   = null }
    if (timeoutFallbackRef.current){ clearTimeout(timeoutFallbackRef.current); timeoutFallbackRef.current = null }
  }, [qIndex])

  // ── Shuffle options ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (q?.options) {
      const opts = [...q.options]
      for (let i = opts.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [opts[i], opts[j]] = [opts[j], opts[i]]
      }
      setShuffledOptions(opts)
    }
  }, [qIndex])

  // ── Advance logic (PvP): advance when someone correct OR both answered ───────
  const scheduleAdvance = useCallback(() => {
    if (advanceScheduledRef.current) return
    advanceScheduledRef.current = true
    advanceTimerRef.current = setTimeout(() => {
      const next = qIndexRef.current + 1
      const isLast = next >= TOTAL_QUESTIONS || next >= questions.length
      if (isLast) {
        onComplete(myScoreRef.current, opponentScoreRef.current, resultsRef.current)
      } else {
        qIndexRef.current = next
        setQIndex(next)
      }
    }, 1800)
  }, [questions.length, onComplete])

  const checkAdvance = useCallback((myDone: boolean, myOk: boolean, oppDone: boolean, oppOk: boolean) => {
    if (!isSolo && (myOk || oppOk || (myDone && oppDone))) {
      scheduleAdvance()
    }
  }, [isSolo, scheduleAdvance])

  // ── Bot logic (solo) ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isSolo || !q) return
    const { minDelay, maxDelay, accuracy } = BOT_PROFILES[botDifficulty]
    const delay = minDelay + Math.random() * (maxDelay - minDelay)
    const isCorrect = Math.random() < accuracy

    botTimerRef.current = setTimeout(() => {
      if (answeredRef.current) return
      setBotAnsweredFirst(true)
      setBotWasCorrect(isCorrect)
      if (isCorrect) {
        setOpponentScore(s => s + 1)
        opponentScoreRef.current += 1
      }
    }, delay)

    return () => { if (botTimerRef.current) clearTimeout(botTimerRef.current) }
  }, [qIndex, isSolo, botDifficulty])

  // ── PvP real-time channel ────────────────────────────────────────────────────
  useEffect(() => {
    if (isSolo) return
    const channel = supabase.channel(`battle:${battleId}`, { config: { broadcast: { self: false } } })
    channelRef.current = channel

    channel
      // q_result: opponent answered — update score + check advance
      .on('broadcast', { event: 'q_result' }, ({ payload }) => {
        if (payload.user_id === currentUser.id) return
        // Guard: ignore stale events from a previous question
        if (payload.q_index !== qIndexRef.current) return

        if (payload.is_correct) {
          setOpponentScore(s => { const v = s + 1; opponentScoreRef.current = v; return v })
        }
        opponentAnsweredRef.current = true
        opponentCorrectRef.current  = payload.is_correct
        setOpponentAnswered(true)
        setOpponentCorrect(payload.is_correct)
        if (timeoutFallbackRef.current) { clearTimeout(timeoutFallbackRef.current); timeoutFallbackRef.current = null }
        checkAdvance(answeredRef.current, myCorrectRef.current, true, payload.is_correct)
      })
      .subscribe()

    return () => { supabase.removeChannel(channel); channelRef.current = null }
  }, [battleId, currentUser.id, isSolo, checkAdvance])

  // ── Timer ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (answered) return
    if (timeLeft <= 0) { handleSubmit(null); return }
    if (timeLeft <= 5) sounds.countdown()
    const t = setTimeout(() => setTimeLeft(s => s - 1), 1000)
    return () => clearTimeout(t)
  }, [timeLeft, answered])

  // ── Submit answer ────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async (answer: string | null) => {
    if (answeredRef.current) return
    answeredRef.current = true

    if (botTimerRef.current) clearTimeout(botTimerRef.current)
    setAnswered(true)

    const isCorrect = !!answer && answer.trim().toLowerCase() === q.correct_answer.trim().toLowerCase()
    const timeTaken = Date.now() - startTime.current

    myCorrectRef.current = isCorrect
    setMyCorrect(isCorrect)
    resultsRef.current.push({ question: q, userAnswer: answer, isCorrect })

    if (isCorrect) sounds.correct()
    else if (answer !== null) sounds.wrong()

    // Solo scoring
    if (isSolo) {
      const botAlreadyScored = botAnsweredFirst && botWasCorrect
      if (isCorrect && !botAlreadyScored) {
        setMyScore(s => { const v = s + 1; myScoreRef.current = v; return v })
      }
      if (!botAnsweredFirst) {
        const { accuracy } = BOT_PROFILES[botDifficulty]
        const botCorrect = Math.random() < accuracy
        setBotWasCorrect(botCorrect)
      }
    } else {
      // PvP scoring: I get the point if correct
      if (isCorrect) {
        setMyScore(s => { const v = s + 1; myScoreRef.current = v; return v })
      }
      // Broadcast to opponent
      if (channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'q_result',
          payload: { user_id: currentUser.id, q_index: qIndexRef.current, is_correct: isCorrect },
        })
      }
    }

    await supabase.from('battle_answers').insert({
      battle_id: battleId,
      user_id: currentUser.id,
      question_id: q.id,
      answer: answer ?? '',
      is_correct: isCorrect,
      time_ms: timeTaken,
    })

    setShowResult(true)

    // Check advance (PvP) or proceed (solo)
    if (!isSolo) {
      checkAdvance(true, isCorrect, opponentAnsweredRef.current, opponentCorrectRef.current)
      // Fallback: if opponent never broadcasts (timeout drift / network), advance after 4s
      if (!isCorrect && !opponentAnsweredRef.current) {
        timeoutFallbackRef.current = setTimeout(() => {
          if (!advanceScheduledRef.current) {
            scheduleAdvance()
          }
        }, 4000)
      }
    }
  }, [q, qIndex, botAnsweredFirst, botWasCorrect, isSolo, botDifficulty, checkAdvance])

  // ── Solo: manual Next ────────────────────────────────────────────────────────
  const handleNext = () => {
    const next = qIndex + 1
    const isLast = next >= TOTAL_QUESTIONS || next >= questions.length
    if (isLast) {
      onComplete(myScoreRef.current, opponentScoreRef.current, resultsRef.current)
    } else {
      qIndexRef.current = next
      setQIndex(next)
    }
  }

  const handleChoice      = (opt: string) => { if (!answered) setSelectedAnswer(opt) }
  const handleChoiceSubmit = () => { if (selectedAnswer && !answered) handleSubmit(selectedAnswer) }
  const handleTypedSubmit  = (e: React.FormEvent) => { e.preventDefault(); handleSubmit(typedAnswer) }

  if (!q) return null

  const timerPct       = (timeLeft / SECONDS_PER_QUESTION) * 100
  const myAnswerCorrect = (selectedAnswer || typedAnswer)
    ? (selectedAnswer ?? typedAnswer).toLowerCase() === q.correct_answer.toLowerCase()
    : false
  const botAlreadyScored = botAnsweredFirst && botWasCorrect

  // In PvP: waiting means I answered wrong and opponent hasn't answered yet
  const waitingForOpponent = !isSolo && answered && !myCorrect && !opponentAnswered && !advanceScheduledRef.current

  return (
    <div className="flex flex-col min-h-screen max-w-lg mx-auto p-4 gap-4 bg-[var(--bg-base)]">
      {/* Scoreboard */}
      <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-3xl px-4 py-3">
        <div className="text-center min-w-[80px]">
          <p className="font-semibold text-white/50 text-xs truncate">{currentUser.username}</p>
          <p className="text-4xl font-black text-white">{myScore}</p>
        </div>
        <div className="text-center flex-1 px-2">
          <p className="text-xs text-white/40 capitalize mb-0.5">{subject} · {gradeLabel(gradeLevel)}</p>
          <p className={cn('text-3xl font-black transition-colors', timeLeft <= 5 ? 'text-red-400 animate-pulse' : 'text-white')}>{timeLeft}s</p>
          <p className="text-xs text-white/40 mt-0.5">Q {qIndex + 1} of {Math.min(TOTAL_QUESTIONS, questions.length)}</p>
        </div>
        <div className="text-center min-w-[80px]">
          <p className="font-semibold text-white/50 text-xs truncate">{opponent.username}</p>
          <p className="text-4xl font-black text-white/80">{opponentScore}</p>
          {!isSolo && opponentAnswered && (
            <p className={cn('text-xs font-bold', opponentCorrect ? 'text-green-400' : 'text-white/30')}>
              {opponentCorrect ? '✓ correct' : '✗ wrong'}
            </p>
          )}
          {isSolo && botAnsweredFirst && (
            <p className={cn('text-xs font-bold', botWasCorrect ? 'text-green-400' : 'text-white/30')}>
              {botWasCorrect ? '⚡ fast!' : '✗ wrong'}
            </p>
          )}
        </div>
      </div>

      {/* Timer bar */}
      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-1000', timeLeft <= 5 ? 'bg-red-500/70' : 'bg-white/40')}
          style={{ width: `${timerPct}%` }}
        />
      </div>

      {/* Status banners */}
      {isSolo && botAnsweredFirst && !showResult && (
        <div className={cn('text-center text-xs font-semibold py-2 rounded-2xl', botWasCorrect ? 'bg-white/5 border border-orange-700/30 text-orange-300/80' : 'bg-white/5 border border-white/10 text-white/40')}>
          {botWasCorrect ? '⚡ Scholar Bot answered first — still try for practice!' : '🤖 Scholar Bot got it wrong — steal the point!'}
        </div>
      )}
      {!isSolo && waitingForOpponent && (
        <div className="text-center text-xs font-semibold py-2.5 rounded-2xl bg-yellow-500/10 border border-yellow-400/20 text-yellow-300/80 flex items-center justify-center gap-2">
          <span className="animate-pulse">⏳</span> Waiting for {opponent.username} to answer…
        </div>
      )}
      {!isSolo && answered && opponentAnswered && advanceScheduledRef.current && (
        <div className="text-center text-xs font-semibold py-2.5 rounded-2xl bg-indigo-500/10 border border-indigo-400/20 text-indigo-300">
          Next question coming up…
        </div>
      )}

      {/* Question card */}
      <div className="rounded-3xl bg-white/5 border border-white/10 p-5 flex-1">
        <p className="text-white font-bold text-base leading-relaxed mb-5">{q.question_text}</p>

        {q.type === 'multiple_choice' && shuffledOptions.length > 0 && (
          <div className="grid gap-2.5">
            {shuffledOptions.map((opt, i) => {
              const isSelected = selectedAnswer === opt
              const correct = showResult && opt === q.correct_answer
              const wrong   = showResult && isSelected && opt !== q.correct_answer
              const labels = ['A', 'B', 'C', 'D']
              return (
                <button
                  key={opt}
                  disabled={answered}
                  onClick={() => handleChoice(opt)}
                  className={cn(
                    'w-full text-left px-4 py-3 rounded-2xl border text-sm font-semibold transition-all flex items-center gap-3',
                    !answered && !isSelected && 'border-white/10 bg-white/5 text-white/90 hover:border-white/30 hover:bg-white/10',
                    !showResult && isSelected && 'border-white/40 bg-white/15 text-white',
                    correct && 'border-green-700/50 bg-green-900/30 text-green-300',
                    wrong   && 'border-red-700/50 bg-red-900/30 text-red-300',
                    !correct && !wrong && !isSelected && answered && 'border-slate-600 bg-slate-600/30 text-slate-400'
                  )}
                >
                  <span className={cn('w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black flex-shrink-0',
                    correct ? 'bg-green-700/60 text-green-200' : wrong ? 'bg-red-700/60 text-red-200' : isSelected ? 'bg-white/20 text-white' : 'bg-white/10 text-white/60'
                  )}>{labels[i]}</span>
                  <span>{opt}</span>
                  {correct && <span className="ml-auto text-green-400 font-black">✓</span>}
                  {wrong   && <span className="ml-auto text-red-400 font-black">✗</span>}
                </button>
              )
            })}
          </div>
        )}

        {q.type === 'typed' && (
          <form onSubmit={handleTypedSubmit} className="space-y-3">
            <input
              value={typedAnswer}
              onChange={e => setTypedAnswer(e.target.value)}
              disabled={answered}
              placeholder="Type your answer..."
              className={cn(
                'w-full px-4 py-3 rounded-2xl border text-sm font-semibold outline-none transition-all bg-white/5 text-white placeholder:text-white/30',
                showResult
                  ? myAnswerCorrect ? 'border-green-700/40 bg-green-900/20' : 'border-red-700/40 bg-red-900/20'
                  : 'border-white/10 focus:border-white/30'
              )}
              autoFocus
            />
            {!answered && (
              <button type="submit" className="w-full bg-white/10 hover:bg-white/20 text-white py-3 rounded-2xl font-bold transition border border-white/10">
                Submit ↵
              </button>
            )}
          </form>
        )}

        {/* Submit button for multiple choice */}
        {q.type === 'multiple_choice' && selectedAnswer && !answered && (
          <button
            onClick={handleChoiceSubmit}
            className="w-full mt-3 py-3.5 rounded-2xl font-black text-white bg-indigo-600 hover:bg-indigo-500 transition-all text-sm"
          >
            Submit Answer ✓
          </button>
        )}

        {/* Result feedback */}
        {showResult && (
          <div className={cn('mt-4 text-center text-sm font-semibold py-2.5 rounded-2xl',
            myAnswerCorrect && !botAlreadyScored ? 'bg-green-900/20 border border-green-700/20 text-green-400/80' :
            myAnswerCorrect && botAlreadyScored  ? 'bg-white/5 border border-white/10 text-white/50' :
            'bg-white/5 border border-white/10 text-white/40'
          )}>
            {myAnswerCorrect && !botAlreadyScored && isSolo  && '⚡ You got it first! +1 point'}
            {myAnswerCorrect && !botAlreadyScored && !isSolo && '⚡ Correct! +1 point'}
            {myAnswerCorrect && botAlreadyScored             && '✓ Correct — but Scholar Bot was faster'}
            {!myAnswerCorrect && `✗ Correct answer: ${q.correct_answer}`}
          </div>
        )}
      </div>

      {/* Hints */}
      {isSolo && !botAnsweredFirst && !answered && (
        <p className="text-xs text-center text-slate-400 animate-pulse">🤖 Scholar Bot is thinking…</p>
      )}
      {!isSolo && !answered && (
        <p className="text-xs text-center text-slate-400">⚡ First correct answer wins the point!</p>
      )}

      {/* Solo: manual Next button */}
      {isSolo && answered && showResult && (
        <button
          onClick={handleNext}
          className="w-full py-3.5 rounded-2xl font-black text-white text-sm bg-indigo-500/80 hover:bg-indigo-500 border border-indigo-400/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          {qIndex + 1 >= Math.min(TOTAL_QUESTIONS, questions.length) ? 'See Results 🏆' : 'Next →'}
        </button>
      )}
    </div>
  )
}
