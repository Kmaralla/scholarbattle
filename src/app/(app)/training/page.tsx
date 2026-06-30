'use client'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { TrainingSession } from '@/components/training/TrainingSession'
import { Subject } from '@/types'

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

export const TRAINING_MODES: TrainingMode[] = [
  {
    id: 'puzzles',
    emoji: '🧩',
    name: 'Puzzles',
    description: 'Tricky brain-teaser questions that make you think deep. No rush — take your time.',
    questions: 5,
    seconds: 40,
    tag: 'Think Deep',
    tagColor: 'bg-violet-500/30 text-violet-300',
  },
  {
    id: 'speed',
    emoji: '⚡',
    name: 'Speed Drill',
    description: 'Answer as fast as you can! 10 seconds per question. Go go go!',
    questions: 8,
    seconds: 10,
    tag: 'Fast Pace',
    tagColor: 'bg-orange-500/30 text-orange-300',
  },
  {
    id: 'flashcards',
    emoji: '🃏',
    name: 'Flashcards',
    description: 'See the question, think about it, then reveal the answer. Great for memorizing.',
    questions: 6,
    seconds: 99,
    tag: 'Study Mode',
    tagColor: 'bg-sky-500/30 text-sky-300',
  },
  {
    id: 'streak',
    emoji: '🔥',
    name: 'Streak Challenge',
    description: 'Keep answering until you get 3 wrong. How long can your streak last?',
    questions: 10,
    seconds: 20,
    tag: 'Survival',
    tagColor: 'bg-red-500/30 text-red-300',
  },
  {
    id: 'endurance',
    emoji: '💪',
    name: 'Endurance',
    description: '15 questions back to back. Build serious stamina for real battles.',
    questions: 15,
    seconds: 20,
    tag: 'Stamina',
    tagColor: 'bg-emerald-500/30 text-emerald-300',
  },
]

export const COACHES: Coach[] = [
  {
    id: 'max',
    name: 'Coach Max',
    emoji: '⚡',
    title: 'Speed & Power',
    personality: 'Intense, hype, competitive. Pushes you to answer fast and dominate.',
    color: 'text-orange-400',
    gradient: 'from-orange-600 to-red-500',
    glow: 'shadow-orange-500/40',
    tips: [
      "Don't overthink — your first instinct is usually right!",
      "Speed is a weapon. The faster you answer, the more you dominate.",
      "Champions don't hesitate. Lock in and fire!",
      "Pressure creates diamonds. Keep going!",
      "Every second counts in a real battle. Train like it matters!",
    ],
    correctLines: [
      "BOOM! That's what I'm talking about! 🔥",
      "LET'S GO! Keep that energy!",
      "That's a CHAMPION move right there! ⚡",
      "FIRE! You're on a roll!",
      "Yes! Don't slow down now!",
    ],
    wrongLines: [
      "Shake it off — champions bounce back FAST!",
      "That one hurt? Good. Use it as fuel. 💪",
      "Wrong answer, right attitude. Keep swinging!",
      "Miss one, win the next. That's the game.",
      "No excuses. Lock in for the next one!",
    ],
    introLine: "Alright, let's go! No holding back — we're training like champions today! ⚡",
    endLine: (score, total) => score >= total * 0.8
      ? `BEAST MODE ACTIVATED! ${score}/${total} — you're built for battle! 🏆`
      : score >= total * 0.5
      ? `${score}/${total} — decent. But champions don't settle for decent. Train harder!`
      : `${score}/${total} — rough session. Real champions come back stronger. See you tomorrow!`,
  },
  {
    id: 'owl',
    name: 'Prof. Owl',
    emoji: '🦉',
    title: 'Deep Understanding',
    personality: 'Calm, intellectual. Explains concepts deeply so you truly understand.',
    color: 'text-violet-400',
    gradient: 'from-violet-600 to-indigo-500',
    glow: 'shadow-violet-500/40',
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
  },
  {
    id: 'luna',
    name: 'Coach Luna',
    emoji: '🌙',
    title: 'Confidence & Growth',
    personality: 'Warm, encouraging. Builds your confidence and celebrates every win.',
    color: 'text-pink-400',
    gradient: 'from-pink-500 to-rose-400',
    glow: 'shadow-pink-500/40',
    tips: [
      "You are smarter than you think. Believe it! 💫",
      "Every question you try makes you better. No matter the result.",
      "It's okay not to know — it means you're about to learn!",
      "Take a breath. You've got this. I believe in you 🌙",
      "Progress over perfection. Always.",
    ],
    correctLines: [
      "Yes!! I knew you could do it! 🌟",
      "That's amazing! You should be so proud!",
      "Look at you go! You're incredible! ✨",
      "Wonderful! That answer came from YOU — remember that!",
      "I'm so proud of you! Keep shining! 🌙",
    ],
    wrongLines: [
      "That's okay! Mistakes mean you're learning 💛",
      "Don't be hard on yourself — you're doing amazing just by trying!",
      "It's all part of the journey. You'll get it next time!",
      "One wrong answer doesn't define you. You're still a star! ⭐",
      "Every expert was once a beginner. You're on your way! 🌙",
    ],
    introLine: "Hi there! I'm so happy to train with you today! Let's have fun and grow together 🌙✨",
    endLine: (score, total) => score >= total * 0.8
      ? `WOW! ${score}/${total}!! I always knew you had it in you! You're a superstar! 🌟`
      : score >= total * 0.5
      ? `${score}/${total} — you should be SO proud! Every session makes you stronger 💪`
      : `${score}/${total} — and that's okay! You showed up and tried, and that matters most. 🌙`,
  },
]

const SUBJECTS: Subject[] = ['math', 'science', 'history', 'english']
const GRADES = Array.from({ length: 12 }, (_, i) => i + 1)

type Step = 'mode' | 'coach' | 'subject'

export default function TrainingPage() {
  const [step, setStep] = useState<Step>('mode')
  const [selectedMode, setSelectedMode] = useState<TrainingMode | null>(null)
  const [selectedCoach, setSelectedCoach] = useState<Coach | null>(null)
  const [subject, setSubject] = useState<Subject>('math')
  const [grade, setGrade] = useState(5)
  const [started, setStarted] = useState(false)

  if (started && selectedCoach && selectedMode) {
    return (
      <TrainingSession
        coach={selectedCoach}
        mode={selectedMode}
        subject={subject}
        grade={grade}
        onBack={() => { setStarted(false); setStep('mode'); setSelectedMode(null); setSelectedCoach(null) }}
      />
    )
  }

  return (
    <div className="max-w-lg mx-auto p-4 space-y-5 pb-24">
      <h1 className="text-xl font-black text-white">💪 Training</h1>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {(['mode', 'coach', 'subject'] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={cn(
              'w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-all',
              step === s ? 'bg-indigo-500 text-white' :
              (['mode', 'coach', 'subject'].indexOf(step) > i) ? 'bg-green-500 text-white' :
              'bg-white/10 text-white/30'
            )}>
              {(['mode', 'coach', 'subject'].indexOf(step) > i) ? '✓' : i + 1}
            </div>
            <span className={cn('text-xs font-semibold capitalize', step === s ? 'text-white' : 'text-white/30')}>
              {s === 'mode' ? 'Training Type' : s === 'coach' ? 'Coach' : 'Subject'}
            </span>
            {i < 2 && <div className="w-6 h-px bg-white/20" />}
          </div>
        ))}
      </div>

      {/* Step 1: Training mode */}
      {step === 'mode' && (
        <div className="space-y-3">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Choose Your Training Type</p>
          {TRAINING_MODES.map(mode => (
            <button
              key={mode.id}
              onClick={() => { setSelectedMode(mode); setStep('coach') }}
              className="w-full text-left rounded-3xl p-4 border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 transition-all flex items-center gap-4"
            >
              <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center text-3xl flex-shrink-0">
                {mode.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-black text-white text-base">{mode.name}</p>
                  <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full', mode.tagColor)}>{mode.tag}</span>
                </div>
                <p className="text-xs text-white/50 mt-0.5 leading-relaxed">{mode.description}</p>
                <p className="text-xs text-white/30 mt-1">{mode.questions} questions · {mode.seconds === 99 ? 'No timer' : `${mode.seconds}s each`}</p>
              </div>
              <span className="text-white/30 text-lg">→</span>
            </button>
          ))}
        </div>
      )}

      {/* Step 2: Coach */}
      {step === 'coach' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <button onClick={() => setStep('mode')} className="text-slate-400 hover:text-white text-sm font-semibold transition">← Back</button>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-2">Choose Your Coach</p>
          </div>
          {/* Selected mode reminder */}
          {selectedMode && (
            <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5">
              <span className="text-2xl">{selectedMode.emoji}</span>
              <div>
                <p className="text-xs text-white/40 font-semibold">Training Type</p>
                <p className="text-sm font-black text-white">{selectedMode.name}</p>
              </div>
            </div>
          )}
          {COACHES.map(coach => (
            <button
              key={coach.id}
              onClick={() => { setSelectedCoach(coach); setStep('subject') }}
              className="w-full text-left rounded-3xl p-4 border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 transition-all flex items-center gap-4"
            >
              <div className={cn('w-14 h-14 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0 bg-gradient-to-br', coach.gradient)}>
                {coach.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-black text-white text-base">{coach.name}</p>
                  <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full bg-white/5', coach.color)}>{coach.title}</span>
                </div>
                <p className="text-xs text-white/50 mt-0.5 leading-relaxed">{coach.personality}</p>
              </div>
              <span className="text-white/30 text-lg">→</span>
            </button>
          ))}
        </div>
      )}

      {/* Step 3: Subject + Grade */}
      {step === 'subject' && selectedCoach && selectedMode && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <button onClick={() => setStep('coach')} className="text-slate-400 hover:text-white text-sm font-semibold transition">← Back</button>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-2">Subject & Grade</p>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl px-3 py-2.5">
              <span className="text-xl">{selectedMode.emoji}</span>
              <div>
                <p className="text-xs text-white/40 font-semibold">Mode</p>
                <p className="text-sm font-black text-white">{selectedMode.name}</p>
              </div>
            </div>
            <div className={cn('flex items-center gap-3 rounded-2xl px-3 py-2.5 bg-gradient-to-r', selectedCoach.gradient)}>
              <span className="text-xl">{selectedCoach.emoji}</span>
              <div>
                <p className="text-xs text-white/60 font-semibold">Coach</p>
                <p className="text-sm font-black text-white">{selectedCoach.name}</p>
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
                  onClick={() => setSubject(s)}
                  className={cn(
                    'px-4 py-1.5 rounded-full text-sm font-semibold capitalize transition',
                    subject === s
                      ? `bg-gradient-to-r ${selectedCoach.gradient} text-white shadow-lg`
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
                      ? `bg-gradient-to-br ${selectedCoach.gradient} text-white shadow-lg`
                      : 'bg-white/10 text-white/60 hover:bg-white/20 hover:text-white'
                  )}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => setStarted(true)}
            className={cn(
              'w-full py-4 rounded-3xl font-black text-white text-base shadow-xl transition-all hover:scale-[1.02] hover:opacity-90 bg-gradient-to-r',
              selectedCoach.gradient, selectedCoach.glow
            )}
          >
            {selectedMode.emoji} Start {selectedMode.name} with {selectedCoach.name}
          </button>
        </div>
      )}
    </div>
  )
}
