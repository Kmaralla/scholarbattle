'use client'
import { useState, useEffect, useRef } from 'react'
import { cn, clipOptionDisplay } from '@/lib/utils'
import { getQuestionsForBattle } from '@/lib/questions'
import { Subject } from '@/types'
import { createClient } from '@/lib/supabase/client'
import type { Coach, TrainingMode } from '@/app/(app)/training/page'

const MAX_HINTS = 2
const PUZZLE_COINS = 25

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function todayDate(): string {
  return new Date().toISOString().slice(0, 10)
}

export function TrainingSession({
  coach,
  mode,
  subject,
  grade,
  topic,
  onBack,
}: {
  coach: Coach
  mode: TrainingMode
  subject: Subject
  grade: number
  topic?: string
  onBack: () => void
}) {
  const isPuzzle = mode.id === 'puzzles'
  const supabase = createClient()

  // Daily puzzle gate — server-verified via users.last_puzzle_reward_date,
  // not client storage, so it can't be bypassed by clearing browser data.
  const [puzzleStatus, setPuzzleStatus] = useState<'checking' | 'available' | 'done'>(isPuzzle ? 'checking' : 'available')
  const [userId, setUserId] = useState<string | null>(null)
  const [puzzleCoinsAwarded, setPuzzleCoinsAwarded] = useState(false)

  useEffect(() => {
    if (!isPuzzle) return
    let cancelled = false
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { if (!cancelled) setPuzzleStatus('available'); return }
      setUserId(user.id)
      const { data } = await supabase.from('users').select('last_puzzle_reward_date').eq('id', user.id).single()
      const last = (data as any)?.last_puzzle_reward_date as string | null
      if (!cancelled) setPuzzleStatus(last === todayDate() ? 'done' : 'available')
    })
    return () => { cancelled = true }
  }, [])

  const [questions] = useState(() =>
    getQuestionsForBattle(subject, grade, mode.questions, topic).map((q, i) => ({ ...q, id: `q-${i}` }))
  )
  // Shuffle options per question — stored as parallel array
  const [optionSets] = useState<string[][]>(() =>
    questions.map(q => q.options ? shuffle(q.options) : [])
  )

  const [qIndex, setQIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [typedAnswer, setTypedAnswer] = useState('')
  const [answered, setAnswered] = useState(false)
  const [showResult, setShowResult] = useState(false)
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [timeLeft, setTimeLeft] = useState(mode.seconds)
  const [coachMessage, setCoachMessage] = useState(coach.introLine)
  const [showCoachMessage, setShowCoachMessage] = useState(true)
  const [phase, setPhase] = useState<'intro' | 'question' | 'done'>('intro')
  const [coachTipIdx] = useState(() => Math.floor(Math.random() * coach.tips.length))
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Puzzle hints
  const [hintsLeft, setHintsLeft] = useState(MAX_HINTS)
  const [eliminatedOptions, setEliminatedOptions] = useState<string[]>([])
  const [typedHintLevel, setTypedHintLevel] = useState(0) // 0=none, 1=first letter, 2=half revealed

  const q = questions[qIndex]
  const opts = optionSets[qIndex] ?? []
  const totalQ = mode.questions

  useEffect(() => {
    if (phase === 'intro') {
      const t = setTimeout(() => setPhase('question'), 2500)
      return () => clearTimeout(t)
    }
  }, [phase])

  useEffect(() => {
    if (phase !== 'question' || answered) return
    const questionSeconds = qIndex === mode.questions - 1 ? 5 : Math.max(10, mode.seconds - qIndex * 10)
    setTimeLeft(questionSeconds)
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(timerRef.current!); handleTimeout(); return 0 }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current!)
  }, [qIndex, phase])

  function handleTimeout() {
    if (answered) return
    registerAnswer(false)
  }

  function buildFeedback(correct: boolean): string {
    const answer = q?.correct_answer ?? ''
    const explanation = q?.explanation ?? ''
    if (correct) {
      const praise = pick(coach.correctLines)
      const reinforcements = [
        `"${answer}" — you nailed it!`,
        `That's the one: "${answer}". Keep going!`,
        `Correct — "${answer}" is exactly right.`,
        `"${answer}" — locked in your brain now! 🧠`,
      ]
      return `${praise} ${pick(reinforcements)}`
    } else {
      const empathy = pick(coach.wrongLines)
      return `${empathy} The correct answer is "${answer}". Here's the reasoning: ${explanation}`
    }
  }

  function registerAnswer(correct: boolean) {
    setAnswered(true)
    setShowResult(true)
    if (correct) {
      setScore(s => s + 1)
      setStreak(s => s + 1)
    } else {
      setStreak(0)
    }
    setCoachMessage(buildFeedback(correct))
    setShowCoachMessage(true)
    // Don't auto-advance — user clicks Next
  }

  function handleChoice(opt: string) {
    if (answered) return
    setSelectedAnswer(opt)
  }

  function handleChoiceSubmit() {
    if (!selectedAnswer || answered) return
    clearInterval(timerRef.current!)
    registerAnswer(selectedAnswer.toLowerCase() === q.correct_answer.toLowerCase())
  }

  function handleTypedSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (answered || !typedAnswer.trim()) return
    clearInterval(timerRef.current!)
    registerAnswer(typedAnswer.trim().toLowerCase() === q.correct_answer.toLowerCase())
  }

  function applyHint() {
    if (hintsLeft <= 0 || answered) return
    if (q.type === 'typed') {
      setTypedHintLevel(l => l + 1)
      setHintsLeft(h => h - 1)
    } else if (opts.length > 0) {
      const wrong = opts.filter(o => o.toLowerCase() !== q.correct_answer.toLowerCase() && !eliminatedOptions.includes(o))
      if (wrong.length === 0) return
      const toElim = wrong[Math.floor(Math.random() * wrong.length)]
      setEliminatedOptions(prev => [...prev, toElim])
      setHintsLeft(h => h - 1)
    }
  }

  function getTypedHint(level: number): string {
    const ans = q?.correct_answer ?? ''
    if (level === 0 || !ans) return ''
    if (level === 1) {
      // First letter of each word + blanks for rest
      return ans.split(' ').map(word =>
        word[0] + '_'.repeat(Math.max(0, word.length - 1))
      ).join(' ')
    }
    // Reveal first half of each word
    return ans.split(' ').map(word => {
      const show = Math.ceil(word.length / 2)
      return word.slice(0, show) + '_'.repeat(word.length - show)
    }).join(' ')
  }

  async function advance() {
    if (qIndex + 1 >= questions.length) {
      // Award puzzle coins — guarded update only succeeds if the reward
      // hasn't already been claimed today, per the database (not localStorage)
      if (isPuzzle && puzzleStatus === 'available' && userId) {
        const today = todayDate()
        const { data: row } = await supabase.from('users').select('coins').eq('id', userId).single()
        const cur = (row as any)?.coins ?? 0
        const { data: updated } = await supabase
          .from('users')
          .update({ coins: cur + PUZZLE_COINS, last_puzzle_reward_date: today })
          .eq('id', userId)
          .or(`last_puzzle_reward_date.is.null,last_puzzle_reward_date.lt.${today}`)
          .select()
        if (updated && updated.length > 0) {
          setPuzzleCoinsAwarded(true)
          setPuzzleStatus('done')
        }
      }
      setPhase('done')
      return
    }
    setQIndex(i => i + 1)
    setSelectedAnswer(null)
    setTypedAnswer('')
    setAnswered(false)
    setShowResult(false)
    setShowCoachMessage(false)
    setEliminatedOptions([])
    setHintsLeft(MAX_HINTS)
    setTypedHintLevel(0)
  }

  const questionSeconds = qIndex === mode.questions - 1 ? 5 : Math.max(10, mode.seconds - qIndex * 10)
  const timerPct = (timeLeft / questionSeconds) * 100
  const myAnswerCorrect = selectedAnswer
    ? selectedAnswer.toLowerCase() === q?.correct_answer?.toLowerCase()
    : typedAnswer.toLowerCase() === q?.correct_answer?.toLowerCase()

  // Checking today's puzzle status with the server
  if (isPuzzle && puzzleStatus === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--bg-base)]">
        <div className="text-center space-y-3">
          <div className="text-6xl animate-pulse">🧩</div>
          <p className="text-slate-400 text-sm font-semibold">Checking today's puzzle...</p>
        </div>
      </div>
    )
  }

  // Already done today — puzzle gate
  if (isPuzzle && puzzleStatus === 'done') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--bg-base)]">
        <div className="max-w-sm w-full space-y-5 text-center">
          <div className="text-7xl">🧩</div>
          <h2 className="text-2xl font-black text-white">Daily Puzzle Done!</h2>
          <p className="text-slate-400 text-sm leading-relaxed">
            You've already completed today's puzzle. Come back tomorrow for a new one!
          </p>
          <div className="bg-yellow-400/10 border border-yellow-400/20 rounded-2xl p-4">
            <p className="text-yellow-300 font-bold text-sm">🪙 You earned {PUZZLE_COINS} coins today</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
            <p className="text-xs text-white/40 mb-1">New puzzle in</p>
            <p className="text-white font-black text-lg">
              {24 - new Date().getHours()}h {60 - new Date().getMinutes()}m
            </p>
          </div>
          <button onClick={onBack} className="w-full border border-white/20 rounded-2xl py-3 text-sm font-bold text-white/70 hover:bg-white/10 transition">
            ← Back to Training
          </button>
        </div>
      </div>
    )
  }

  // Done screen
  if (phase === 'done') {
    const pct = Math.round((score / totalQ) * 100)
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--bg-base)]">
        <div className="max-w-sm w-full space-y-5 text-center">
          <div className={cn('w-20 h-20 rounded-3xl flex items-center justify-center text-5xl mx-auto shadow-2xl bg-gradient-to-br', coach.gradient)}>
            {coach.emoji}
          </div>
          <div>
            <p className="text-white/50 text-sm font-semibold">{coach.name} says:</p>
            <p className="text-white font-bold text-base mt-1 leading-relaxed">"{coach.endLine(score, totalQ)}"</p>
          </div>
          <div className={cn('rounded-3xl p-5 bg-gradient-to-br', coach.gradient)}>
            <p className="text-white/70 text-sm font-semibold">{mode.emoji} {mode.name}</p>
            <p className="text-6xl font-black text-white mt-1">{score}<span className="text-2xl text-white/60">/{totalQ}</span></p>
            <div className="mt-3 h-3 bg-black/20 rounded-full overflow-hidden">
              <div className="h-full bg-white/70 rounded-full" style={{ width: `${pct}%` }} />
            </div>
            <p className="text-white/80 text-sm font-bold mt-1.5">{pct}% accuracy</p>
          </div>

          {isPuzzle && puzzleCoinsAwarded && (
            <div className="bg-yellow-400/10 border border-yellow-400/20 rounded-2xl p-4 flex items-center justify-center gap-3">
              <span className="text-3xl">🪙</span>
              <div className="text-left">
                <p className="text-yellow-300 font-black text-lg">+{PUZZLE_COINS} coins earned!</p>
                <p className="text-yellow-400/60 text-xs">Daily puzzle reward</p>
              </div>
            </div>
          )}

          <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
            <p className="text-xs text-white/40 font-semibold mb-1">{coach.name}'s tip:</p>
            <p className="text-sm text-white/80 italic">"{coach.tips[coachTipIdx]}"</p>
          </div>
          <button onClick={onBack} className="w-full border border-white/20 rounded-2xl py-3 text-sm font-bold text-white/70 hover:bg-white/10 transition">
            ← Back to Training
          </button>
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
          <p className="text-xs text-slate-400">{mode.emoji} {mode.name} · {subject} Gr.{grade}</p>
          <p className="text-sm font-black text-slate-100">Q {qIndex + 1} of {totalQ}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-400">Score</p>
          <p className={cn('text-lg font-black', coach.color)}>{score}</p>
        </div>
      </div>

      {/* Puzzle: daily badge + hint button */}
      {isPuzzle && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 bg-violet-900/40 border border-violet-500/30 rounded-full px-3 py-1.5">
            <span className="text-sm">🗓️</span>
            <span className="text-xs font-bold text-violet-300">Daily Puzzle</span>
          </div>
          <button
            onClick={applyHint}
            disabled={hintsLeft <= 0 || answered}
            className={cn(
              'flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold border transition',
              hintsLeft > 0 && !answered
                ? 'bg-amber-900/40 border-amber-500/40 text-amber-300 hover:bg-amber-900/60'
                : 'bg-white/5 border-white/10 text-white/30 cursor-not-allowed'
            )}
          >
            💡 Hint ({hintsLeft} left)
          </button>
        </div>
      )}

      {/* Streak bar */}
      {streak > 0 && (
        <div className="flex items-center gap-2 bg-orange-900/30 border border-orange-500/30 rounded-2xl px-4 py-2">
          <span className="text-lg">🔥</span>
          <span className="text-sm font-black text-orange-300">{streak} in a row!</span>
          {streak >= 5 && <span className="text-xs text-orange-400 ml-auto font-bold">ON FIRE!</span>}
        </div>
      )}

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
        <div className="flex items-start gap-3 bg-slate-600/80 border border-white/10 rounded-2xl p-3">
          <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 bg-gradient-to-br', coach.gradient)}>
            {coach.emoji}
          </div>
          <div>
            <p className="text-xs font-bold text-white/50 mb-0.5">{coach.name}</p>
            <p className="text-sm text-white font-semibold leading-relaxed">{coachMessage}</p>
          </div>
        </div>
      )}

      {/* Question card */}
      {phase === 'question' && q && (
        <div className="rounded-3xl bg-slate-600 p-5 flex-1">
          <div className="flex items-start justify-between mb-4 gap-3">
            <p className="text-slate-50 font-bold text-base leading-relaxed">{q.question_text}</p>
            <span className={cn('text-2xl font-black flex-shrink-0', timeLeft <= 5 ? 'text-red-400 animate-pulse' : 'text-slate-300')}>{timeLeft}s</span>
          </div>

          {/* Multiple choice */}
          {q.type === 'multiple_choice' && opts.length > 0 && (
            <div className="grid gap-2.5">
              {(() => {
                const displayOpts = clipOptionDisplay(opts)
                return opts.map((opt, i) => {
                  const isSelected = selectedAnswer === opt
                  const correct = showResult && opt === q.correct_answer
                  const wrong = showResult && isSelected && opt !== q.correct_answer
                  const eliminated = eliminatedOptions.includes(opt)
                  const labels = ['A', 'B', 'C', 'D']
                  const labelColors = ['bg-indigo-500/40 text-indigo-200', 'bg-violet-500/40 text-violet-200', 'bg-sky-500/40 text-sky-200', 'bg-pink-500/40 text-pink-200']
                  return (
                    <button
                      key={opt}
                      disabled={answered || eliminated}
                      onClick={() => handleChoice(opt)}
                      className={cn(
                        'w-full text-left px-4 py-3 rounded-2xl border text-sm font-semibold transition-all flex items-center gap-3 min-h-[52px]',
                        eliminated && 'border-slate-700 bg-slate-700/30 text-slate-600 line-through cursor-not-allowed opacity-50',
                        !eliminated && !answered && !isSelected && 'border-slate-500 bg-slate-500/50 text-slate-100 hover:border-indigo-400 hover:bg-indigo-900/30',
                        !eliminated && !showResult && isSelected && 'border-indigo-400 bg-indigo-800/50 text-indigo-100',
                        !eliminated && correct && 'border-green-500 bg-green-900/50 text-green-200',
                        !eliminated && wrong && 'border-red-400 bg-red-900/40 text-red-200',
                        !eliminated && !correct && !wrong && !isSelected && answered && 'border-slate-600 bg-slate-600/30 text-slate-400'
                      )}
                    >
                      <span className={cn('w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black flex-shrink-0',
                        eliminated ? 'bg-slate-600 text-slate-500' :
                        correct ? 'bg-green-500 text-white' : wrong ? 'bg-red-500 text-white' : isSelected ? 'bg-indigo-500 text-white' : labelColors[i]
                      )}>{labels[i]}</span>
                      <span>{displayOpts[i]}</span>
                      {correct && <span className="ml-auto text-green-400 font-black">✓</span>}
                      {wrong && <span className="ml-auto text-red-400 font-black">✗</span>}
                      {eliminated && <span className="ml-auto text-xs text-slate-500">💡 hint</span>}
                    </button>
                  )
                })
              })()}
            </div>
          )}

          {/* Submit button for multiple choice */}
          {q.type === 'multiple_choice' && selectedAnswer && !answered && (
            <button
              onClick={handleChoiceSubmit}
              className={cn('w-full mt-3 py-3.5 rounded-2xl font-black text-white transition-all text-sm bg-gradient-to-r', coach.gradient)}
            >
              Submit Answer ✓
            </button>
          )}

          {/* Typed */}
          {q.type === 'typed' && (
            <form onSubmit={handleTypedSubmit} className="space-y-3">
              {typedHintLevel > 0 && !answered && (
                <div className="bg-amber-900/30 border border-amber-500/30 rounded-xl px-4 py-2.5 text-center">
                  <p className="text-xs text-amber-400/70 font-semibold mb-0.5">💡 Hint</p>
                  <p className="text-amber-300 font-black text-lg tracking-widest">{getTypedHint(typedHintLevel)}</p>
                </div>
              )}
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
                <button type="submit" className={cn('w-full py-3 rounded-2xl font-bold text-white transition bg-gradient-to-r', coach.gradient)}>Submit ↵</button>
              )}
            </form>
          )}

          {/* Universal Next button — shown after any answer */}
          {answered && (
            <button
              onClick={advance}
              className={cn('w-full mt-4 py-3.5 rounded-2xl font-black text-white text-sm transition hover:opacity-90 bg-gradient-to-r', coach.gradient)}
            >
              {qIndex + 1 >= questions.length ? 'See Results 🏆' : 'Next →'}
            </button>
          )}
        </div>
      )}

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
