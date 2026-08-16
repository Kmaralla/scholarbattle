'use client'
import { useSearchParams, useRouter } from 'next/navigation'
import { Suspense } from 'react'
import { FlashcardsGame } from '@/components/games/FlashcardsGame'
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
    case 'flashcards': return <FlashcardsGame {...props} />
    case 'speed-quiz': return <SpeedQuizGame {...props} />
    default:            return <FlashcardsGame {...props} />
  }
}

export default function GamePlayPage() {
  return (
    <Suspense fallback={<div className="p-4 text-center text-gray-400">Loading game...</div>}>
      <GameRouter />
    </Suspense>
  )
}
