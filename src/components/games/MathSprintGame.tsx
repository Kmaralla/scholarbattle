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
  return { question: `${a} ${op} ${b} = ?`, answer }
}

export function MathSprintGame({ subject, grade, onExit }: { subject: Subject; grade: number; onExit: () => void }) {
  const [phase, setPhase] = useState<'ready' | 'playing' | 'done'>('ready')
  const [q, setQ] = useState(() => generateQuestion(grade))
  const [input, setInput] = useState('')
  const [score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(30)
  const [feedback, setFeedback] = useState<boolean | null>(null)
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

  function start() { setPhase('playing'); setScore(0); setTimeLeft(30); setQ(generateQuestion(grade)); setTimeout(() => inputRef.current?.focus(), 100) }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const correct = parseInt(input) === q.answer
    setFeedback(correct)
    if (correct) setScore(s => s + 1)
    setTimeout(() => { setFeedback(null); setQ(generateQuestion(grade)); setInput(''); inputRef.current?.focus() }, 300)
  }

  if (phase === 'ready') return (
    <div className="max-w-lg mx-auto p-4 flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
      <div className="text-6xl">⚡</div>
      <h2 className="text-2xl font-black">Math Sprint</h2>
      <p className="text-gray-500">Solve as many problems as you can in 30 seconds!</p>
      <button onClick={start} className="px-8 py-4 bg-green-500 text-white rounded-2xl font-black text-lg hover:bg-green-600 transition">Start!</button>
      <button onClick={onExit} className="text-sm text-gray-400 hover:text-gray-600">← Back</button>
    </div>
  )

  if (phase === 'done') return (
    <div className="max-w-lg mx-auto p-4 flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
      <div className="text-6xl">{score >= 15 ? '🏆' : score >= 8 ? '🎯' : '💪'}</div>
      <h2 className="text-2xl font-black">Time's Up!</h2>
      <p className="text-4xl font-black text-green-600">{score}</p>
      <p className="text-gray-500">problems solved</p>
      <div className="flex gap-3">
        <button onClick={start} className="px-6 py-3 bg-green-500 text-white rounded-2xl font-bold">Try Again</button>
        <button onClick={onExit} className="px-6 py-3 bg-gray-100 text-gray-700 rounded-2xl font-bold">Exit</button>
      </div>
    </div>
  )

  return (
    <div className="max-w-lg mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <span className="font-bold text-green-600">Score: {score}</span>
        <div className={`text-2xl font-black ${timeLeft <= 10 ? 'text-red-500 animate-pulse' : 'text-gray-700'}`}>{timeLeft}s</div>
      </div>

      <div className={`rounded-3xl p-10 text-center transition-colors ${feedback === true ? 'bg-green-50' : feedback === false ? 'bg-red-50' : 'bg-indigo-50'}`}>
        <p className="text-3xl font-black text-indigo-900">{q.question}</p>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          type="number"
          placeholder="Answer..."
          className="flex-1 px-4 py-3 rounded-2xl border-2 border-gray-200 focus:border-green-400 outline-none text-2xl font-black text-center"
        />
        <button type="submit" className="px-6 py-3 bg-green-500 text-white rounded-2xl font-bold text-lg">✓</button>
      </form>
    </div>
  )
}
