'use client'
import { useState } from 'react'
import { getWordGameQuestions } from '@/lib/questions'
import { Subject } from '@/types'

function scramble(word: string): string[] {
  const letters = word.split('')
  for (let i = letters.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [letters[i], letters[j]] = [letters[j], letters[i]]
  }
  // Guarantee it's actually scrambled for words long enough to allow it
  if (letters.join('') === word && word.length > 1) {
    [letters[0], letters[1]] = [letters[1], letters[0]]
  }
  return letters
}

export function WordScrambleGame({ subject, grade, onExit }: { subject: Subject; grade: number; onExit: () => void }) {
  const [rounds] = useState(() => getWordGameQuestions(subject, grade, 8))
  const [phase, setPhase] = useState<'ready' | 'playing' | 'done'>('ready')
  const [index, setIndex] = useState(0)
  const [scrambled, setScrambled] = useState<string[]>([])
  const [picked, setPicked] = useState<number[]>([]) // indices into scrambled
  const [wins, setWins] = useState(0)
  const [roundOver, setRoundOver] = useState<'won' | 'lost' | null>(null)

  const round = rounds[index]
  const word = (round?.correct_answer ?? '').toUpperCase()

  function setupRound(i: number) {
    setScrambled(scramble((rounds[i].correct_answer ?? '').toUpperCase()))
    setPicked([])
    setRoundOver(null)
  }

  function start() {
    setPhase('playing'); setIndex(0); setWins(0)
    setScrambled(scramble((rounds[0].correct_answer ?? '').toUpperCase()))
    setPicked([])
    setRoundOver(null)
  }

  function pickLetter(i: number) {
    if (roundOver || picked.includes(i)) return
    setPicked(p => [...p, i])
  }

  function unpickLast() {
    if (roundOver) return
    setPicked(p => p.slice(0, -1))
  }

  function submitGuess() {
    if (roundOver || picked.length !== scrambled.length) return
    const guess = picked.map(i => scrambled[i]).join('')
    if (guess === word) {
      setRoundOver('won')
      setWins(w => w + 1)
    } else {
      setRoundOver('lost')
    }
  }

  function nextRound() {
    if (index + 1 >= rounds.length) { setPhase('done'); return }
    const next = index + 1
    setIndex(next)
    setupRound(next)
  }

  if (phase === 'ready') return (
    <div className="max-w-lg mx-auto p-4 flex flex-col items-center justify-center min-h-[70vh] gap-5 text-center">
      <div className="text-6xl float">🔤</div>
      <h2 className="text-2xl font-black text-white">Word Scramble</h2>
      <p className="text-white/50 text-sm">Tap the letters in order to unscramble the word</p>
      <button onClick={start} className="px-10 py-4 bg-emerald-500 hover:bg-emerald-400 text-white rounded-2xl font-black text-lg transition-all hover:scale-105">
        Start!
      </button>
      <button onClick={onExit} className="text-sm text-white/30 hover:text-white/60 transition">← Back</button>
    </div>
  )

  if (phase === 'done') {
    const pct = Math.round((wins / rounds.length) * 100)
    return (
      <div className="max-w-lg mx-auto p-4 flex flex-col items-center justify-center min-h-[70vh] gap-5 text-center">
        <div className="text-6xl">{pct >= 80 ? '🏆' : pct >= 50 ? '🎯' : '💪'}</div>
        <h2 className="text-2xl font-black text-white">Finished!</h2>
        <p className="text-6xl font-black text-emerald-400">{wins}<span className="text-2xl text-white/40">/{rounds.length}</span></p>
        <p className="text-white/40 text-sm">words unscrambled</p>
        <div className="flex gap-3">
          <button onClick={start} className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-white rounded-2xl font-black transition">Play Again</button>
          <button onClick={onExit} className="px-6 py-3 bg-white/10 hover:bg-white/15 text-white rounded-2xl font-black transition">Exit</button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto p-4 space-y-5 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button onClick={onExit} className="text-sm text-white/50 hover:text-white transition">← Back</button>
        <span className="text-xs text-white/40">Word {index + 1}/{rounds.length}</span>
        <span className="text-xs text-emerald-300 font-bold">{wins} ✓</span>
      </div>

      {/* Clue */}
      <p className="text-center text-sm text-white/60 italic">"{round.question_text}"</p>

      {/* Answer slots */}
      <div className="flex flex-wrap justify-center gap-2">
        {scrambled.map((_, slot) => {
          const letterIdx = picked[slot]
          return (
            <button
              key={slot}
              onClick={slot === picked.length - 1 ? unpickLast : undefined}
              className={`w-9 h-11 rounded-lg border-2 flex items-center justify-center text-lg font-black transition-all ${
                letterIdx !== undefined
                  ? roundOver === 'lost' ? 'border-red-400/50 bg-red-500/10 text-white'
                    : roundOver === 'won' ? 'border-green-400/50 bg-green-500/10 text-white'
                    : 'border-emerald-400/50 bg-emerald-500/10 text-white cursor-pointer'
                  : 'border-white/15 border-dashed'
              }`}
            >
              {letterIdx !== undefined ? scrambled[letterIdx] : ''}
            </button>
          )
        })}
      </div>

      {/* Letter tiles */}
      {!roundOver && (
        <div className="flex flex-wrap justify-center gap-2">
          {scrambled.map((letter, i) => (
            <button
              key={i}
              onClick={() => pickLetter(i)}
              disabled={picked.includes(i)}
              className={`w-10 h-12 rounded-xl text-lg font-black transition-all ${
                picked.includes(i)
                  ? 'bg-white/5 text-white/15 cursor-not-allowed'
                  : 'bg-emerald-500/20 border border-emerald-400/30 text-white hover:bg-emerald-500/30 active:scale-95'
              }`}
            >
              {letter}
            </button>
          ))}
        </div>
      )}

      {!roundOver && picked.length === scrambled.length && (
        <button onClick={submitGuess} className="w-full py-3.5 rounded-2xl font-black text-white bg-emerald-500 hover:bg-emerald-400 transition-all text-sm">
          Submit ✓
        </button>
      )}

      {roundOver && (
        <div className="text-center space-y-3">
          <p className={`font-black text-lg ${roundOver === 'won' ? 'text-green-400' : 'text-red-400'}`}>
            {roundOver === 'won' ? '✓ Correct!' : `✗ The word was ${word}`}
          </p>
          <button onClick={nextRound} className="px-8 py-3 bg-emerald-500 hover:bg-emerald-400 text-white rounded-2xl font-black text-sm transition">
            {index + 1 >= rounds.length ? 'See Results →' : 'Next Word →'}
          </button>
        </div>
      )}
    </div>
  )
}
