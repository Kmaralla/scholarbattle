'use client'
import { useState } from 'react'
import { getWordGameQuestions } from '@/lib/questions'
import { Subject } from '@/types'

const MAX_WRONG = 6
const KEYBOARD_ROWS = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM']

const HANGMAN_STAGES = [
  '',
  '🙂',
  '🙂\n│',
  '🙂\n┼│',
  '🙂\n┼│┼',
  '😬\n┼│┼\n╱',
  '😵\n┼│┼\n╱ ╲',
]

export function HangmanGame({ subject, grade, onExit }: { subject: Subject; grade: number; onExit: () => void }) {
  const [rounds] = useState(() => getWordGameQuestions(subject, grade, 8))
  const [phase, setPhase] = useState<'ready' | 'playing' | 'done'>('ready')
  const [index, setIndex] = useState(0)
  const [guessed, setGuessed] = useState<Set<string>>(new Set())
  const [wrongCount, setWrongCount] = useState(0)
  const [wins, setWins] = useState(0)
  const [roundOver, setRoundOver] = useState<'won' | 'lost' | null>(null)

  const round = rounds[index]
  const word = (round?.correct_answer ?? '').toUpperCase()
  const letters = word.split('')
  const solved = letters.length > 0 && letters.every(l => guessed.has(l))

  function start() {
    setPhase('playing'); setIndex(0); setWins(0)
    setGuessed(new Set()); setWrongCount(0); setRoundOver(null)
  }

  function guess(letter: string) {
    if (roundOver || guessed.has(letter)) return
    const next = new Set(guessed).add(letter)
    setGuessed(next)
    if (!word.includes(letter)) {
      const wc = wrongCount + 1
      setWrongCount(wc)
      if (wc >= MAX_WRONG) setRoundOver('lost')
    } else if (letters.every(l => next.has(l))) {
      setRoundOver('won')
      setWins(w => w + 1)
    }
  }

  function nextRound() {
    if (index + 1 >= rounds.length) { setPhase('done'); return }
    setIndex(i => i + 1)
    setGuessed(new Set())
    setWrongCount(0)
    setRoundOver(null)
  }

  if (phase === 'ready') return (
    <div className="max-w-lg mx-auto p-4 flex flex-col items-center justify-center min-h-[70vh] gap-5 text-center">
      <div className="text-6xl float">🪢</div>
      <h2 className="text-2xl font-black text-white">Hangman</h2>
      <p className="text-white/50 text-sm">Guess the word letter by letter · {MAX_WRONG} wrong guesses allowed</p>
      <button onClick={start} className="px-10 py-4 bg-orange-500 hover:bg-orange-400 text-white rounded-2xl font-black text-lg transition-all hover:scale-105">
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
        <p className="text-6xl font-black text-orange-400">{wins}<span className="text-2xl text-white/40">/{rounds.length}</span></p>
        <p className="text-white/40 text-sm">words guessed</p>
        <div className="flex gap-3">
          <button onClick={start} className="px-6 py-3 bg-orange-500 hover:bg-orange-400 text-white rounded-2xl font-black transition">Play Again</button>
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
        <span className="text-xs text-orange-300 font-bold">{wins} ✓</span>
      </div>

      {/* Hangman figure + wrong count */}
      <div className="rounded-3xl bg-white/5 border border-white/10 p-6 flex flex-col items-center gap-2">
        <pre className="text-3xl leading-tight whitespace-pre">{HANGMAN_STAGES[wrongCount]}</pre>
        <p className="text-xs text-white/40">{MAX_WRONG - wrongCount} guesses left</p>
      </div>

      {/* Clue */}
      <p className="text-center text-sm text-white/60 italic">"{round.question_text}"</p>

      {/* Word blanks */}
      <div className="flex flex-wrap justify-center gap-2">
        {letters.map((l, i) => (
          <div key={i} className={`w-9 h-11 rounded-lg border-2 flex items-center justify-center text-lg font-black ${
            guessed.has(l) ? 'border-orange-400/50 bg-orange-500/10 text-white' : 'border-white/15 text-transparent'
          }`}>
            {guessed.has(l) || roundOver ? l : ''}
          </div>
        ))}
      </div>

      {roundOver ? (
        <div className="text-center space-y-3">
          <p className={`font-black text-lg ${roundOver === 'won' ? 'text-green-400' : 'text-red-400'}`}>
            {roundOver === 'won' ? '✓ You got it!' : `✗ The word was ${word}`}
          </p>
          <button onClick={nextRound} className="px-8 py-3 bg-orange-500 hover:bg-orange-400 text-white rounded-2xl font-black text-sm transition">
            {index + 1 >= rounds.length ? 'See Results →' : 'Next Word →'}
          </button>
        </div>
      ) : (
        <div className="space-y-1.5">
          {KEYBOARD_ROWS.map((row, i) => (
            <div key={i} className="flex justify-center gap-1.5">
              {row.split('').map(letter => {
                const used = guessed.has(letter)
                const correct = used && word.includes(letter)
                return (
                  <button
                    key={letter}
                    onClick={() => guess(letter)}
                    disabled={used}
                    className={`w-8 h-10 rounded-lg text-sm font-black transition-all ${
                      !used ? 'bg-white/10 text-white hover:bg-orange-500/30 active:scale-95'
                      : correct ? 'bg-green-500/30 text-green-300' : 'bg-red-500/20 text-red-400/60'
                    }`}
                  >
                    {letter}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
