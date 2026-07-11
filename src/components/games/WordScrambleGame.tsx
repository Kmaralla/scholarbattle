'use client'
import { useState } from 'react'
import { Subject } from '@/types'

const WORD_BANKS: Record<string, string[]> = {
  english: [
    'elephant', 'journey', 'whisper', 'dolphin', 'thunder', 'mystery', 'champion', 'adventure', 'knowledge', 'silence',
    'blossom', 'courage', 'freedom', 'lantern', 'crystal', 'harmony', 'phantom', 'shelter', 'triumph', 'volcano',
    'blanket', 'cabinet', 'dazzle', 'elegant', 'feather', 'glitter', 'horizon', 'imagine', 'jealous', 'kitchen',
    'laughter', 'meadow', 'nervous', 'opinion', 'painful', 'quarter', 'rainbow', 'shallow', 'thunder', 'umbrella',
    'village', 'warrior', 'xylophone', 'yearning', 'zebra', 'anchor', 'bridges', 'comfort', 'dragon', 'emerald',
  ],
  science: [
    'nucleus', 'photon', 'erosion', 'habitat', 'oxygen', 'molecule', 'friction', 'climate', 'ecosystem', 'gravity',
    'electron', 'protein', 'neutron', 'volcano', 'tornado', 'mineral', 'magnet', 'crystal', 'prism', 'tsunami',
    'bacteria', 'carbon', 'density', 'energy', 'fossil', 'genome', 'helium', 'igneous', 'Jupiter', 'kinetic',
    'larvae', 'metamorphosis', 'nitrogen', 'osmosis', 'photosynthesis', 'quasar', 'radiation', 'sediment', 'thermal', 'ultraviolet',
    'velocity', 'wavelength', 'xylem', 'yeast', 'zodiac', 'algae', 'biome', 'comet', 'diffusion', 'eclipse',
  ],
  history: [
    'pyramid', 'republic', 'emperor', 'colony', 'slavery', 'treaty', 'congress', 'liberty', 'revolution', 'democracy',
    'empire', 'pharaoh', 'gladiator', 'feudal', 'crusade', 'dynasty', 'monarchy', 'senate', 'warrior', 'conquest',
    'artifact', 'barbarian', 'cathedral', 'diplomat', 'explorer', 'fortress', 'guillotine', 'heritage', 'invasion', 'justice',
    'kingdom', 'legion', 'medieval', 'nobility', 'ottoman', 'patriarch', 'quorum', 'rebellion', 'sovereign', 'tribute',
    'uprising', 'victory', 'warfare', 'xenophobia', 'yeoman', 'zealot', 'alliance', 'ballot', 'cavalry', 'decree',
  ],
  math: [
    'fraction', 'decimal', 'integer', 'equation', 'polygon', 'perimeter', 'quotient', 'factor', 'theorem', 'symmetry',
    'algebra', 'calculus', 'diameter', 'exponent', 'formula', 'geometry', 'hexagon', 'infinity', 'median', 'negative',
    'octagon', 'parallel', 'quadrant', 'radius', 'segment', 'tangent', 'variable', 'vector', 'vertex', 'volume',
    'absolute', 'binomial', 'coefficient', 'denominator', 'estimate', 'fibonacci', 'gradient', 'hypotenuse', 'intercept', 'logarithm',
    'multiple', 'numerator', 'obtuse', 'product', 'rational', 'sequence', 'triangle', 'undefined', 'whole', 'zero',
  ],
}

const GAME_SIZE = 10

function pickRandom(arr: string[], n: number): string[] {
  return [...arr].sort(() => Math.random() - 0.5).slice(0, n)
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
  const [words, setWords] = useState(() => pickRandom(WORD_BANKS[subject] ?? WORD_BANKS.english, GAME_SIZE))
  const [index, setIndex] = useState(0)
  const [scrambled, setScrambled] = useState(() => scramble(words[0]))
  const [input, setInput] = useState('')
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [bestStreak, setBestStreak] = useState(0)
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null)
  const [done, setDone] = useState(false)

  function goToNext() {
    const next = index + 1
    if (next >= words.length) { setDone(true); return }
    setIndex(next)
    setScrambled(scramble(words[next]))
    setInput('')
    setFeedback(null)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (feedback) return
    if (input.trim().toLowerCase() === words[index].toLowerCase()) {
      setScore(s => s + 1)
      setStreak(s => { const n = s + 1; setBestStreak(b => Math.max(b, n)); return n })
      setFeedback('correct')
      setTimeout(goToNext, 700)
    } else {
      setStreak(0)
      setFeedback('wrong')
    }
  }

  function skip() {
    if (feedback) return
    setStreak(0)
    setFeedback('wrong')
  }

  function playAgain() {
    const fresh = pickRandom(WORD_BANKS[subject] ?? WORD_BANKS.english, GAME_SIZE)
    setWords(fresh)
    setIndex(0)
    setScrambled(scramble(fresh[0]))
    setInput('')
    setScore(0)
    setStreak(0)
    setBestStreak(0)
    setFeedback(null)
    setDone(false)
  }

  if (done) {
    const pct = Math.round((score / words.length) * 100)
    return (
      <div className="max-w-lg mx-auto p-4 flex flex-col items-center justify-center min-h-[70vh] gap-5 text-center">
        <div className="text-6xl">{pct >= 80 ? '🏆' : pct >= 50 ? '🎯' : '💪'}</div>
        <h2 className="text-2xl font-black text-white">Game Over!</h2>
        <p className="text-6xl font-black text-indigo-400">{score}<span className="text-2xl text-white/40">/{words.length}</span></p>
        <div className="flex gap-6 text-center">
          <div><p className="text-xl font-black text-orange-300">{bestStreak}x</p><p className="text-xs text-white/40">best streak</p></div>
          <div><p className="text-xl font-black text-indigo-300">{pct}%</p><p className="text-xs text-white/40">accuracy</p></div>
        </div>
        <div className="flex gap-3">
          <button onClick={playAgain} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black transition">Play Again</button>
          <button onClick={onExit} className="px-6 py-3 bg-white/10 hover:bg-white/15 text-white rounded-2xl font-black transition">Exit</button>
        </div>
      </div>
    )
  }

  const isWrong = feedback === 'wrong'
  const isCorrect = feedback === 'correct'
  const progress = (index / words.length) * 100

  return (
    <div className="max-w-lg mx-auto p-4 space-y-5 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button onClick={onExit} className="text-sm text-white/50 hover:text-white transition">← Back</button>
        <div className="flex items-center gap-3">
          {streak >= 3 && <span className="text-orange-400 font-black text-sm">🔥{streak}</span>}
          <span className="font-black text-indigo-400">{score} ✓</span>
          <span className="text-xs text-white/40">{index + 1}/{words.length}</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div className="h-full bg-indigo-500 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
      </div>

      {/* Scrambled word card */}
      <div className={`rounded-3xl p-8 text-center border transition-all duration-200 ${
        isCorrect ? 'bg-green-500/20 border-green-400/40' :
        isWrong   ? 'bg-red-500/20 border-red-400/40' :
                    'bg-white/5 border-white/10'
      }`}>
        <p className="text-xs text-white/30 uppercase tracking-widest mb-3">Unscramble this word</p>
        <p className="text-4xl font-black tracking-[0.3em] text-white">{scrambled.toUpperCase()}</p>
        {isCorrect && <p className="mt-3 text-green-400 font-black text-sm">✓ Correct!</p>}
        {isWrong && (
          <p className="mt-3 text-sm font-bold text-red-300">
            The answer was: <span className="text-white font-black">{words[index]}</span>
          </p>
        )}
      </div>

      {/* Input or Next */}
      {isWrong ? (
        <button
          onClick={goToNext}
          className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-sm transition"
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
            className="flex-1 px-4 py-4 rounded-2xl border-2 border-white/15 bg-white/5 text-white focus:border-indigo-400 outline-none text-lg font-semibold placeholder-white/20 transition"
          />
          <button type="submit" disabled={!!feedback} className="px-6 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black transition disabled:opacity-50">
            Go
          </button>
        </form>
      )}

      {!feedback && (
        <button onClick={skip} className="w-full py-2 text-sm text-white/25 hover:text-white/50 transition">
          Skip word
        </button>
      )}
    </div>
  )
}
