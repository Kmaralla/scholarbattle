'use client'
import { useState } from 'react'
import { TopicPicker } from '@/components/battle/TopicPicker'
import { Subject } from '@/types'
import { type BotDifficulty } from '@/components/battle/BattleRoom'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Swords } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

const DIFFICULTIES: { value: BotDifficulty; label: string; desc: string }[] = [
  { value: 'easy',   label: '🟢 Easy',   desc: 'Slow & sometimes wrong' },
  { value: 'medium', label: '🟡 Medium', desc: 'Balanced challenger'     },
  { value: 'hard',   label: '🔴 Hard',   desc: 'Fast & usually right'   },
]

export default function BattlePage() {
  const [step, setStep] = useState<'pick' | 'finding'>('pick')
  const [difficulty, setDifficulty] = useState<BotDifficulty>('medium')
  const router = useRouter()
  const supabase = createClient()

  async function handleSelect(subject: Subject, grade: number) {
    setStep('finding')
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (!user) { setStep('pick'); return }

    const { data: battle, error: battleErr } = await supabase.from('battles').insert({
      challenger_id: user.id,
      opponent_id: user.id,
      subject,
      grade_level: grade,
      status: 'in_progress',
      challenger_score: 0,
      opponent_score: 0,
      question_ids: [],
    }).select().single()

    if (battle) {
      router.push(`/battle/${battle.id}?difficulty=${difficulty}`)
    } else {
      console.error('[Battle] insert failed:', battleErr?.message)
      setStep('pick')
    }
  }

  return (
    <div className="max-w-lg mx-auto p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Swords className="w-6 h-6 text-indigo-600" />
        <h1 className="text-xl font-black text-white">Practice Battle</h1>
      </div>

      <Card>
        <CardHeader>
          <p className="text-sm text-gray-500">
            Battle <span className="font-semibold text-indigo-600">Scholar Bot 🎓</span> — first to answer correctly wins the point!
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Difficulty picker */}
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">Bot Difficulty</p>
            <div className="grid grid-cols-3 gap-2">
              {DIFFICULTIES.map(d => (
                <button
                  key={d.value}
                  onClick={() => setDifficulty(d.value)}
                  className={cn(
                    'flex flex-col items-center gap-1 py-3 px-2 rounded-xl border-2 text-center transition-all',
                    difficulty === d.value
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-200 hover:border-gray-300'
                  )}
                >
                  <span className="text-base font-bold text-dark">{d.label}</span>
                  <span className="text-xs text-gray-500 leading-tight">{d.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {step === 'pick' && <TopicPicker onSelect={handleSelect} />}
          {step === 'finding' && (
            <div className="text-center py-8 space-y-2">
              <div className="text-4xl animate-bounce">⚔️</div>
              <p className="font-bold text-white">Setting up your battle...</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
