'use client'
import { useState, useEffect } from 'react'
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

  function nextWord(idx: number) {
    if (idx >= words.length) { setDone(true); return }
    setScrambled(scramble(words[idx]))
    setInput('')
    setFeedback(null)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (input.trim().toLowerCase() === words[index]) {
      setScore(s => s + 1)
      setFeedback('correct')
    } else {
      setFeedback('wrong')
    }
    setTimeout(() => { setIndex(i => { const next = i + 1; nextWord(next); return next }) }, 800)
  }

  function skip() {
    setFeedback('wrong')
    setTimeout(() => { setIndex(i => { const next = i + 1; nextWord(next); return next }) }, 400)
  }

  if (done) return (
    <div className="max-w-lg mx-auto p-4 flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
      <div className="text-6xl">{score >= words.length * 0.7 ? '🏆' : '🎯'}</div>
      <h2 className="text-2xl font-black text-gray-900">Game Over!</h2>
      <p className="text-lg font-bold text-indigo-600">{score} / {words.length} correct</p>
      <div className="flex gap-3 mt-2">
        <button onClick={() => { setIndex(0); setScore(0); setDone(false); nextWord(0) }} className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-bold">Play Again</button>
        <button onClick={onExit} className="px-6 py-3 bg-white/10 text-white rounded-2xl font-bold">Exit</button>
      </div>
    </div>
  )

  return (
    <div className="max-w-lg mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <button onClick={onExit} className="text-sm text-gray-500 hover:text-gray-700">← Back</button>
        <span className="font-bold text-indigo-600">Score: {score}</span>
        <span className="text-sm text-gray-400">{index + 1}/{words.length}</span>
      </div>

      <div className={`rounded-3xl p-8 text-center transition-colors ${feedback === 'correct' ? 'bg-green-50' : feedback === 'wrong' ? 'bg-red-50' : 'bg-indigo-50'}`}>
        <p className="text-xs text-gray-500 mb-2 uppercase tracking-wide">Unscramble this word</p>
        <p className="text-4xl font-black tracking-[0.3em] text-indigo-700">{scrambled.toUpperCase()}</p>
        {feedback === 'wrong' && <p className="mt-2 text-sm text-red-500">Answer: <span className="font-bold">{words[index]}</span></p>}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Type your answer..."
          autoFocus
          className="flex-1 px-4 py-3 rounded-2xl border-2 border-white/20 bg-white/5 text-white focus:border-indigo-400 outline-none text-lg font-semibold"
        />
        <button type="submit" className="px-5 py-3 bg-indigo-600 text-white rounded-2xl font-bold">Go</button>
      </form>
      <button onClick={skip} className="w-full py-2 text-sm text-gray-400 hover:text-gray-600">Skip word</button>
    </div>
  )
}
