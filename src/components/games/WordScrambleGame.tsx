'use client'
import { useState } from 'react'
import { Subject } from '@/types'

const WORD_BANKS: Record<string, string[]> = {
  english: ['elephant', 'journey', 'whisper', 'gravity', 'dolphin', 'thunder', 'mystery', 'champion', 'adventure', 'knowledge'],
  science: ['nucleus', 'photon', 'erosion', 'gravity', 'habitat', 'oxygen', 'molecule', 'friction', 'climate', 'ecosystem'],
  history: ['pyramid', 'republic', 'emperor', 'colony', 'slavery', 'treaty', 'congress', 'liberty', 'revolution', 'democracy'],
  math: ['fraction', 'decimal', 'integer', 'equation', 'polygon', 'perimeter', 'quotient', 'factor', 'theorem', 'symmetry'],
}

function scramble(word: string): string {
  const arr = word.split('')
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]]
  }
  const result = arr.join('')
  return result === word ? scramble(word) : result
}

export function WordScrambleGame({ subject, grade, onExit }: { subject: Subject; grade: number; onExit: () => void }) {
  const words = WORD_BANKS[subject] ?? WORD_BANKS.english
  const [index, setIndex] = useState(0)
  const [scrambled, setScrambled] = useState(() => scramble(words[0]))
  const [input, setInput] = useState('')
  const [score, setScore] = useState(0)
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null)
  const [done, setDone] = useState(false)

  function goToNext() {
    const next = index + 1
    if (next >= words.length) {
      setDone(true)
      return
    }
    setIndex(next)
    setScrambled(scramble(words[next]))
    setInput('')
    setFeedback(null)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (feedback) return
    if (input.trim().toLowerCase() === words[index]) {
      setScore(s => s + 1)
      setFeedback('correct')
      setTimeout(goToNext, 800)
    } else {
      setFeedback('wrong')
    }
  }

  function skip() {
    if (feedback) return
    setFeedback('wrong')
  }

  if (done) return (
    <div className="max-w-lg mx-auto p-4 flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
      <div className="text-6xl">{score >= words.length * 0.7 ? '🏆' : '🎯'}</div>
      <h2 className="text-2xl font-black text-white">Game Over!</h2>
      <p className="text-lg font-bold text-indigo-400">{score} / {words.length} correct</p>
      <div className="flex gap-3 mt-2">
        <button onClick={() => { setIndex(0); setScore(0); setDone(false); setScrambled(scramble(words[0])); setInput(''); setFeedback(null) }} className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-bold">Play Again</button>
        <button onClick={onExit} className="px-6 py-3 bg-white/10 text-white rounded-2xl font-bold">Exit</button>
      </div>
    </div>
  )

  const isWrong = feedback === 'wrong'

  return (
    <div className="max-w-lg mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <button onClick={onExit} className="text-sm text-white/50 hover:text-white">← Back</button>
        <span className="font-bold text-indigo-400">Score: {score}</span>
        <span className="text-sm text-white/40">{index + 1}/{words.length}</span>
      </div>

      <div className={`rounded-3xl p-8 text-center transition-colors ${feedback === 'correct' ? 'bg-green-500/20 border border-green-400/30' : isWrong ? 'bg-red-500/20 border border-red-400/30' : 'bg-white/5 border border-white/10'}`}>
        <p className="text-xs text-white/50 mb-2 uppercase tracking-wide">Unscramble this word</p>
        <p className="text-4xl font-black tracking-[0.3em] text-white">{scrambled.toUpperCase()}</p>
        {isWrong && (
          <p className="mt-4 text-base font-bold text-red-300">
            The answer was: <span className="text-white font-black">{words[index]}</span>
          </p>
        )}
      </div>

      {isWrong ? (
        <button
          onClick={goToNext}
          className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-sm transition"
        >
          Next →
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Type your answer..."
            autoFocus
            disabled={!!feedback}
            className="flex-1 px-4 py-3 rounded-2xl border-2 border-white/20 bg-white/5 text-white focus:border-indigo-400 outline-none text-lg font-semibold"
          />
          <button type="submit" className="px-5 py-3 bg-indigo-600 text-white rounded-2xl font-bold">Go</button>
        </form>
      )}

      {!feedback && (
        <button onClick={skip} className="w-full py-2 text-sm text-white/30 hover:text-white/60 transition">
          Skip word
        </button>
      )}
    </div>
  )
}
