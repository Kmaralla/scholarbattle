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

  // Real-time: listen for opponent answers (multiplayer)
  // One persistent channel for the whole battle — store ref so handleSubmit can send on it
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
    setTimeout(() => {
      if (nextIndex >= TOTAL_QUESTIONS || nextIndex >= questions.length) {
        onComplete(myScoreRef.current, opponentScoreRef.current)
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
    <div className="flex flex-col h-full max-w-lg mx-auto p-4 gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="text-center">
          <p className="font-bold text-gray-900 text-sm truncate max-w-[90px]">{currentUser.username}</p>
          <p className="text-3xl font-black text-indigo-600">{myScore}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-500 capitalize">{subject} · {gradeLabel(gradeLevel)}</p>
          <p className="text-sm font-semibold text-gray-700">Q {qIndex + 1}/{Math.min(TOTAL_QUESTIONS, questions.length)}</p>
          <p className={cn('text-2xl font-black', timeLeft <= 5 ? 'text-red-500 animate-pulse' : 'text-gray-700')}>{timeLeft}s</p>
        </div>
        <div className="text-center">
          <p className="font-bold text-gray-900 text-sm truncate max-w-[90px]">{opponent.username}</p>
          <p className="text-3xl font-black text-orange-500">{opponentScore}</p>
          {isSolo && botAnsweredFirst && (
            <p className={cn('text-xs font-semibold', botWasCorrect ? 'text-green-500' : 'text-red-400')}>
              {botWasCorrect ? '✓ got it first!' : '✗ wrong'}
            </p>
          )}
        </div>
      </div>

      {/* Timer bar */}
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-1000', timeLeft <= 5 ? 'bg-red-400' : 'bg-indigo-500')}
          style={{ width: `${timerPct}%` }}
        />
      </div>

      {/* Bot answered first banner */}
      {isSolo && botAnsweredFirst && !showResult && (
        <div className={cn('text-center text-xs font-bold py-1.5 rounded-xl', botWasCorrect ? 'bg-orange-50 text-orange-600' : 'bg-gray-50 text-gray-500')}>
          {botWasCorrect ? '⚡ Scholar Bot answered first — still answer for practice!' : '🤖 Scholar Bot answered wrong — your turn to steal the point!'}
        </div>
      )}

      {/* Question */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex-1">
        <p className="text-gray-900 font-semibold text-base leading-snug mb-4">{q.question_text}</p>

        {q.type === 'multiple_choice' && q.options && (
          <div className="grid gap-2">
            {q.options.map(opt => {
              const isSelected = selectedAnswer === opt
              const correct = showResult && opt === q.correct_answer
              const wrong = showResult && isSelected && opt !== q.correct_answer
              return (
                <button
                  key={opt}
                  disabled={answered}
                  onClick={() => handleChoice(opt)}
                  className={cn(
                    'w-full text-left px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all',
                    !answered && 'hover:border-indigo-400 hover:bg-indigo-50',
                    !showResult && isSelected && 'border-indigo-500 bg-indigo-50',
                    correct && 'border-green-500 bg-green-50 text-green-800',
                    wrong && 'border-red-400 bg-red-50 text-red-700',
                    !correct && !wrong && !isSelected && 'border-gray-200 text-gray-700'
                  )}
                >
                  {opt}
                  {correct && ' ✓'}
                  {wrong && ' ✗'}
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
                'w-full px-4 py-3 rounded-xl border-2 text-sm font-medium outline-none transition-all',
                showResult
                  ? myAnswerCorrect ? 'border-green-500 bg-green-50' : 'border-red-400 bg-red-50'
                  : 'border-gray-200 focus:border-indigo-400'
              )}
              autoFocus
            />
            {!answered && (
              <button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold text-sm">
                Submit ↵
              </button>
            )}
            {showResult && (
              <p className="text-sm text-center font-semibold text-gray-600">
                Correct answer: <span className="text-green-700">{q.correct_answer}</span>
              </p>
            )}
          </form>
        )}

        {/* Result feedback */}
        {showResult && answered && (
          <div className={cn('mt-3 text-center text-sm font-bold py-2 rounded-xl',
            myAnswerCorrect && !botAlreadyScored ? 'bg-green-50 text-green-700' :
            myAnswerCorrect && botAlreadyScored ? 'bg-yellow-50 text-yellow-700' :
            'bg-red-50 text-red-600'
          )}>
            {myAnswerCorrect && !botAlreadyScored && '⚡ You got it first! +1 point'}
            {myAnswerCorrect && botAlreadyScored && '✓ Correct — but Scholar Bot was faster'}
            {!myAnswerCorrect && `✗ Correct answer: ${q.correct_answer}`}
          </div>
        )}
      </div>

      {/* Bot thinking */}
      {isSolo && !botAnsweredFirst && !answered && (
        <p className="text-xs text-center text-gray-400 animate-pulse">
          🤖 Scholar Bot is thinking...
        </p>
      )}
      {!isSolo && !answered && (
        <p className="text-xs text-center text-gray-400">
          ⚡ First correct answer wins the point!
        </p>
      )}
    </div>
  )
}
