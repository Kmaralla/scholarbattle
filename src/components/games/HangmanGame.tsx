'use client'
import { useState } from 'react'
import { Subject } from '@/types'

const WORD_BANKS: Record<string, string[]> = {
  english: ['whisper', 'journey', 'thunder', 'mystery', 'champion', 'adventure', 'knowledge', 'language', 'sentence', 'freedom', 'crystal', 'harmony', 'triumph', 'courage', 'volcano'],
  science: ['nucleus', 'photon', 'erosion', 'habitat', 'molecule', 'friction', 'climate', 'ecosystem', 'organism', 'electron', 'protein', 'osmosis', 'bacteria', 'density', 'gravity'],
  history: ['republic', 'emperor', 'colony', 'slavery', 'treaty', 'congress', 'liberty', 'revolution', 'democracy', 'dynasty', 'monarchy', 'crusade', 'gladiator', 'pharaoh', 'conquest'],
  math: ['fraction', 'decimal', 'integer', 'equation', 'polygon', 'perimeter', 'quotient', 'theorem', 'symmetry', 'algebra', 'calculus', 'exponent', 'variable', 'hypotenuse', 'geometry'],
}
const ALPHABET = 'abcdefghijklmnopqrstuvwxyz'.split('')
const MAX_WRONG = 6

function pickWord(words: string[]) {
  return words[Math.floor(Math.random() * words.length)]
}

export function HangmanGame({ subject, grade, onExit }: { subject: Subject; grade: number; onExit: () => void }) {
  const words = WORD_BANKS[subject] ?? WORD_BANKS.english
  const [word, setWord] = useState(() => pickWord(words))
  const [guessed, setGuessed] = useState<Set<string>>(new Set())
  const [score, setScore] = useState(0)
  const [round, setRound] = useState(1)

  const wrong = [...guessed].filter(l => !word.includes(l))
  const wrongCount = wrong.length
  const won = word.split('').every(l => guessed.has(l))
  const lost = wrongCount >= MAX_WRONG
  const livesLeft = MAX_WRONG - wrongCount

  function guess(letter: string) {
    if (guessed.has(letter) || won || lost) return
    setGuessed(g => new Set(g).add(letter))
  }

  function nextWord() {
    if (won) setScore(s => s + 1)
    setGuessed(new Set())
    setWord(pickWord(words))
    setRound(r => r + 1)
  }

  const hangedParts = [
    <circle key="head" cx="140" cy="58" r="18" strokeWidth="3" stroke="#f87171" fill="none" />,
    <line key="body" x1="140" y1="76" x2="140" y2="140" strokeWidth="3" stroke="#f87171" />,
    <line key="larm" x1="140" y1="95" x2="105" y2="122" strokeWidth="3" stroke="#f87171" />,
    <line key="rarm" x1="140" y1="95" x2="175" y2="122" strokeWidth="3" stroke="#f87171" />,
    <line key="lleg" x1="140" y1="140" x2="105" y2="175" strokeWidth="3" stroke="#f87171" />,
    <line key="rleg" x1="140" y1="140" x2="175" y2="175" strokeWidth="3" stroke="#f87171" />,
  ]

  return (
    <div className="max-w-lg mx-auto p-4 space-y-4 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button onClick={onExit} className="text-sm text-white/50 hover:text-white transition">← Back</button>
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/40">Round {round}</span>
          <span className="text-xs font-black text-indigo-400">Score: {score}</span>
        </div>
        <div className="flex gap-1">
          {Array.from({ length: MAX_WRONG }).map((_, i) => (
            <span key={i} className={`text-base transition-all ${i < livesLeft ? 'opacity-100' : 'opacity-20 grayscale'}`}>❤️</span>
          ))}
        </div>
      </div>

      {/* Gallows */}
      <div className="flex justify-center">
        <svg viewBox="0 0 220 200" className="w-44 h-36">
          <line x1="10" y1="195" x2="210" y2="195" strokeWidth="4" stroke="rgba(255,255,255,0.2)" />
          <line x1="55" y1="10" x2="55" y2="195" strokeWidth="4" stroke="rgba(255,255,255,0.2)" />
          <line x1="55" y1="10" x2="140" y2="10" strokeWidth="4" stroke="rgba(255,255,255,0.2)" />
          <line x1="140" y1="10" x2="140" y2="40" strokeWidth="4" stroke="rgba(255,255,255,0.2)" />
          {hangedParts.slice(0, wrongCount)}
        </svg>
      </div>

      {/* Word display */}
      <div className="flex gap-2 justify-center flex-wrap px-4">
        {word.split('').map((l, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <span className={`text-2xl font-black min-w-[1.5rem] text-center transition-all ${
              guessed.has(l) ? (won ? 'text-green-400' : 'text-white') : lost ? 'text-red-400' : 'text-transparent'
            }`}>
              {guessed.has(l) || lost ? l : '_'}
            </span>
            <div className="h-0.5 w-7 bg-white/30 rounded" />
          </div>
        ))}
      </div>

      {/* Win / lose banner */}
      {(won || lost) && (
        <div className={`rounded-2xl p-4 text-center border ${won ? 'bg-green-500/15 border-green-400/30' : 'bg-red-500/15 border-red-400/30'}`}>
          <p className="font-black text-lg text-white">{won ? '🎉 Correct!' : `💀 It was: ${word}`}</p>
          <button
            onClick={nextWord}
            className="mt-3 px-8 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-black text-sm transition"
          >
            Next Word →
          </button>
        </div>
      )}

      {/* Alphabet */}
      <div className="flex flex-wrap gap-1.5 justify-center">
        {ALPHABET.map(l => {
          const isGuessed = guessed.has(l)
          const isCorrect = isGuessed && word.includes(l)
          const isWrong = isGuessed && !word.includes(l)
          return (
            <button
              key={l}
              onClick={() => guess(l)}
              disabled={isGuessed || won || lost}
              className={`w-9 h-9 rounded-xl text-sm font-black uppercase transition-all ${
                isCorrect ? 'bg-green-500/30 text-green-300 border border-green-400/40' :
                isWrong   ? 'bg-red-500/20 text-red-400/60 border border-red-400/20' :
                            'bg-white/8 border border-white/15 text-white/80 hover:bg-indigo-500/30 hover:text-white hover:border-indigo-400/40'
              } disabled:cursor-not-allowed`}
            >
              {l}
            </button>
          )
        })}
      </div>
    </div>
  )
}
