'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Question, User, Subject } from '@/types'
import { cn } from '@/lib/utils'
import { gradeLabel } from '@/lib/utils'

const SECONDS_PER_QUESTION = 15
const TOTAL_QUESTIONS = 10

export type BotDifficulty = 'easy' | 'medium' | 'hard'

// First correct answer wins the point — bot speed & accuracy by difficulty
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
  onComplete: (myScore: number, opponentScore: number) => void
}

export function BattleRoom({ battleId, questions, currentUser, opponent, isSolo, botDifficulty = 'medium', subject, gradeLevel, onComplete }: BattleRoomProps) {
  const [qIndex, setQIndex] = useState(0)
  const [myScore, setMyScore] = useState(0)
  const [opponentScore, setOpponentScore] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [typedAnswer, setTypedAnswer] = useState('')
  const [timeLeft, setTimeLeft] = useState(SECONDS_PER_QUESTION)
  const [answered, setAnswered] = useState(false)
  const [botAnsweredFirst, setBotAnsweredFirst] = useState(false)   // bot fired before player
  const [botWasCorrect, setBotWasCorrect] = useState<boolean | null>(null)
  const [showResult, setShowResult] = useState(false)
  const startTime = useRef(Date.now())
  const botTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const answeredRef = useRef(false)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const supabase = createClient()
  const q = questions[qIndex]
  const myScoreRef = useRef(myScore)
  const opponentScoreRef = useRef(opponentScore)
  myScoreRef.current = myScore
  opponentScoreRef.current = opponentScore

  // Bot: schedule answer for this question
  useEffect(() => {
    if (!isSolo || !q) return
    answeredRef.current = false
    setBotAnsweredFirst(false)
    setBotWasCorrect(null)

    const { minDelay, maxDelay, accuracy } = BOT_PROFILES[botDifficulty]
    const delay = minDelay + Math.random() * (maxDelay - minDelay)
    const isCorrect = Math.random() < accuracy

    botTimerRef.current = setTimeout(() => {
      if (answeredRef.current) return   // player already answered — bot too late

      // Bot answers first
      setBotAnsweredFirst(true)
      setBotWasCorrect(isCorrect)
      if (isCorrect) {
        setOpponentScore(s => s + 1)
        opponentScoreRef.current += 1
      }
    }, delay)

    return () => { if (botTimerRef.current) clearTimeout(botTimerRef.current) }
  }, [qIndex, isSolo, botDifficulty])

  // Real-time: one persistent channel for the whole battle
  useEffect(() => {
    if (isSolo) return
    const channel = supabase.channel(`battle:${battleId}`, { config: { broadcast: { self: false } } })
    channelRef.current = channel
    channel
      .on('broadcast', { event: 'answer' }, ({ payload }) => {
        if (payload.user_id !== currentUser.id && payload.is_correct) {
          setOpponentScore(s => s + 1)
          opponentScoreRef.current += 1
        }
      })
      .on('broadcast', { event: 'battle_done' }, ({ payload }) => {
        // Opponent finished all their questions — end our game too
        if (payload.user_id !== currentUser.id) {
          onComplete(myScoreRef.current, opponentScoreRef.current)
        }
      })
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
      channelRef.current = null
    }
  }, [battleId, currentUser.id, isSolo])

  // Timer
  useEffect(() => {
    if (answered) return
    if (timeLeft <= 0) { handleSubmit(null); return }
    const t = setTimeout(() => setTimeLeft(s => s - 1), 1000)
    return () => clearTimeout(t)
  }, [timeLeft, answered])

  // Reset per question
  useEffect(() => {
    setTimeLeft(SECONDS_PER_QUESTION)
    setAnswered(false)
    setBotAnsweredFirst(false)
    setBotWasCorrect(null)
    setSelectedAnswer(null)
    setTypedAnswer('')
    setShowResult(false)
    startTime.current = Date.now()
    answeredRef.current = false
  }, [qIndex])

  const handleSubmit = useCallback(async (answer: string | null) => {
    if (answeredRef.current) return
    answeredRef.current = true
    if (botTimerRef.current) clearTimeout(botTimerRef.current)
    setAnswered(true)

    const isCorrect = answer?.trim().toLowerCase() === q.correct_answer.trim().toLowerCase()
    const timeTaken = Date.now() - startTime.current

    // Point rule: you only score if correct AND bot hasn't already scored this question
    const botAlreadyScored = botAnsweredFirst && botWasCorrect
    if (isCorrect && !botAlreadyScored) {
      setMyScore(s => s + 1)
      myScoreRef.current += 1
    }

    // For solo: if bot hasn't answered yet, resolve it now (too slow)
    if (isSolo && !botAnsweredFirst) {
      const { accuracy } = BOT_PROFILES[botDifficulty]
      const botCorrect = Math.random() < accuracy
      setBotWasCorrect(botCorrect)
      // Bot didn't answer in time — no point for bot on this one (player was faster)
    }

    if (!isSolo && channelRef.current) {
      await channelRef.current.send({
        type: 'broadcast',
        event: 'answer',
        payload: { user_id: currentUser.id, is_correct: isCorrect, q_index: qIndex },
      })
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

    const nextIndex = qIndex + 1
    const isLastQuestion = nextIndex >= TOTAL_QUESTIONS || nextIndex >= questions.length

    // Compute final scores directly — don't rely on async state
    const finalMyScore = myScoreRef.current
    const finalOpponentScore = opponentScoreRef.current

    if (!isSolo && isLastQuestion && channelRef.current) {
      await channelRef.current.send({
        type: 'broadcast',
        event: 'battle_done',
        payload: { user_id: currentUser.id },
      })
    }

    setTimeout(() => {
      if (isLastQuestion) {
        onComplete(finalMyScore, finalOpponentScore)
      } else {
        setQIndex(nextIndex)
      }
    }, 1800)
  }, [answeredRef, q, qIndex, botAnsweredFirst, botWasCorrect, isSolo, botDifficulty, questions.length])

  const handleChoice = (option: string) => {
    setSelectedAnswer(option)
    handleSubmit(option)
  }

  const handleTypedSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    handleSubmit(typedAnswer)
  }

  if (!q) return null

  const timerPct = (timeLeft / SECONDS_PER_QUESTION) * 100
  const myAnswerCorrect = selectedAnswer
    ? selectedAnswer.toLowerCase() === q.correct_answer.toLowerCase()
    : typedAnswer.toLowerCase() === q.correct_answer.toLowerCase()
  const botAlreadyScored = botAnsweredFirst && botWasCorrect

  return (
    <div className="flex flex-col min-h-screen max-w-lg mx-auto p-4 gap-4 bg-slate-700">
      {/* Header scoreboard */}
      <div className="flex items-center justify-between bg-slate-600 rounded-3xl px-4 py-3">
        <div className="text-center min-w-[80px]">
          <p className="font-semibold text-slate-300 text-xs truncate">{currentUser.username}</p>
          <p className="text-4xl font-black text-indigo-300">{myScore}</p>
        </div>
        <div className="text-center flex-1 px-2">
          <p className="text-xs text-slate-400 capitalize mb-0.5">{subject} · {gradeLabel(gradeLevel)}</p>
          <p className={cn('text-3xl font-black transition-colors', timeLeft <= 5 ? 'text-red-400 animate-pulse' : 'text-slate-100')}>{timeLeft}s</p>
          <p className="text-xs text-slate-400 mt-0.5">Q {qIndex + 1} of {Math.min(TOTAL_QUESTIONS, questions.length)}</p>
        </div>
        <div className="text-center min-w-[80px]">
          <p className="font-semibold text-slate-300 text-xs truncate">{opponent.username}</p>
          <p className="text-4xl font-black text-orange-300">{opponentScore}</p>
          {isSolo && botAnsweredFirst && (
            <p className={cn('text-xs font-bold', botWasCorrect ? 'text-green-400' : 'text-slate-400')}>
              {botWasCorrect ? '⚡ fast!' : '✗ wrong'}
            </p>
          )}
        </div>
      </div>

      {/* Timer bar */}
      <div className="h-2 bg-slate-600 rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-1000', timeLeft <= 5 ? 'bg-red-400' : 'bg-indigo-400')}
          style={{ width: `${timerPct}%` }}
        />
      </div>

      {/* Bot answered first banner */}
      {isSolo && botAnsweredFirst && !showResult && (
        <div className={cn('text-center text-xs font-semibold py-2 rounded-2xl', botWasCorrect ? 'bg-orange-900/40 text-orange-300' : 'bg-slate-600 text-slate-300')}>
          {botWasCorrect ? '⚡ Scholar Bot answered first — still try for practice!' : '🤖 Scholar Bot got it wrong — steal the point!'}
        </div>
      )}

      {/* Question card */}
      <div className="rounded-3xl bg-slate-600 p-5 flex-1">
        <p className="text-slate-50 font-bold text-base leading-relaxed mb-5">{q.question_text}</p>

        {q.type === 'multiple_choice' && q.options && (
          <div className="grid gap-2.5">
            {q.options.map((opt, i) => {
              const isSelected = selectedAnswer === opt
              const correct = showResult && opt === q.correct_answer
              const wrong = showResult && isSelected && opt !== q.correct_answer
              const labels = ['A', 'B', 'C', 'D']
              const labelColors = ['bg-indigo-500/40 text-indigo-200', 'bg-violet-500/40 text-violet-200', 'bg-sky-500/40 text-sky-200', 'bg-pink-500/40 text-pink-200']
              return (
                <button
                  key={opt}
                  disabled={answered}
                  onClick={() => handleChoice(opt)}
                  className={cn(
                    'w-full text-left px-4 py-3 rounded-2xl border text-sm font-semibold transition-all flex items-center gap-3',
                    !answered && !isSelected && 'border-slate-500 bg-slate-500/50 text-slate-100 hover:border-indigo-400 hover:bg-indigo-900/30',
                    !showResult && isSelected && 'border-indigo-400 bg-indigo-800/50 text-indigo-100',
                    correct && 'border-green-500 bg-green-900/50 text-green-200',
                    wrong && 'border-red-400 bg-red-900/40 text-red-200',
                    !correct && !wrong && !isSelected && answered && 'border-slate-600 bg-slate-600/30 text-slate-400'
                  )}
                >
                  <span className={cn('w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black flex-shrink-0',
                    correct ? 'bg-green-500 text-white' : wrong ? 'bg-red-500 text-white' : isSelected ? 'bg-indigo-500 text-white' : labelColors[i]
                  )}>{labels[i]}</span>
                  <span>{opt}</span>
                  {correct && <span className="ml-auto text-green-400 font-black">✓</span>}
                  {wrong && <span className="ml-auto text-red-400 font-black">✗</span>}
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
                'w-full px-4 py-3 rounded-2xl border text-sm font-semibold outline-none transition-all bg-slate-500/50 text-slate-100 placeholder:text-slate-400',
                showResult
                  ? myAnswerCorrect ? 'border-green-500 bg-green-900/40' : 'border-red-400 bg-red-900/30'
                  : 'border-slate-500 focus:border-indigo-400'
              )}
              autoFocus
            />
            {!answered && (
              <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-2xl font-bold transition">
                Submit ↵
              </button>
            )}
            {showResult && (
              <p className="text-sm text-center font-semibold text-slate-300">
                Correct answer: <span className="text-green-400 font-bold">{q.correct_answer}</span>
              </p>
            )}
          </form>
        )}

        {/* Result feedback */}
        {showResult && answered && (
          <div className={cn('mt-4 text-center text-sm font-semibold py-2.5 rounded-2xl',
            myAnswerCorrect && !botAlreadyScored ? 'bg-green-900/50 text-green-300' :
            myAnswerCorrect && botAlreadyScored ? 'bg-orange-900/40 text-orange-300' :
            'bg-slate-700 text-slate-400'
          )}>
            {myAnswerCorrect && !botAlreadyScored && '⚡ You got it first! +1 point'}
            {myAnswerCorrect && botAlreadyScored && '✓ Correct — but Scholar Bot was faster'}
            {!myAnswerCorrect && `✗ Correct answer: ${q.correct_answer}`}
          </div>
        )}
      </div>

      {/* Bot thinking */}
      {isSolo && !botAnsweredFirst && !answered && (
        <p className="text-xs text-center text-slate-400 animate-pulse">
          🤖 Scholar Bot is thinking...
        </p>
      )}
      {!isSolo && !answered && (
        <p className="text-xs text-center text-slate-400">
          ⚡ First correct answer wins the point!
        </p>
      )}
    </div>
  )
}
