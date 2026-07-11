'use client'
import { useState, useEffect } from 'react'
import { getQuestionsForBattle } from '@/lib/questions'
import { Subject } from '@/types'

interface Card { id: string; content: string; pairId: string; type: 'q' | 'a' }

export function MemoryMatchGame({ subject, grade, onExit }: { subject: Subject; grade: number; onExit: () => void }) {
  const [cards, setCards] = useState<Card[]>([])
  const [flipped, setFlipped] = useState<string[]>([])
  const [matched, setMatched] = useState<Set<string>>(new Set())
  const [moves, setMoves] = useState(0)
  const [lock, setLock] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [started, setStarted] = useState(false)
  const [done, setDone] = useState(false)

  function buildCards() {
    const qs = getQuestionsForBattle(subject, grade, 6)
    const deck: Card[] = []
    qs.forEach((q, i) => {
      const pairId = `pair-${i}`
      deck.push({ id: `q-${i}`, content: q.question_text.slice(0, 55), pairId, type: 'q' })
      deck.push({ id: `a-${i}`, content: q.correct_answer, pairId, type: 'a' })
    })
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]]
    }
    setCards(deck)
    setFlipped([])
    setMatched(new Set())
    setMoves(0)
    setElapsed(0)
    setLock(false)
    setDone(false)
    setStarted(false)
  }

  useEffect(() => { buildCards() }, [])

  useEffect(() => {
    if (!started || done) return
    const t = setInterval(() => setElapsed(s => s + 1), 1000)
    return () => clearInterval(t)
  }, [started, done])

  function handleFlip(card: Card) {
    if (lock || flipped.includes(card.id) || matched.has(card.pairId)) return
    if (!started) setStarted(true)
    const newFlipped = [...flipped, card.id]
    setFlipped(newFlipped)

    if (newFlipped.length === 2) {
      setMoves(m => m + 1)
      setLock(true)
      const [id1, id2] = newFlipped
      const c1 = cards.find(c => c.id === id1)!
      const c2 = cards.find(c => c.id === id2)!
      if (c1.pairId === c2.pairId) {
        const newMatched = new Set(matched).add(c1.pairId)
        setMatched(newMatched)
        setFlipped([])
        setLock(false)
        if (newMatched.size === cards.length / 2) setDone(true)
      } else {
        setTimeout(() => { setFlipped([]); setLock(false) }, 900)
      }
    }
  }

  const stars = moves <= 8 ? 3 : moves <= 12 ? 2 : 1
  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  if (done) return (
    <div className="max-w-lg mx-auto p-4 flex flex-col items-center justify-center min-h-[70vh] gap-5 text-center">
      <div className="text-6xl">🎉</div>
      <h2 className="text-2xl font-black text-white">You matched them all!</h2>
      <div className="flex gap-1 text-3xl">
        {Array.from({ length: 3 }).map((_, i) => (
          <span key={i} className={i < stars ? 'opacity-100' : 'opacity-20'}>⭐</span>
        ))}
      </div>
      <div className="flex gap-6">
        <div><p className="text-2xl font-black text-indigo-300">{moves}</p><p className="text-xs text-white/40">moves</p></div>
        <div><p className="text-2xl font-black text-green-300">{fmt(elapsed)}</p><p className="text-xs text-white/40">time</p></div>
      </div>
      <div className="flex gap-3">
        <button onClick={buildCards} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black transition">Play Again</button>
        <button onClick={onExit} className="px-6 py-3 bg-white/10 hover:bg-white/15 text-white rounded-2xl font-black transition">Exit</button>
      </div>
    </div>
  )

  return (
    <div className="max-w-lg mx-auto p-4 space-y-4 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button onClick={onExit} className="text-sm text-white/50 hover:text-white transition">← Back</button>
        <div className="flex gap-4 text-sm">
          <span className="text-white/60">Moves: <span className="font-black text-white">{moves}</span></span>
          <span className="text-white/60">Time: <span className="font-black text-indigo-300">{fmt(elapsed)}</span></span>
        </div>
        <span className="text-xs text-white/40">{matched.size}/{cards.length / 2} ✓</span>
      </div>

      {/* Progress */}
      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-full bg-indigo-500 rounded-full transition-all duration-500"
          style={{ width: `${(matched.size / (cards.length / 2)) * 100}%` }}
        />
      </div>

      {!started && (
        <p className="text-center text-xs text-white/30">Tap any card to start</p>
      )}

      {/* Grid */}
      <div className="grid grid-cols-3 gap-2">
        {cards.map(card => {
          const isFlipped = flipped.includes(card.id) || matched.has(card.pairId)
          const isMatched = matched.has(card.pairId)
          return (
            <button
              key={card.id}
              onClick={() => handleFlip(card)}
              className={`h-24 rounded-2xl text-xs font-semibold p-2.5 transition-all duration-200 leading-snug text-center ${
                isMatched
                  ? 'bg-green-500/20 text-green-300 border-2 border-green-400/40 scale-95'
                  : isFlipped
                  ? card.type === 'q'
                    ? 'bg-indigo-500/25 text-indigo-200 border-2 border-indigo-400/40'
                    : 'bg-violet-500/25 text-violet-200 border-2 border-violet-400/40'
                  : 'bg-white/8 border-2 border-white/10 text-white/0 hover:bg-white/12 hover:border-white/20'
              }`}
            >
              {isFlipped
                ? <span className="text-[11px] leading-tight">{card.content}</span>
                : <span className="text-2xl text-white/20">?</span>
              }
            </button>
          )
        })}
      </div>
    </div>
  )
}
