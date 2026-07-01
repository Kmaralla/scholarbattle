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

  function buildCards() {
    const qs = getQuestionsForBattle(subject, grade, 6)
    const deck: Card[] = []
    qs.forEach((q, i) => {
      const pairId = `pair-${i}`
      deck.push({ id: `q-${i}`, content: q.question_text.slice(0, 60), pairId, type: 'q' })
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
    setLock(false)
  }

  useEffect(() => { buildCards() }, [])

  function handleFlip(card: Card) {
    if (lock || flipped.includes(card.id) || matched.has(card.pairId)) return
    const newFlipped = [...flipped, card.id]
    setFlipped(newFlipped)

    if (newFlipped.length === 2) {
      setMoves(m => m + 1)
      setLock(true)
      const [id1, id2] = newFlipped
      const c1 = cards.find(c => c.id === id1)!
      const c2 = cards.find(c => c.id === id2)!
      if (c1.pairId === c2.pairId) {
        setMatched(m => new Set(m).add(c1.pairId))
        setFlipped([])
        setLock(false)
      } else {
        setTimeout(() => { setFlipped([]); setLock(false) }, 900)
      }
    }
  }

  const done = matched.size === cards.length / 2 && cards.length > 0

  return (
    <div className="max-w-lg mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <button onClick={onExit} className="text-sm text-gray-500 hover:text-gray-700">← Back</button>
        <span className="text-sm font-bold text-gray-600">Moves: {moves}</span>
        <span className="text-sm text-gray-400">{matched.size}/{cards.length / 2} matched</span>
      </div>

      {done && (
        <div className="bg-green-50 rounded-2xl p-4 text-center">
          <p className="text-2xl font-black text-green-700">🎉 You matched them all in {moves} moves!</p>
          <button onClick={buildCards} className="mt-2 px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm">Play Again</button>
        </div>
      )}

      <div className="grid grid-cols-3 gap-2">
        {cards.map(card => {
          const isFlipped = flipped.includes(card.id) || matched.has(card.pairId)
          const isMatched = matched.has(card.pairId)
          return (
            <button
              key={card.id}
              onClick={() => handleFlip(card)}
              className={`h-20 rounded-2xl text-xs font-semibold p-2 transition-all leading-tight ${
                isMatched ? 'bg-green-100 text-green-800 border-2 border-green-300' :
                isFlipped ? (card.type === 'q' ? 'bg-indigo-100 text-indigo-900 border-2 border-indigo-300' : 'bg-orange-100 text-orange-900 border-2 border-orange-300') :
                'bg-white/5 text-transparent hover:bg-white/10'
              }`}
            >
              {isFlipped ? card.content : '?'}
            </button>
          )
        })}
      </div>
    </div>
  )
}
