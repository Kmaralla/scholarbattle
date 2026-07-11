'use client'
import { useState } from 'react'
import { getQuestionsForBattle } from '@/lib/questions'
import { Subject } from '@/types'

export function FlashcardsGame({ subject, grade, onExit }: { subject: Subject; grade: number; onExit: () => void }) {
  const [questions] = useState(() => getQuestionsForBattle(subject, grade, 12))
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [mastered, setMastered] = useState<Set<number>>(new Set())
  const [review, setReview] = useState<Set<number>>(new Set())
  const [done, setDone] = useState(false)

  const q = questions[index]
  const progress = ((index) / questions.length) * 100

  function mark(know: boolean) {
    if (know) setMastered(s => new Set(s).add(index))
    else setReview(s => new Set(s).add(index))
    setFlipped(false)
    if (index + 1 >= questions.length) { setDone(true); return }
    setTimeout(() => setIndex(i => i + 1), 120)
  }

  function restart() {
    setIndex(0); setFlipped(false); setMastered(new Set()); setReview(new Set()); setDone(false)
  }

  if (done) {
    const pct = Math.round((mastered.size / questions.length) * 100)
    return (
      <div className="max-w-lg mx-auto p-4 flex flex-col items-center justify-center min-h-[70vh] gap-5 text-center">
        <div className="text-6xl">{pct >= 80 ? '🏆' : pct >= 50 ? '🎯' : '📚'}</div>
        <h2 className="text-2xl font-black text-white">Session Complete!</h2>
        <div className="w-full max-w-xs bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-green-400 font-bold">✓ Mastered</span>
            <span className="text-green-400 font-black">{mastered.size}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-yellow-400 font-bold">↩ Review again</span>
            <span className="text-yellow-400 font-black">{review.size}</span>
          </div>
          <div className="h-px bg-white/10" />
          <div className="flex justify-between text-sm">
            <span className="text-white/60">Score</span>
            <span className="text-white font-black">{pct}%</span>
          </div>
        </div>
        <div className="flex gap-3 w-full max-w-xs">
          <button onClick={restart} className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black transition">Study Again</button>
          <button onClick={onExit} className="flex-1 py-3 bg-white/10 hover:bg-white/15 text-white rounded-2xl font-black transition">Exit</button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto p-4 space-y-5 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button onClick={onExit} className="text-sm text-white/50 hover:text-white transition">← Back</button>
        <div className="flex items-center gap-3">
          <span className="text-xs text-green-400 font-bold">{mastered.size} ✓</span>
          <span className="text-xs text-white/40">{index + 1}/{questions.length}</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div className="h-full bg-indigo-500 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
      </div>

      {/* Card */}
      <div
        className="relative cursor-pointer select-none"
        onClick={() => setFlipped(f => !f)}
      >
        <div className={`rounded-3xl border p-8 min-h-52 flex flex-col items-center justify-center text-center transition-all duration-200 ${
          flipped
            ? 'bg-indigo-500/20 border-indigo-400/40'
            : 'bg-white/5 border-white/10 hover:bg-white/8 hover:border-white/20'
        }`}>
          <p className={`text-[11px] font-black uppercase tracking-widest mb-4 ${flipped ? 'text-indigo-300' : 'text-white/30'}`}>
            {flipped ? 'Answer' : 'Question — tap to flip'}
          </p>
          <p className={`text-lg font-bold leading-snug ${flipped ? 'text-white' : 'text-white/90'}`}>
            {flipped ? q.correct_answer : q.question_text}
          </p>
          {!flipped && (
            <div className="mt-6 flex gap-1">
              {[0,1,2].map(i => (
                <div key={i} className="w-1.5 h-1.5 rounded-full bg-white/20 animate-pulse" style={{ animationDelay: `${i*0.2}s` }} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Action buttons — only after flip */}
      {flipped ? (
        <div className="flex gap-3">
          <button
            onClick={() => mark(false)}
            className="flex-1 py-4 rounded-2xl bg-red-500/20 border border-red-400/30 text-red-300 font-black hover:bg-red-500/30 transition-all text-sm"
          >
            ↩ Review again
          </button>
          <button
            onClick={() => mark(true)}
            className="flex-1 py-4 rounded-2xl bg-green-500/20 border border-green-400/30 text-green-300 font-black hover:bg-green-500/30 transition-all text-sm"
          >
            ✓ Got it!
          </button>
        </div>
      ) : (
        <p className="text-center text-xs text-white/25">Tap the card to see the answer</p>
      )}

      {/* Remaining pills */}
      <div className="flex gap-1 justify-center flex-wrap">
        {questions.map((_, i) => (
          <div key={i} className={`w-2 h-2 rounded-full transition-all ${
            i < index
              ? mastered.has(i) ? 'bg-green-400' : 'bg-yellow-400'
              : i === index ? 'bg-indigo-400 scale-125' : 'bg-white/15'
          }`} />
        ))}
      </div>
    </div>
  )
}
