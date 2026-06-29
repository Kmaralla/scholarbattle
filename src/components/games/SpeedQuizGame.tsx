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
  const [timeLeft, setTimeLeft] = useState(TIME_PER_Q)
  const [selected, setSelected] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<boolean | null>(null)
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

  function advance(answer: string | null) {
    const q = questions[index]
    const correct = answer === q.correct_answer
    if (correct) setScore(s => s + 1)
    setFeedback(correct)
    setSelected(answer)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      setFeedback(null)
      setSelected(null)
      if (index + 1 >= questions.length) setPhase('done')
      else setIndex(i => i + 1)
    }, 700)
  }

  function start() { setPhase('playing'); setIndex(0); setScore(0) }

  if (phase === 'ready') return (
    <div className="max-w-lg mx-auto p-4 flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
      <div className="text-6xl">🏎️</div>
      <h2 className="text-2xl font-black">Speed Quiz</h2>
      <p className="text-gray-500">10 questions · {TIME_PER_Q} seconds each · Go as fast as you can!</p>
      <button onClick={start} className="px-8 py-4 bg-rose-500 text-white rounded-2xl font-black text-lg hover:bg-rose-600 transition">Start!</button>
      <button onClick={onExit} className="text-sm text-gray-400">← Back</button>
    </div>
  )

  if (phase === 'done') {
    const pct = Math.round((score / questions.length) * 100)
    return (
      <div className="max-w-lg mx-auto p-4 flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
        <div className="text-6xl">{pct >= 80 ? '🏆' : pct >= 50 ? '🎯' : '💪'}</div>
        <h2 className="text-2xl font-black">Finished!</h2>
        <p className="text-5xl font-black text-rose-500">{score}/{questions.length}</p>
        <p className="text-gray-500">{pct}% accuracy</p>
        <div className="flex gap-3">
          <button onClick={start} className="px-6 py-3 bg-rose-500 text-white rounded-2xl font-bold">Try Again</button>
          <button onClick={onExit} className="px-6 py-3 bg-gray-100 text-gray-700 rounded-2xl font-bold">Exit</button>
        </div>
      </div>
    )
  }

  const q = questions[index]
  const isMultiChoice = q.type === 'multiple_choice' && q.options
  const opts = isMultiChoice ? (q.options as string[]) : null

  return (
    <div className="max-w-lg mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <span className="font-bold text-rose-500">Score: {score}</span>
        <div className={`text-xl font-black ${timeLeft <= 3 ? 'text-red-500 animate-ping' : 'text-gray-700'}`}>{timeLeft}s</div>
        <span className="text-sm text-gray-400">{index + 1}/{questions.length}</span>
      </div>

      {/* Timer bar */}
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full bg-rose-500 transition-all duration-1000 rounded-full" style={{ width: `${(timeLeft / TIME_PER_Q) * 100}%` }} />
      </div>

      <div className={`rounded-3xl p-6 min-h-24 flex items-center justify-center text-center transition-colors ${feedback === true ? 'bg-green-50' : feedback === false ? 'bg-red-50' : 'bg-rose-50'}`}>
        <p className="text-lg font-bold text-gray-900">{q.question_text}</p>
      </div>

      {opts ? (
        <div className="grid grid-cols-2 gap-2">
          {opts.map(opt => (
            <button
              key={opt}
              onClick={() => advance(opt)}
              disabled={selected !== null}
              className={`py-3 px-3 rounded-2xl text-sm font-semibold text-left transition ${
                selected === opt
                  ? opt === q.correct_answer ? 'bg-green-500 text-white' : 'bg-red-400 text-white'
                  : selected !== null && opt === q.correct_answer ? 'bg-green-100 text-green-800'
                  : 'bg-white border-2 border-gray-100 hover:border-rose-300 text-gray-800'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      ) : (
        <div className="bg-indigo-50 rounded-2xl p-4 text-center">
          <p className="text-2xl font-black text-indigo-700">{q.correct_answer}</p>
          <p className="text-xs text-gray-400 mt-1">Answer revealed — typed answers auto-show in speed mode</p>
          <button onClick={() => advance(q.correct_answer)} className="mt-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm">Got it ✓</button>
        </div>
      )}
    </div>
  )
}
