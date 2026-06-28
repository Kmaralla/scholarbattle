'use client'
import { Subject, SUBJECT_COLORS } from '@/types'
import { gradeLabel } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

const SUBJECTS: { value: Subject; label: string; emoji: string }[] = [
  { value: 'math', label: 'Math', emoji: '🔢' },
  { value: 'science', label: 'Science', emoji: '🔬' },
  { value: 'history', label: 'History', emoji: '📜' },
  { value: 'english', label: 'English', emoji: '📚' },
]

const GRADES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]

interface TopicPickerProps {
  onSelect: (subject: Subject, grade: number) => void
  onCancel?: () => void
}

export function TopicPicker({ onSelect, onCancel }: TopicPickerProps) {
  return (
    <div className="space-y-5">
      <SubjectGradePicker onSelect={onSelect} onCancel={onCancel} />
    </div>
  )
}

function SubjectGradePicker({ onSelect, onCancel }: TopicPickerProps) {
  const [subject, setSubject] = useState<Subject | null>(null)
  const [grade, setGrade] = useState<number | null>(null)

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-semibold text-gray-700 mb-2">Pick a Subject</p>
        <div className="grid grid-cols-2 gap-2">
          {SUBJECTS.map(s => (
            <button
              key={s.value}
              onClick={() => setSubject(s.value)}
              className={cn(
                'flex items-center gap-2 p-3 rounded-xl border-2 text-sm font-semibold transition-all',
                subject === s.value
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                  : 'border-gray-200 hover:border-gray-300 text-gray-700',
                SUBJECT_COLORS[s.value]
              )}
            >
              <span className="text-lg">{s.emoji}</span>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {subject && (
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-2">Pick a Grade Level</p>
          <div className="grid grid-cols-4 gap-1.5">
            {GRADES.map(g => (
              <button
                key={g}
                onClick={() => setGrade(g)}
                className={cn(
                  'py-2 rounded-lg text-xs font-bold border-2 transition-all',
                  grade === g
                    ? 'border-indigo-500 bg-indigo-600 text-white'
                    : 'border-gray-200 hover:border-indigo-300 text-gray-700'
                )}
              >
                {gradeLabel(g).replace('Grade ', 'Gr.')}
              </button>
            ))}
          </div>
        </div>
      )}

      {subject && grade && (
        <div className="pt-2 space-y-2">
          <div className="flex items-center gap-2 p-3 bg-indigo-50 rounded-xl">
            <span className="text-2xl">{SUBJECTS.find(s => s.value === subject)?.emoji}</span>
            <div>
              <p className="font-bold text-indigo-800">{SUBJECTS.find(s => s.value === subject)?.label}</p>
              <p className="text-xs text-indigo-600">{gradeLabel(grade)}</p>
            </div>
          </div>
          <div className="flex gap-2">
            {onCancel && <Button variant="secondary" className="flex-1" onClick={onCancel}>Cancel</Button>}
            <Button className="flex-1" onClick={() => onSelect(subject, grade)}>
              Start Battle ⚔️
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// Need useState import
import { useState } from 'react'
