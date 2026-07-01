'use client'
import { useState } from 'react'
import { getQuestionsForBattle } from '@/lib/questions'
import { Subject } from '@/types'
import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react'

export function FlashcardsGame({ subject, grade, onExit }: { subject: Subject; grade: number; onExit: () => void }) {
  const [questions] = useState(() => getQuestionsForBattle(subject, grade, 10))
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [seen, setSeen] = useState<Set<number>>(new Set())

  const q = questions[index]

  function next() {
    setSeen(s => new Set(s).add(index))
    setFlipped(false)
    setTimeout(() => setIndex(i => Math.min(i + 1, questions.length - 1)), 150)
  }
  function prev() {
    setFlipped(false)
    setTimeout(() => setIndex(i => Math.max(i - 1, 0)), 150)
  }

  return (
    <div className="max-w-lg mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <button onClick={onExit} className="text-sm text-gray-500 hover:text-gray-700">← Back</button>
        <span className="text-sm font-semibold text-gray-600">{index + 1} / {questions.length}</span>
        <span className="text-xs text-gray-400">{seen.size} studied</span>
      </div>

      <div className="relative h-64 cursor-pointer" onClick={() => setFlipped(f => !f)}>
        <div className={`absolute inset-0 rounded-3xl shadow-lg flex flex-col items-center justify-center p-6 text-center transition-all duration-300 ${flipped ? 'bg-indigo-600 text-white' : 'bg-slate-800 border-2 border-white/10'}`}>
          <p className="text-xs font-semibold uppercase tracking-wide mb-2 opacity-60">{flipped ? 'Answer' : 'Question'}</p>
          <p className="text-lg font-bold leading-snug">{flipped ? q.correct_answer : q.question_text}</p>
          {!flipped && <p className="mt-4 text-xs text-gray-400">Tap to reveal answer</p>}
        </div>
      </div>

      <div className="flex gap-3">
        <button onClick={prev} disabled={index === 0} className="flex-1 flex items-center justify-center gap-1 py-3 rounded-2xl bg-white/10 text-white disabled:opacity-30 font-semibold">
          <ChevronLeft className="w-4 h-4" /> Prev
        </button>
        {index < questions.length - 1 ? (
          <button onClick={next} className="flex-1 flex items-center justify-center gap-1 py-3 rounded-2xl bg-indigo-600 text-white font-semibold">
            Next <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button onClick={() => { setIndex(0); setFlipped(false); setSeen(new Set()) }} className="flex-1 flex items-center justify-center gap-1 py-3 rounded-2xl bg-green-600 text-white font-semibold">
            <RotateCcw className="w-4 h-4" /> Restart
          </button>
        )}
      </div>
    </div>
  )
}
