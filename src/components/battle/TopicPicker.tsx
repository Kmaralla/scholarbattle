'use client'
import { useState } from 'react'
import { Subject } from '@/types'
import { gradeLabel } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { getTopicsForGrade } from '@/lib/questions'

const SUBJECTS: { value: Subject; label: string; emoji: string }[] = [
  { value: 'math',    label: 'Math',    emoji: '🔢' },
  { value: 'science', label: 'Science', emoji: '🔬' },
  { value: 'history', label: 'History', emoji: '📜' },
  { value: 'english', label: 'English', emoji: '📚' },
  { value: 'accelerated_math', label: 'Accel. Math', emoji: '🚀' },
]

const GRADES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]

interface TopicPickerProps {
  onSelect: (subject: Subject, grade: number, topic: string) => void
  onCancel?: () => void
  startLabel?: string
}

export function TopicPicker({ onSelect, onCancel, startLabel = 'Start Battle ⚔️' }: TopicPickerProps) {
  const [subject, setSubject] = useState<Subject | null>(null)
  const [grade, setGrade] = useState<number | null>(null)
  const [topic, setTopic] = useState<string | null>(null)

  function handleSubject(s: Subject) {
    setSubject(s)
    setGrade(null)
    setTopic(null)
  }

  function handleGrade(g: number) {
    setGrade(g)
    setTopic(null)
  }

  const subjectMeta = SUBJECTS.find(s => s.value === subject)
  const topics = subject && grade ? getTopicsForGrade(subject, grade) : []

  return (
    <div className="space-y-2.5">
      {/* Subject */}
      <div>
        <p className="text-xs font-bold text-white/50 uppercase tracking-wider mb-1.5">Pick a Subject</p>
        <div className="grid grid-cols-2 gap-1.5">
          {SUBJECTS.map(s => (
            <button
              key={s.value}
              onClick={() => handleSubject(s.value)}
              className={cn(
                'flex items-center gap-1.5 p-2 rounded-xl border-2 text-xs font-semibold transition-all',
                subject === s.value
                  ? 'border-indigo-400 bg-indigo-500/20 text-white'
                  : 'border-white/10 hover:border-white/20 bg-white/5 text-white/70',
              )}
            >
              <span className="text-base">{s.emoji}</span>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grade */}
      {subject && (
        <div>
          <p className="text-xs font-bold text-white/50 uppercase tracking-wider mb-1.5">Pick a Grade Level</p>
          <div className="grid grid-cols-6 gap-1">
            {GRADES.map(g => (
              <button
                key={g}
                onClick={() => handleGrade(g)}
                className={cn(
                  'py-1.5 rounded-lg text-[11px] font-bold border-2 transition-all',
                  grade === g
                    ? 'border-indigo-400 bg-indigo-600 text-white'
                    : 'border-white/10 hover:border-indigo-400/50 bg-white/5 text-white/70'
                )}
              >
                {gradeLabel(g).replace('Grade ', 'Gr.')}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Topic */}
      {subject && grade && (
        <div>
          <p className="text-xs font-bold text-white/50 uppercase tracking-wider mb-1.5">Pick a Topic</p>
          <div className="grid grid-cols-2 gap-1.5">
            {topics.map(t => (
              <button
                key={t.label}
                onClick={() => setTopic(t.label)}
                className={cn(
                  'flex items-center gap-1.5 p-1.5 rounded-lg border-2 text-[11px] font-semibold transition-all text-left',
                  topic === t.label
                    ? 'border-indigo-400 bg-indigo-500/20 text-white'
                    : 'border-white/10 hover:border-white/20 bg-white/5 text-white/70',
                )}
              >
                <span className="text-sm flex-shrink-0">{t.emoji}</span>
                <span className="leading-tight">{t.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Summary + CTA */}
      {subject && grade && topic && (
        <div className="pt-1 space-y-1.5">
          <div className="flex items-center gap-2 p-2 bg-indigo-500/10 border border-indigo-400/20 rounded-xl">
            <span className="text-xl">{subjectMeta?.emoji}</span>
            <div className="min-w-0">
              <p className="font-bold text-white text-sm">{subjectMeta?.label} · {gradeLabel(grade)}</p>
              <p className="text-xs text-indigo-300 truncate">{topics.find(t => t.label === topic)?.emoji} {topic}</p>
            </div>
          </div>
          <div className="flex gap-2">
            {onCancel && <Button variant="secondary" className="flex-1" onClick={onCancel}>Cancel</Button>}
            <Button className="flex-1" onClick={() => onSelect(subject, grade, topic)}>
              {startLabel}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
