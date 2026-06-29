'use client'
import { useSearchParams, useRouter } from 'next/navigation'
import { Suspense } from 'react'
import { FlashcardsGame } from '@/components/games/FlashcardsGame'
import { WordScrambleGame } from '@/components/games/WordScrambleGame'
import { MathSprintGame } from '@/components/games/MathSprintGame'
import { HangmanGame } from '@/components/games/HangmanGame'
import { MemoryMatchGame } from '@/components/games/MemoryMatchGame'
import { SpeedQuizGame } from '@/components/games/SpeedQuizGame'
import { Subject } from '@/types'

function GameRouter() {
  const params = useSearchParams()
  const router = useRouter()
  const gameId = params.get('game') ?? 'flashcards'
  const subject = (params.get('subject') ?? 'math') as Subject
  const grade = parseInt(params.get('grade') ?? '5')

  const props = { subject, grade, onExit: () => router.push('/games') }

  switch (gameId) {
    case 'flashcards':    return <FlashcardsGame {...props} />
    case 'word-scramble': return <WordScrambleGame {...props} />
    case 'math-sprint':   return <MathSprintGame {...props} />
    case 'hangman':       return <HangmanGame {...props} />
    case 'memory-match':  return <MemoryMatchGame {...props} />
    case 'speed-quiz':    return <SpeedQuizGame {...props} />
    default:              return <FlashcardsGame {...props} />
  }
}

export default function GamePlayPage() {
  return (
    <Suspense fallback={<div className="p-4 text-center text-gray-400">Loading game...</div>}>
      <GameRouter />
    </Suspense>
  )
}
