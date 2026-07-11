'use client'
import { useState, useEffect, useRef } from 'react'
import { getQuestionsForBattle } from '@/lib/questions'
import { Subject } from '@/types'

const TIME_PER_Q = 8

export function SpeedQuizGame({ subject, grade, onExit }: { subject: Subject; grade: number; onExit: () => void }) {
  const [questions] = useState(() => getQuestionsForBattle(subject, grade, 10))
  const [phase, setPhase] = useState<'ready' | 'playing' | 'done'>('ready')
  const [index, setIndex] = useState(0)
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [bestStreak, setBestStreak] = useState(0)
  const [timeLeft, setTimeLeft] = useState(TIME_PER_Q)
  const [selected, setSelected] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<boolean | null>(null)
  const [highScore] = useState(() => parseInt(localStorage.getItem('speed_high_score') ?? '0', 10))
  const [newHigh, setNewHigh] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (phase !== 'playing') return
    setTimeLeft(TIME_PER_Q)
    const interval = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(interval); advance(null); return 0 }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [index, phase])

  useEffect(() => {
    if (phase === 'done' && score > highScore) {
      localStorage.setItem('speed_high_score', String(score))
      setNewHigh(true)
    }
  }, [phase])

  function advance(answer: string | null) {
    const q = questions[index]
    const correct = answer !== null && answer === q.correct_answer
    if (correct) {
      setScore(s => s + 1)
      setStreak(s => { const n = s + 1; setBestStreak(b => Math.max(b, n)); return n })
    } else {
      setStreak(0)
    }
    setFeedback(answer === null ? false : correct)
    setSelected(answer)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      setFeedback(null)
      setSelected(null)
      if (index + 1 >= questions.length) setPhase('done')
      else setIndex(i => i + 1)
    }, 700)
  }

  function start() {
    setPhase('playing'); setIndex(0); setScore(0); setStreak(0); setBestStreak(0); setNewHigh(false)
  }

  if (phase === 'ready') return (
    <div className="max-w-lg mx-auto p-4 flex flex-col items-center justify-center min-h-[70vh] gap-5 text-center">
      <div className="text-6xl float">🏎️</div>
      <h2 className="text-2xl font-black text-white">Speed Quiz</h2>
      <p className="text-white/50 text-sm">10 questions · {TIME_PER_Q} seconds each · Go as fast as you can!</p>
      {highScore > 0 && <p className="text-yellow-300 font-bold text-sm">🏆 Your best: {highScore}/{questions.length}</p>}
      <button onClick={start} className="px-10 py-4 bg-rose-500 hover:bg-rose-400 text-white rounded-2xl font-black text-lg transition-all hover:scale-105">
        Start!
      </button>
      <button onClick={onExit} className="text-sm text-white/30 hover:text-white/60 transition">← Back</button>
    </div>
  )

  if (phase === 'done') {
    const pct = Math.round((score / questions.length) * 100)
    return (
      <div className="max-w-lg mx-auto p-4 flex flex-col items-center justify-center min-h-[70vh] gap-5 text-center">
        <div className="text-6xl">{pct >= 80 ? '🏆' : pct >= 50 ? '🎯' : '💪'}</div>
        <h2 className="text-2xl font-black text-white">Finished!</h2>
        {newHigh && <p className="text-yellow-300 font-black text-sm">🎉 New High Score!</p>}
        <p className="text-6xl font-black text-rose-400">{score}<span className="text-2xl text-white/40">/{questions.length}</span></p>
        <div className="flex gap-6 text-center">
          <div><p className="text-2xl font-black text-indigo-300">{pct}%</p><p className="text-xs text-white/40">accuracy</p></div>
          <div><p className="text-2xl font-black text-orange-300">{bestStreak}x</p><p className="text-xs text-white/40">best streak</p></div>
          <div><p className="text-2xl font-black text-yellow-300">{Math.max(highScore, score)}</p><p className="text-xs text-white/40">high score</p></div>
        </div>
        <div className="flex gap-3">
          <button onClick={start} className="px-6 py-3 bg-rose-500 hover:bg-rose-400 text-white rounded-2xl font-black transition">Try Again</button>
          <button onClick={onExit} className="px-6 py-3 bg-white/10 hover:bg-white/15 text-white rounded-2xl font-black transition">Exit</button>
        </div>
      </div>
    )
  }

  const q = questions[index]
  const opts = q.type === 'multiple_choice' && q.options ? (q.options as string[]) : null
  const timerPct = (timeLeft / TIME_PER_Q) * 100

  return (
    <div className="max-w-lg mx-auto p-4 space-y-4 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="font-black text-rose-400 text-lg">{score}/{questions.length}</span>
        <div className={`text-2xl font-black tabular-nums ${timeLeft <= 3 ? 'text-red-400 animate-pulse' : 'text-white'}`}>{timeLeft}s</div>
        <div>
          {streak >= 3
            ? <span className="text-orange-400 font-black text-sm">🔥{streak}</span>
            : <span className="text-xs text-white/30">{index + 1}/{questions.length}</span>
          }
        </div>
      </div>

      {/* Timer bar */}
      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ${timeLeft <= 3 ? 'bg-red-500' : 'bg-rose-500'}`}
          style={{ width: `${timerPct}%` }}
        />
      </div>

      {/* Question */}
      <div className={`rounded-3xl p-6 min-h-28 flex items-center justify-center text-center border transition-all duration-150 ${
        feedback === true  ? 'bg-green-500/20 border-green-400/40' :
        feedback === false ? 'bg-red-500/20 border-red-400/40' :
                             'bg-white/5 border-white/10'
      }`}>
        <p className="text-lg font-bold text-white leading-snug">{q.question_text}</p>
      </div>

      {/* Answers */}
      {opts ? (
        <div className="grid grid-cols-2 gap-2">
          {opts.map(opt => (
            <button
              key={opt}
              onClick={() => advance(opt)}
              disabled={selected !== null}
              className={`py-4 px-3 rounded-2xl text-sm font-bold text-left transition-all ${
                selected === opt
                  ? opt === q.correct_answer ? 'bg-green-500 text-white border-2 border-green-400' : 'bg-red-500 text-white border-2 border-red-400'
                  : selected !== null && opt === q.correct_answer ? 'bg-green-500/20 text-green-300 border-2 border-green-400/40'
                  : 'bg-white/8 border-2 border-white/10 hover:border-rose-400/60 hover:bg-rose-500/10 text-white'
              } disabled:cursor-not-allowed`}
            >
              {opt}
            </button>
          ))}
        </div>
      ) : (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 text-center">
          <p className="text-2xl font-black text-indigo-300">{q.correct_answer}</p>
          <button onClick={() => advance(q.correct_answer)} className="mt-3 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-black text-sm transition">
            Got it ✓
          </button>
        </div>
      )}
    </div>
  )
}
