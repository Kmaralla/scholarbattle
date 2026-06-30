'use client'
import { useState, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { getQuestionsForBattle } from '@/lib/questions'
import { Subject } from '@/types'
import type { Coach } from '@/app/(app)/training/page'

const TOTAL_QUESTIONS = 5
const SECONDS = 20

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

export function TrainingSession({
  coach,
  subject,
  grade,
  onBack,
}: {
  coach: Coach
  subject: Subject
  grade: number
  onBack: () => void
}) {
  const [questions] = useState(() =>
    getQuestionsForBattle(subject, grade, TOTAL_QUESTIONS).map((q, i) => ({ ...q, id: `q-${i}` }))
  )
  const [qIndex, setQIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [typedAnswer, setTypedAnswer] = useState('')
  const [answered, setAnswered] = useState(false)
  const [showResult, setShowResult] = useState(false)
  const [score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(SECONDS)
  const [coachMessage, setCoachMessage] = useState(coach.introLine)
  const [showCoachMessage, setShowCoachMessage] = useState(true)
  const [phase, setPhase] = useState<'intro' | 'question' | 'feedback' | 'done'>('intro')
  const [coachTipIdx] = useState(() => Math.floor(Math.random() * coach.tips.length))
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const q = questions[qIndex]

  // Start questions after intro
  useEffect(() => {
    if (phase === 'intro') {
      const t = setTimeout(() => setPhase('question'), 2500)
      return () => clearTimeout(t)
    }
  }, [phase])

  // Timer
  useEffect(() => {
    if (phase !== 'question' || answered) return
    setTimeLeft(SECONDS)
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current!)
          handleTimeout()
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current!)
  }, [qIndex, phase])

  function handleTimeout() {
    if (answered) return
    setAnswered(true)
    setShowResult(true)
    setCoachMessage(pick(coach.wrongLines))
    setShowCoachMessage(true)
    setTimeout(advance, 2800)
  }

  function handleChoice(opt: string) {
    if (answered) return
    clearInterval(timerRef.current!)
    setSelectedAnswer(opt)
    setAnswered(true)
    setShowResult(true)
    const correct = opt.toLowerCase() === q.correct_answer.toLowerCase()
    if (correct) setScore(s => s + 1)
    setCoachMessage(correct ? pick(coach.correctLines) : pick(coach.wrongLines))
    setShowCoachMessage(true)
    setTimeout(advance, 2500)
  }

  function handleTypedSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (answered || !typedAnswer.trim()) return
    clearInterval(timerRef.current!)
    setAnswered(true)
    setShowResult(true)
    const correct = typedAnswer.trim().toLowerCase() === q.correct_answer.toLowerCase()
    if (correct) setScore(s => s + 1)
    setCoachMessage(correct ? pick(coach.correctLines) : pick(coach.wrongLines))
    setShowCoachMessage(true)
    setTimeout(advance, 2500)
  }

  function advance() {
    if (qIndex + 1 >= TOTAL_QUESTIONS) {
      setPhase('done')
      return
    }
    setQIndex(i => i + 1)
    setSelectedAnswer(null)
    setTypedAnswer('')
    setAnswered(false)
    setShowResult(false)
    setShowCoachMessage(false)
    setPhase('question')
  }

  const timerPct = (timeLeft / SECONDS) * 100
  const myAnswerCorrect = selectedAnswer
    ? selectedAnswer.toLowerCase() === q?.correct_answer?.toLowerCase()
    : typedAnswer.toLowerCase() === q?.correct_answer?.toLowerCase()

  // Done screen
  if (phase === 'done') {
    const pct = Math.round((score / TOTAL_QUESTIONS) * 100)
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#0f0a1e]">
        <div className="max-w-sm w-full space-y-5 text-center">
          <div className={cn('w-20 h-20 rounded-3xl flex items-center justify-center text-5xl mx-auto shadow-2xl', `bg-gradient-to-br ${coach.gradient}`)}>
            {coach.emoji}
          </div>
          <div>
            <p className="text-white/50 text-sm font-semibold">{coach.name} says:</p>
            <p className="text-white font-bold text-base mt-1 leading-relaxed">
              "{coach.endLine(score, TOTAL_QUESTIONS)}"
            </p>
          </div>
          <div className={cn('rounded-3xl p-5 bg-gradient-to-br', coach.gradient)}>
            <p className="text-white/70 text-sm font-semibold">Session Score</p>
            <p className="text-6xl font-black text-white mt-1">{score}<span className="text-2xl text-white/60">/{TOTAL_QUESTIONS}</span></p>
            <div className="mt-3 h-3 bg-black/20 rounded-full overflow-hidden">
              <div className="h-full bg-white/70 rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
            </div>
            <p className="text-white/80 text-sm font-bold mt-1.5">{pct}% accuracy</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
            <p className="text-xs text-white/40 font-semibold mb-1">{coach.name}'s tip for next time:</p>
            <p className="text-sm text-white/80 italic">"{coach.tips[coachTipIdx]}"</p>
          </div>
          <div className="flex gap-3">
            <button onClick={onBack} className="flex-1 border border-white/20 rounded-2xl py-3 text-sm font-bold text-white/70 hover:bg-white/10 transition">
              Change Coach
            </button>
            <button
              onClick={() => {
                setQIndex(0); setScore(0); setSelectedAnswer(null)
                setTypedAnswer(''); setAnswered(false); setShowResult(false)
                setCoachMessage(coach.introLine); setShowCoachMessage(true)
                setPhase('intro')
              }}
              className={cn('flex-1 py-3 rounded-2xl text-sm font-black text-white shadow-lg transition hover:opacity-90', `bg-gradient-to-r ${coach.gradient}`)}
            >
              Train Again {coach.emoji}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen max-w-lg mx-auto p-4 gap-4 bg-slate-700">
      {/* Header */}
      <div className="flex items-center justify-between bg-slate-600 rounded-3xl px-4 py-3">
        <button onClick={onBack} className="text-slate-400 hover:text-white text-sm font-semibold transition">← Back</button>
        <div className="text-center">
          <p className="text-xs text-slate-400 capitalize">{subject} · Grade {grade}</p>
          <p className="text-sm font-black text-slate-100">Q {qIndex + 1} of {TOTAL_QUESTIONS}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-400">Score</p>
          <p className={cn('text-lg font-black', coach.color)}>{score}</p>
        </div>
      </div>

      {/* Timer bar */}
      {phase === 'question' && (
        <div className="h-2 bg-slate-600 rounded-full overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all duration-1000', timeLeft <= 5 ? 'bg-red-400' : `bg-gradient-to-r ${coach.gradient}`)}
            style={{ width: `${timerPct}%` }}
          />
        </div>
      )}

      {/* Coach message bubble */}
      {showCoachMessage && (
        <div className={cn('flex items-start gap-3 rounded-2xl p-3 border', `bg-gradient-to-r ${coach.gradient} bg-opacity-20 border-white/10`)}>
          <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 bg-gradient-to-br', coach.gradient)}>
            {coach.emoji}
          </div>
          <div>
            <p className="text-xs font-bold text-white/60 mb-0.5">{coach.name}</p>
            <p className="text-sm text-white font-semibold leading-relaxed">{coachMessage}</p>
          </div>
        </div>
      )}

      {/* Question card */}
      {phase === 'question' && q && (
        <div className="rounded-3xl bg-slate-600 p-5 flex-1">
          <div className="flex items-center justify-between mb-4">
            <p className="text-slate-50 font-bold text-base leading-relaxed">{q.question_text}</p>
            <span className={cn('text-2xl font-black ml-3 flex-shrink-0', timeLeft <= 5 ? 'text-red-400 animate-pulse' : 'text-slate-300')}>{timeLeft}s</span>
          </div>

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
                <button type="submit" className={cn('w-full py-3 rounded-2xl font-bold text-white transition bg-gradient-to-r', coach.gradient)}>
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
        </div>
      )}

      {/* Intro phase */}
      {phase === 'intro' && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-3">
            <div className={cn('w-24 h-24 rounded-3xl flex items-center justify-center text-6xl mx-auto shadow-2xl bg-gradient-to-br', coach.gradient)}>
              {coach.emoji}
            </div>
            <p className="text-slate-400 text-sm font-semibold animate-pulse">Getting ready...</p>
          </div>
        </div>
      )}
    </div>
  )
}
