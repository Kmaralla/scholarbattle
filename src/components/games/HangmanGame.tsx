'use client'
import { useState } from 'react'
import { Subject } from '@/types'

const WORD_BANKS: Record<string, string[]> = {
  english: ['whisper', 'journey', 'thunder', 'mystery', 'champion', 'adventure', 'knowledge', 'language', 'sentence'],
  science: ['nucleus', 'photon', 'erosion', 'habitat', 'molecule', 'friction', 'climate', 'ecosystem', 'organism'],
  history: ['republic', 'emperor', 'colony', 'slavery', 'treaty', 'congress', 'liberty', 'revolution', 'democracy'],
  math: ['fraction', 'decimal', 'integer', 'equation', 'polygon', 'perimeter', 'quotient', 'theorem', 'symmetry'],
}
const ALPHABET = 'abcdefghijklmnopqrstuvwxyz'.split('')
const MAX_WRONG = 6

export function HangmanGame({ subject, grade, onExit }: { subject: Subject; grade: number; onExit: () => void }) {
  const words = WORD_BANKS[subject] ?? WORD_BANKS.english
  const [wordIdx, setWordIdx] = useState(() => Math.floor(Math.random() * words.length))
  const [guessed, setGuessed] = useState<Set<string>>(new Set())
  const [score, setScore] = useState(0)

  const word = words[wordIdx]
  const wrong = [...guessed].filter(l => !word.includes(l))
  const wrongCount = wrong.length
  const won = word.split('').every(l => guessed.has(l))
  const lost = wrongCount >= MAX_WRONG

  function guess(letter: string) {
    if (guessed.has(letter) || won || lost) return
    setGuessed(g => new Set(g).add(letter))
  }

  function nextWord() {
    if (won) setScore(s => s + 1)
    setGuessed(new Set())
    setWordIdx(Math.floor(Math.random() * words.length))
  }

  const hangedParts = [
    <circle key="head" cx="140" cy="60" r="20" />,
    <line key="body" x1="140" y1="80" x2="140" y2="150" />,
    <line key="larm" x1="140" y1="100" x2="100" y2="130" />,
    <line key="rarm" x1="140" y1="100" x2="180" y2="130" />,
    <line key="lleg" x1="140" y1="150" x2="100" y2="190" />,
    <line key="rleg" x1="140" y1="150" x2="180" y2="190" />,
  ]

  return (
    <div className="max-w-lg mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <button onClick={onExit} className="text-sm text-gray-500 hover:text-gray-700">← Back</button>
        <span className="font-bold text-indigo-600">Score: {score}</span>
        <span className="text-sm text-gray-400">{MAX_WRONG - wrongCount} lives left</span>
      </div>

      {/* Gallows SVG */}
      <svg viewBox="0 0 220 220" className="w-48 mx-auto">
        <line x1="10" y1="210" x2="210" y2="210" strokeWidth="4" stroke="currentColor" className="text-gray-400" />
        <line x1="60" y1="10" x2="60" y2="210" strokeWidth="4" stroke="currentColor" className="text-gray-400" />
        <line x1="60" y1="10" x2="140" y2="10" strokeWidth="4" stroke="currentColor" className="text-gray-400" />
        <line x1="140" y1="10" x2="140" y2="40" strokeWidth="4" stroke="currentColor" className="text-gray-400" />
        <g strokeWidth="4" stroke="#ef4444" fill="none">
          {hangedParts.slice(0, wrongCount)}
        </g>
      </svg>

      {/* Word display */}
      <div className="flex gap-2 justify-center flex-wrap">
        {word.split('').map((l, i) => (
          <div key={i} className="w-8 border-b-2 border-gray-400 text-center text-xl font-black text-indigo-700">
            {guessed.has(l) ? l : ''}
          </div>
        ))}
      </div>

      {(won || lost) && (
        <div className={`text-center p-3 rounded-2xl ${won ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          <p className="font-black text-lg">{won ? '🎉 Correct!' : `💀 The word was: ${word}`}</p>
          <button onClick={nextWord} className="mt-2 px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm">Next Word</button>
        </div>
      )}

      {/* Alphabet */}
      <div className="flex flex-wrap gap-1.5 justify-center">
        {ALPHABET.map(l => (
          <button
            key={l}
            onClick={() => guess(l)}
            disabled={guessed.has(l) || won || lost}
            className={`w-9 h-9 rounded-lg text-sm font-bold uppercase transition ${
              guessed.has(l)
                ? word.includes(l) ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-500'
                : 'bg-white/5 hover:bg-indigo-500/20 hover:text-indigo-300 text-white/70'
            } disabled:cursor-not-allowed`}
          >
            {l}
          </button>
        ))}
      </div>
    </div>
  )
}
