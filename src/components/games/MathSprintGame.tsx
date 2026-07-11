'use client'
import { useState, useEffect, useRef } from 'react'
import { Subject } from '@/types'

function generateQuestion(grade: number): { question: string; answer: number } {
  const max = grade <= 5 ? 10 : grade <= 8 ? 20 : 50
  const ops = grade <= 4 ? ['+', '-'] : grade <= 6 ? ['+', '-', '×'] : ['+', '-', '×', '÷']
  const op = ops[Math.floor(Math.random() * ops.length)]
  let a = Math.floor(Math.random() * max) + 1
  let b = Math.floor(Math.random() * max) + 1
  if (op === '-' && b > a) [a, b] = [b, a]
  if (op === '÷') { b = Math.max(1, b); a = b * (Math.floor(Math.random() * 9) + 1) }
  const answer = op === '+' ? a + b : op === '-' ? a - b : op === '×' ? a * b : a / b
  return { question: `${a} ${op} ${b}`, answer }
}

export function MathSprintGame({ subject, grade, onExit }: { subject: Subject; grade: number; onExit: () => void }) {
  const [phase, setPhase] = useState<'ready' | 'playing' | 'done'>('ready')
  const [q, setQ] = useState(() => generateQuestion(grade))
  const [input, setInput] = useState('')
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [bestStreak, setBestStreak] = useState(0)
  const [timeLeft, setTimeLeft] = useState(30)
  const [feedback, setFeedback] = useState<boolean | null>(null)
  const [highScore] = useState(() => parseInt(localStorage.getItem('math_sprint_hs') ?? '0', 10))
  const [newHigh, setNewHigh] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (phase !== 'playing') return
    const t = setInterval(() => {
      setTimeLeft(s => {
        if (s <= 1) { clearInterval(t); setPhase('done'); return 0 }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(t)
  }, [phase])

  useEffect(() => {
    if (phase === 'done' && score > highScore) {
      localStorage.setItem('math_sprint_hs', String(score))
      setNewHigh(true)
    }
  }, [phase])

  function start() {
    setPhase('playing'); setScore(0); setStreak(0); setBestStreak(0)
    setTimeLeft(30); setQ(generateQuestion(grade)); setNewHigh(false)
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const correct = parseInt(input) === q.answer
    setFeedback(correct)
    if (correct) {
      setScore(s => s + 1)
      setStreak(s => { const n = s + 1; setBestStreak(b => Math.max(b, n)); return n })
    } else {
      setStreak(0)
    }
    setTimeout(() => { setFeedback(null); setQ(generateQuestion(grade)); setInput(''); inputRef.current?.focus() }, 300)
  }

  if (phase === 'ready') return (
    <div className="max-w-lg mx-auto p-4 flex flex-col items-center justify-center min-h-[70vh] gap-5 text-center">
      <div className="text-6xl float">⚡</div>
      <h2 className="text-2xl font-black text-white">Math Sprint</h2>
      <p className="text-white/50 text-sm">Solve as many problems as you can in 30 seconds!</p>
      {highScore > 0 && <p className="text-yellow-300 font-bold text-sm">🏆 Your best: {highScore}</p>}
      <button onClick={start} className="px-10 py-4 bg-green-500 hover:bg-green-400 text-white rounded-2xl font-black text-lg transition-all hover:scale-105">
        Start!
      </button>
      <button onClick={onExit} className="text-sm text-white/30 hover:text-white/60 transition">← Back</button>
    </div>
  )

  if (phase === 'done') return (
    <div className="max-w-lg mx-auto p-4 flex flex-col items-center justify-center min-h-[70vh] gap-5 text-center">
      <div className="text-6xl">{score >= 15 ? '🏆' : score >= 8 ? '🎯' : '💪'}</div>
      <h2 className="text-2xl font-black text-white">Time's Up!</h2>
      {newHigh && <p className="text-yellow-300 font-black">🎉 New High Score!</p>}
      <p className="text-6xl font-black text-green-400">{score}</p>
      <p className="text-white/50 text-sm">problems solved</p>
      <div className="flex gap-6 text-center">
        <div><p className="text-xl font-black text-indigo-300">{bestStreak}x</p><p className="text-xs text-white/40">best streak</p></div>
        <div><p className="text-xl font-black text-yellow-300">{Math.max(highScore, score)}</p><p className="text-xs text-white/40">high score</p></div>
      </div>
      <div className="flex gap-3">
        <button onClick={start} className="px-6 py-3 bg-green-500 hover:bg-green-400 text-white rounded-2xl font-black transition">Try Again</button>
        <button onClick={onExit} className="px-6 py-3 bg-white/10 hover:bg-white/15 text-white rounded-2xl font-black transition">Exit</button>
      </div>
    </div>
  )

  const timerPct = (timeLeft / 30) * 100

  return (
    <div className="max-w-lg mx-auto p-4 space-y-5 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="font-black text-green-400 text-lg">{score}</span>
        <div className={`text-2xl font-black tabular-nums ${timeLeft <= 10 ? 'text-red-400' : 'text-white'}`}>{timeLeft}s</div>
        <div className="flex items-center gap-1">
          {streak >= 3 && <span className="text-orange-400 text-sm font-black">🔥{streak}</span>}
          {streak < 3 && <span className="text-xs text-white/30">streak: {streak}</span>}
        </div>
      </div>

      {/* Timer bar */}
      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ${timeLeft <= 10 ? 'bg-red-500' : 'bg-green-500'}`}
          style={{ width: `${timerPct}%` }}
        />
      </div>

      {/* Question */}
      <div className={`rounded-3xl p-10 text-center border transition-all duration-150 ${
        feedback === true  ? 'bg-green-500/20 border-green-400/40' :
        feedback === false ? 'bg-red-500/20 border-red-400/40' :
                             'bg-white/5 border-white/10'
      }`}>
        <p className="text-xs text-white/30 uppercase tracking-widest mb-2">Solve</p>
        <p className="text-4xl font-black text-white">{q.question} = ?</p>
        {feedback === true  && <p className="text-green-400 font-black mt-2">✓ Correct!</p>}
        {feedback === false && <p className="text-red-400 font-black mt-2">✗ Wrong</p>}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          type="number"
          placeholder="Answer..."
          disabled={!!feedback}
          className="flex-1 px-4 py-4 rounded-2xl border-2 border-white/15 bg-white/5 text-white focus:border-green-400 outline-none text-2xl font-black text-center placeholder-white/20 transition"
        />
        <button type="submit" disabled={!!feedback} className="px-6 py-4 bg-green-500 hover:bg-green-400 text-white rounded-2xl font-black text-xl transition disabled:opacity-50">
          ✓
        </button>
      </form>
    </div>
  )
}
