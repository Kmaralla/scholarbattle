'use client'
import { useState, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
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

function todayKey() {
  return `puzzle_done_${new Date().toISOString().slice(0, 10)}`
}

export function TrainingSession({
  coach,
  mode,
  subject,
  grade,
  onBack,
}: {
  coach: Coach
  mode: TrainingMode
  subject: Subject
  grade: number
  onBack: () => void
}) {
  const isPuzzle = mode.id === 'puzzles'
  const isFlashcard = mode.id === 'flashcards'
  const isStreak = mode.id === 'streak'
  const supabase = createClient()

  // Daily puzzle gate
  const [puzzleAlreadyDone] = useState(() => isPuzzle && !!localStorage.getItem(todayKey()))
  const [puzzleCoinsAwarded, setPuzzleCoinsAwarded] = useState(false)

  const [questions] = useState(() =>
    getQuestionsForBattle(subject, grade, mode.questions).map((q, i) => ({ ...q, id: `q-${i}` }))
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
  const [flashRevealed, setFlashRevealed] = useState(false)
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [bestStreak, setBestStreak] = useState(0)
  const [lives, setLives] = useState(3)
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
  const totalQ = isStreak ? questions.length : mode.questions

  useEffect(() => {
    if (phase === 'intro') {
      const t = setTimeout(() => setPhase('question'), 2500)
      return () => clearTimeout(t)
    }
  }, [phase])

  useEffect(() => {
    if (phase !== 'question' || answered || mode.seconds === 99) return
    setTimeLeft(mode.seconds)
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
      const intros: Record<string, string> = {
        max:  `The answer was "${answer}". Here's how: ${explanation}`,
        owl:  `The correct answer is "${answer}". Here's the reasoning: ${explanation}`,
        luna: `The answer was "${answer}" 💛 Here's how to remember it: ${explanation}`,
      }
      const fallback = `The correct answer is "${answer}".${explanation ? ` Here's how: ${explanation}` : ''}`
      return `${empathy} ${intros[coach.id] ?? fallback}`
    }
  }

  function registerAnswer(correct: boolean) {
    setAnswered(true)
    setShowResult(true)
    if (correct) {
      setScore(s => s + 1)
      const ns = streak + 1
      setStreak(ns)
      if (ns > bestStreak) setBestStreak(ns)
    } else {
      setStreak(0)
      if (isStreak) {
        const nl = lives - 1
        setLives(nl)
        if (nl <= 0) {
          setCoachMessage(buildFeedback(false))
          setShowCoachMessage(true)
          setTimeout(() => setPhase('done'), 2500)
          return
        }
      }
    }
    setCoachMessage(buildFeedback(correct))
    setShowCoachMessage(true)
    // Don't auto-advance — user clicks Next
  }

  function handleChoice(opt: string) {
    if (answered) return
    clearInterval(timerRef.current!)
    setSelectedAnswer(opt)
    registerAnswer(opt.toLowerCase() === q.correct_answer.toLowerCase())
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
      // Award puzzle coins
      if (isPuzzle && !puzzleAlreadyDone) {
        localStorage.setItem(todayKey(), '1')
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data } = await supabase.from('users').select('coins').eq('id', user.id).single()
          const cur = (data as any)?.coins ?? 0
          await supabase.from('users').update({ coins: cur + PUZZLE_COINS }).eq('id', user.id)
          setPuzzleCoinsAwarded(true)
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
    setFlashRevealed(false)
    setShowCoachMessage(false)
    setEliminatedOptions([])
    setHintsLeft(MAX_HINTS)
    setTypedHintLevel(0)
  }

  const timerPct = mode.seconds === 99 ? 100 : (timeLeft / mode.seconds) * 100
  const myAnswerCorrect = selectedAnswer
    ? selectedAnswer.toLowerCase() === q?.correct_answer?.toLowerCase()
    : typedAnswer.toLowerCase() === q?.correct_answer?.toLowerCase()

  // Already done today — puzzle gate
  if (isPuzzle && puzzleAlreadyDone) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--bg-base)]">
        <div className="max-w-sm w-full space-y-5 text-center">
          <div className="text-7xl">🧩</div>
          <h2 className="text-2xl font-black text-white">Daily Puzzle Done!</h2>
          <p className="text-slate-400 text-sm leading-relaxed">
            You've already completed today's puzzle. Come back tomorrow for a new one!
          </p>
          <div className="bg-yellow-400/10 border border-yellow-400/20 rounded-2xl p-4">
            <p className="text-yellow-300 font-bold text-sm flex items-center gap-1.5"><img src="/coin.avif" alt="coin" width={16} height={16} className="inline-block object-contain" /> You earned {PUZZLE_COINS} coins today</p>
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
    const finalTotal = isStreak ? qIndex + 1 : totalQ
    const pct = Math.round((score / finalTotal) * 100)
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--bg-base)]">
        <div className="max-w-sm w-full space-y-5 text-center">
          <div className={cn('w-20 h-20 rounded-3xl flex items-center justify-center text-5xl mx-auto shadow-2xl bg-gradient-to-br', coach.gradient)}>
            {coach.emoji}
          </div>
          <div>
            <p className="text-white/50 text-sm font-semibold">{coach.name} says:</p>
            <p className="text-white font-bold text-base mt-1 leading-relaxed">"{coach.endLine(score, finalTotal)}"</p>
          </div>
          <div className={cn('rounded-3xl p-5 bg-gradient-to-br', coach.gradient)}>
            <p className="text-white/70 text-sm font-semibold">{mode.emoji} {mode.name}</p>
            <p className="text-6xl font-black text-white mt-1">{score}<span className="text-2xl text-white/60">/{finalTotal}</span></p>
            {isStreak && <p className="text-white/80 font-bold text-sm mt-1">🔥 Best streak: {bestStreak}</p>}
            <div className="mt-3 h-3 bg-black/20 rounded-full overflow-hidden">
              <div className="h-full bg-white/70 rounded-full" style={{ width: `${pct}%` }} />
            </div>
            <p className="text-white/80 text-sm font-bold mt-1.5">{pct}% accuracy</p>
          </div>

          {isPuzzle && puzzleCoinsAwarded && (
            <div className="bg-yellow-400/10 border border-yellow-400/20 rounded-2xl p-4 flex items-center justify-center gap-3">
              <img src="/coin.avif" alt="coin" width={48} height={48} className="object-contain" />
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
          <div className="flex gap-3">
            <button onClick={onBack} className="flex-1 border border-white/20 rounded-2xl py-3 text-sm font-bold text-white/70 hover:bg-white/10 transition">
              Change Mode
            </button>
            {!isPuzzle && (
              <button
                onClick={() => {
                  setQIndex(0); setScore(0); setStreak(0); setBestStreak(0); setLives(3)
                  setSelectedAnswer(null); setTypedAnswer(''); setAnswered(false)
                  setShowResult(false); setFlashRevealed(false); setEliminatedOptions([]); setHintsLeft(MAX_HINTS)
                  setCoachMessage(coach.introLine); setShowCoachMessage(true)
                  setPhase('intro')
                }}
                className={cn('flex-1 py-3 rounded-2xl text-sm font-black text-white shadow-lg transition hover:opacity-90 bg-gradient-to-r', coach.gradient)}
              >
                Train Again {mode.emoji}
              </button>
            )}
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
          <p className="text-xs text-slate-400">{mode.emoji} {mode.name} · {subject} Gr.{grade}</p>
          <p className="text-sm font-black text-slate-100">
            {isStreak ? `Q ${qIndex + 1}` : `Q ${qIndex + 1} of ${totalQ}`}
          </p>
        </div>
        <div className="text-right">
          {isStreak ? (
            <div>
              <p className="text-xs text-slate-400">Lives</p>
              <p className="text-base font-black text-red-400">{'❤️'.repeat(lives)}</p>
            </div>
          ) : (
            <div>
              <p className="text-xs text-slate-400">Score</p>
              <p className={cn('text-lg font-black', coach.color)}>{score}</p>
            </div>
          )}
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
      {phase === 'question' && mode.seconds !== 99 && (
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
            {mode.seconds !== 99 && (
              <span className={cn('text-2xl font-black flex-shrink-0', timeLeft <= 5 ? 'text-red-400 animate-pulse' : 'text-slate-300')}>{timeLeft}s</span>
            )}
          </div>

          {/* Flashcard */}
          {isFlashcard && !flashRevealed && (
            <button onClick={() => setFlashRevealed(true)} className={cn('w-full py-4 rounded-2xl font-black text-white text-sm transition hover:opacity-90 bg-gradient-to-r', coach.gradient)}>
              Reveal Answer 👁️
            </button>
          )}
          {isFlashcard && flashRevealed && !answered && (
            <div className="space-y-3">
              <div className="bg-green-900/40 border border-green-500/50 rounded-2xl p-4 text-center">
                <p className="text-xs text-green-400 font-bold mb-1">Answer</p>
                <p className="text-lg font-black text-green-300">{q.correct_answer}</p>
              </div>
              <p className="text-sm text-center text-slate-300 font-semibold">Did you know it?</p>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => { setSelectedAnswer(q.correct_answer); registerAnswer(true) }} className="py-3 rounded-2xl font-black text-white bg-green-600 hover:bg-green-500 transition">✓ Got it!</button>
                <button onClick={() => { setSelectedAnswer(''); registerAnswer(false) }} className="py-3 rounded-2xl font-black text-white bg-red-600/80 hover:bg-red-600 transition">✗ Missed it</button>
              </div>
            </div>
          )}

          {/* Multiple choice (non-flashcard) */}
          {!isFlashcard && q.type === 'multiple_choice' && opts.length > 0 && (
            <div className="grid gap-2.5">
              {opts.map((opt, i) => {
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
                      'w-full text-left px-4 py-3 rounded-2xl border text-sm font-semibold transition-all flex items-center gap-3',
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
                    <span>{opt}</span>
                    {correct && <span className="ml-auto text-green-400 font-black">✓</span>}
                    {wrong && <span className="ml-auto text-red-400 font-black">✗</span>}
                    {eliminated && <span className="ml-auto text-xs text-slate-500">💡 hint</span>}
                  </button>
                )
              })}
                </div>
          )}

          {/* Typed */}
          {!isFlashcard && q.type === 'typed' && (
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

          {/* Universal Next button — shown after any answer in any mode */}
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
