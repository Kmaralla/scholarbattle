'use client'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { TrainingSession } from '@/components/training/TrainingSession'
import { Subject } from '@/types'
import { getTopicsForGrade } from '@/lib/questions'

export type Coach = {
  id: string
  name: string
  emoji: string
  title: string
  personality: string
  color: string
  gradient: string
  glow: string
  tips: string[]
  correctLines: string[]
  wrongLines: string[]
  introLine: string
  endLine: (score: number, total: number) => string
}

export type TrainingMode = {
  id: string
  emoji: string
  name: string
  description: string
  questions: number
  seconds: number
  tag: string
  tagColor: string
}

export const TRAINING_MODE: TrainingMode = {
  id: 'puzzles',
  emoji: '🧩',
  name: 'Puzzles',
  description: 'Tricky brain-teaser questions that make you think deep. No rush — take your time.',
  questions: 5,
  seconds: 40,
  tag: 'Think Deep',
  tagColor: 'bg-white/10 text-white/50',
}

export const COACH: Coach = {
  id: 'owl',
  name: 'Prof. Owl',
  emoji: '🦉',
  title: 'Deep Understanding',
  personality: 'Calm, intellectual. Explains concepts deeply so you truly understand.',
  color: 'text-violet-400',
  gradient: 'from-violet-900/60 to-indigo-900/40',
  glow: '',
  tips: [
    "Understanding WHY is more powerful than memorizing WHAT.",
    "Connect new knowledge to what you already know.",
    "A wrong answer teaches you more than a lucky guess.",
    "Slow down and read every word in the question carefully.",
    "The best scholars ask questions, not just answer them.",
  ],
  correctLines: [
    "Excellent. You've internalized that concept well. 🦉",
    "Precisely correct. Notice how you reasoned through it.",
    "Very good. That knowledge is now yours forever.",
    "Correct! Understanding, not luck, got you there.",
    "Well done. That's the kind of thinking that builds mastery.",
  ],
  wrongLines: [
    "Interesting mistake. Let's think about why the correct answer makes sense.",
    "Don't worry — this is how learning works. The error is the lesson.",
    "The correct answer reveals something important. Sit with it for a moment.",
    "Mistakes are data. What does this tell you about what to study?",
    "Every scholar gets this wrong at first. Now you won't forget it.",
  ],
  introLine: "Welcome, scholar. Today we focus not on speed, but on true understanding. Ready? 🦉",
  endLine: (score, total) => score >= total * 0.8
    ? `Outstanding! ${score}/${total} — your knowledge is deep and solid. Keep building. 📚`
    : score >= total * 0.5
    ? `${score}/${total} — a respectable foundation. Review what tripped you up and return.`
    : `${score}/${total} — much to learn still. But every great scholar started exactly where you are.`,
}

const SUBJECTS: Subject[] = ['math', 'science', 'history', 'english']
const GRADES = Array.from({ length: 12 }, (_, i) => i + 1)

export default function TrainingPage() {
  const [subject, setSubject] = useState<Subject>('math')
  const [grade, setGrade] = useState(5)
  const [topic, setTopic] = useState<string | null>(null)
  const [started, setStarted] = useState(false)

  if (started) {
    return (
      <TrainingSession
        coach={COACH}
        mode={TRAINING_MODE}
        subject={subject}
        grade={grade}
        topic={topic ?? undefined}
        onBack={() => { setStarted(false); setTopic(null) }}
      />
    )
  }

  return (
    <div className="max-w-lg mx-auto p-4 space-y-5 pb-24">
      <h1 className="text-xl font-black text-white">💪 Training</h1>

      <div className="space-y-4">
        {/* Mode + coach summary */}
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl px-3 py-2.5">
            <span className="text-xl">{TRAINING_MODE.emoji}</span>
            <div>
              <p className="text-xs text-white/40 font-semibold">Mode</p>
              <p className="text-sm font-black text-white">{TRAINING_MODE.name}</p>
            </div>
          </div>
          <div className={cn('flex items-center gap-3 rounded-2xl px-3 py-2.5 bg-gradient-to-r', COACH.gradient)}>
            <span className="text-xl">{COACH.emoji}</span>
            <div>
              <p className="text-xs text-white/60 font-semibold">Coach</p>
              <p className="text-sm font-black text-white">{COACH.name}</p>
            </div>
          </div>
        </div>

        {/* Subject */}
        <div className="space-y-2">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Subject</p>
          <div className="flex gap-2 flex-wrap">
            {SUBJECTS.map(s => (
              <button
                key={s}
                onClick={() => { setSubject(s); setTopic(null) }}
                className={cn(
                  'px-4 py-1.5 rounded-full text-sm font-semibold capitalize transition',
                  subject === s
                    ? `bg-gradient-to-r ${COACH.gradient} text-white shadow-lg`
                    : 'bg-white/10 text-white/60 hover:bg-white/20 hover:text-white'
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Grade */}
        <div className="space-y-2">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Grade</p>
          <div className="flex gap-2 flex-wrap">
            {GRADES.map(g => (
              <button
                key={g}
                onClick={() => setGrade(g)}
                className={cn(
                  'w-10 h-10 rounded-xl text-sm font-bold transition',
                  grade === g
                    ? `bg-gradient-to-br ${COACH.gradient} text-white shadow-lg`
                    : 'bg-white/10 text-white/60 hover:bg-white/20 hover:text-white'
                )}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        {/* Topic */}
        <div className="space-y-2">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Topic</p>
          <div className="grid grid-cols-2 gap-2">
            {getTopicsForGrade(subject, grade).map(t => (
              <button
                key={t.label}
                onClick={() => setTopic(t.label)}
                className={cn(
                  'flex items-center gap-2 p-2.5 rounded-xl border-2 text-xs font-semibold transition-all text-left',
                  topic === t.label
                    ? `border-white/40 bg-gradient-to-r ${COACH.gradient} text-white`
                    : 'border-white/10 hover:border-white/20 bg-white/5 text-white/70',
                )}
              >
                <span className="text-base flex-shrink-0">{t.emoji}</span>
                <span className="leading-tight">{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        <button
          disabled={!topic}
          onClick={() => setStarted(true)}
          className={cn(
            'w-full py-4 rounded-3xl font-black text-white text-base shadow-xl transition-all hover:scale-[1.02] hover:opacity-90 bg-gradient-to-r',
            COACH.gradient, COACH.glow
          )}
        >
          {TRAINING_MODE.emoji} Start {TRAINING_MODE.name} with {COACH.name}
        </button>
      </div>
    </div>
  )
}
