'use client'
import { useState } from 'react'
import { TopicPicker } from '@/components/battle/TopicPicker'
import { Subject } from '@/types'
import { type BotDifficulty } from '@/components/battle/BattleRoom'
import { Card, CardContent } from '@/components/ui/card'
import { Swords } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

const DIFFICULTIES: { value: BotDifficulty; label: string; desc: string }[] = [
  { value: 'easy',   label: '🟢 Easy',   desc: 'Slow & sometimes wrong' },
  { value: 'medium', label: '🟡 Medium', desc: 'Balanced challenger'     },
  { value: 'hard',   label: '🔴 Hard',   desc: 'Fast & usually right'   },
]

const TIME_OPTIONS = [10, 15, 20, 30]

export default function BattlePage() {
  const [step, setStep] = useState<'pick' | 'finding'>('pick')
  const [difficulty, setDifficulty] = useState<BotDifficulty>('medium')
  const [timeout, setTimeout_] = useState(15)
  const router = useRouter()
  const supabase = createClient()

  async function handleSelect(subject: Subject, grade: number, topic: string) {
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
      router.push(`/battle/${battle.id}?difficulty=${difficulty}&timeout=${timeout}`)
    } else {
      console.error('[Battle] insert failed:', battleErr?.message)
      setStep('pick')
    }
  }

  return (
    <div className="max-w-lg mx-auto p-3 space-y-2.5">
      <div className="flex items-center gap-2">
        <Swords className="w-5 h-5 text-indigo-600" />
        <h1 className="text-lg font-black text-white">Practice Battle</h1>
        <span className="text-xs text-white/40">vs <span className="text-indigo-400 font-semibold">Scholar Bot 🎓</span></span>
      </div>

      <Card>
        <CardContent className="p-3 space-y-2.5">
          {/* Difficulty picker — compact row */}
          <div>
            <p className="text-xs font-bold text-white/50 uppercase tracking-wider mb-1.5">Bot Difficulty</p>
            <div className="flex gap-2">
              {DIFFICULTIES.map(d => (
                <button
                  key={d.value}
                  onClick={() => setDifficulty(d.value)}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl border-2 text-xs font-black transition-all',
                    difficulty === d.value
                      ? 'border-indigo-400 bg-indigo-500/20 text-white'
                      : 'border-white/10 hover:border-white/20 bg-white/5 text-white/70'
                  )}
                >
                  {d.label}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-white/40 mt-1 pl-1">{DIFFICULTIES.find(d => d.value === difficulty)?.desc}</p>
          </div>

          {/* Time per question */}
          <div>
            <p className="text-xs font-bold text-white/50 uppercase tracking-wider mb-1.5">Time per Question</p>
            <div className="flex gap-2">
              {TIME_OPTIONS.map(t => (
                <button
                  key={t}
                  onClick={() => setTimeout_(t)}
                  className={cn(
                    'flex-1 py-2 rounded-xl border-2 text-sm font-black transition-all',
                    timeout === t
                      ? 'border-indigo-400 bg-indigo-500/20 text-white'
                      : 'border-white/10 bg-white/5 text-white/50 hover:border-white/20 hover:text-white'
                  )}
                >
                  {t}s
                </button>
              ))}
            </div>
          </div>

          {step === 'pick' && <TopicPicker onSelect={handleSelect} />}
          {step === 'finding' && (
            <div className="text-center py-8 space-y-2">
              <div className="text-4xl animate-bounce">⚔️</div>
              <p className="font-bold text-white/70">Setting up your battle...</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
