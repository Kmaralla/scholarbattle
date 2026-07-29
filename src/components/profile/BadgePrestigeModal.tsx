'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import {
  Badge,
  RARITY_STYLES,
  PRESTIGE_STYLES,
  PRESTIGE_RULES,
  BADGE_PRESTIGE_SUBJECT,
  PrestigeLevel,
  PrestigeMap,
} from '@/lib/badges'
import { getPrestigeQuestions } from '@/lib/questions'
import type { Subject } from '@/types'

type Question = Omit<import('@/types').Question, 'id'>

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

type Phase = 'info' | 'challenge' | 'result'

export function BadgePrestigeModal({
  badge,
  earned,
  currentPrestige,
  userId,
  onClose,
  onUpgraded,
}: {
  badge: Badge
  earned: boolean
  currentPrestige: PrestigeLevel
  userId: string
  onClose: () => void
  onUpgraded: (badgeId: string, newLevel: PrestigeLevel) => void
}) {
  const nextLevel = (currentPrestige + 1) as PrestigeLevel
  const canPrestige = earned && currentPrestige < 2
  const rules = nextLevel === 1 ? PRESTIGE_RULES.silver : PRESTIGE_RULES.gold
  const subject = BADGE_PRESTIGE_SUBJECT[badge.id] as Subject | null

  const [phase, setPhase] = useState<Phase>('info')
  const [questions, setQuestions] = useState<Question[]>([])
  const [optionSets, setOptionSets] = useState<string[][]>([])
  const [qIndex, setQIndex] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [answered, setAnswered] = useState(false)
  const [score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState<number>(rules.seconds)
  const [saving, setSaving] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const supabase = createClient()
  const s = RARITY_STYLES[badge.rarity]
  const curP = PRESTIGE_STYLES[currentPrestige]
  const nextP = PRESTIGE_STYLES[nextLevel]

  const stopTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
  }, [])

  const advance = useCallback((correct: boolean) => {
    stopTimer()
    const newScore = correct ? score + 1 : score
    if (qIndex + 1 >= rules.questions) {
      setScore(newScore)
      setTimeout(() => setPhase('result'), 800)
    } else {
      setScore(newScore)
      setTimeout(() => {
        setQIndex(i => i + 1)
        setSelected(null)
        setAnswered(false)
        setTimeLeft(rules.seconds)
      }, 700)
    }
  }, [qIndex, rules.questions, rules.seconds, score, stopTimer])

  const handleTimeout = useCallback(() => {
    if (answered) return
    setAnswered(true)
    advance(false)
  }, [answered, advance])

  // Start timer when question changes during challenge
  useEffect(() => {
    if (phase !== 'challenge') return
    setTimeLeft(rules.seconds)
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(timerRef.current!); handleTimeout(); return 0 }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current!)
  }, [qIndex, phase]) // eslint-disable-line react-hooks/exhaustive-deps

  function startChallenge() {
    const qs = getPrestigeQuestions(subject, rules.questions)
    setQuestions(qs)
    setOptionSets(qs.map(q => q.options ? shuffle(q.options) : []))
    setQIndex(0)
    setSelected(null)
    setAnswered(false)
    setScore(0)
    setTimeLeft(rules.seconds)
    setPhase('challenge')
  }

  function handleAnswer(opt: string) {
    if (answered) return
    stopTimer()
    setSelected(opt)
    setAnswered(true)
    const correct = opt === questions[qIndex].correct_answer
    advance(correct)
  }

  async function savePrestige() {
    setSaving(true)
    const { data: row } = await supabase
      .from('users')
      .select('badge_prestige')
      .eq('id', userId)
      .single()
    const current: PrestigeMap = (row as any)?.badge_prestige ?? {}
    const updated = { ...current, [badge.id]: nextLevel }
    await supabase.from('users').update({ badge_prestige: updated }).eq('id', userId)
    setSaving(false)
    onUpgraded(badge.id, nextLevel)
  }

  const passed = score >= rules.need
  const q = questions[qIndex]
  const opts = optionSets[qIndex] ?? []

  // ── INFO SCREEN ───────────────────────────────────────────────────────────
  const InfoScreen = (
    <div className="flex flex-col items-center gap-4 p-6">
      {/* Badge display with current prestige ring */}
      <div className={cn(
        'w-24 h-24 rounded-2xl border flex flex-col items-center justify-center gap-1',
        s.border, s.bg, curP.ring, curP.glow && `shadow-lg ${curP.glow}`
      )}>
        <span className="text-4xl">{badge.emoji}</span>
        {currentPrestige > 0 && <span className="text-xs font-bold">{curP.emoji} {curP.label}</span>}
      </div>

      <div className="text-center">
        <h2 className="text-xl font-black text-white">{badge.name}</h2>
        <p className="text-sm text-white/50 mt-0.5">{badge.description}</p>
      </div>

      {!earned ? (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center w-full">
          <p className="text-white/60 text-sm">Earn this badge first to unlock prestige challenges.</p>
        </div>
      ) : currentPrestige >= 2 ? (
        <div className="bg-yellow-900/30 border border-yellow-400/40 rounded-2xl p-4 text-center w-full">
          <p className="text-xl mb-1">🥇</p>
          <p className="font-black text-yellow-300">Max Prestige!</p>
          <p className="text-yellow-300/60 text-sm mt-1">You've reached Gold — the highest level for this badge.</p>
        </div>
      ) : (
        <div className="w-full space-y-3">
          {/* Arrow: current → next */}
          <div className="flex items-center justify-center gap-3">
            <div className="text-center">
              <p className="text-xs text-white/40 mb-1">Current</p>
              <span className="text-2xl">{curP.emoji}</span>
              <p className="text-xs font-bold text-white/60 mt-0.5">{curP.label}</p>
            </div>
            <span className="text-white/30 text-xl">→</span>
            <div className="text-center">
              <p className="text-xs text-white/40 mb-1">Next</p>
              <span className="text-2xl">{nextP.emoji}</span>
              <p className={cn('text-xs font-bold mt-0.5', nextLevel === 2 ? 'text-yellow-400' : 'text-slate-300')}>{nextP.label}</p>
            </div>
          </div>

          {/* Challenge rules */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-2">
            <p className="text-xs font-black text-white/70 uppercase tracking-wider">Challenge Rules</p>
            <div className="flex items-center gap-2 text-sm">
              <span>📚</span>
              <span className="text-white/80">
                {rules.questions} hard questions
                {subject ? ` — ${subject.charAt(0).toUpperCase() + subject.slice(1)}` : ' — mixed subjects'}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span>⏱️</span>
              <span className="text-white/80">{rules.seconds} seconds per question</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span>{nextLevel === 2 ? '🎯' : '✅'}</span>
              <span className="text-white/80">
                {nextLevel === 2
                  ? 'Perfect score required — all 5 correct'
                  : `${rules.need} of ${rules.questions} correct to pass`}
              </span>
            </div>
            {nextLevel === 2 && (
              <div className="flex items-center gap-2 text-sm">
                <span>🔥</span>
                <span className="text-amber-400 font-bold">Gold requires perfection. No mistakes.</span>
              </div>
            )}
          </div>

          <button
            onClick={startChallenge}
            className={cn(
              'w-full py-3.5 rounded-2xl font-black text-white text-sm shadow-lg transition-all hover:opacity-90 hover:scale-[1.02]',
              nextLevel === 2
                ? 'bg-gradient-to-r from-yellow-700 to-amber-600'
                : 'bg-gradient-to-r from-slate-600 to-slate-500'
            )}
          >
            {nextP.emoji} Start {nextP.label} Challenge
          </button>
        </div>
      )}

      <button onClick={onClose} className="text-white/30 text-xs hover:text-white/60 transition">
        Close
      </button>
    </div>
  )

  // ── CHALLENGE SCREEN ──────────────────────────────────────────────────────
  const timerPct = (timeLeft / rules.seconds) * 100
  const timerColor = timeLeft <= 3 ? 'bg-red-500' : timeLeft <= 5 ? 'bg-orange-400' : 'bg-emerald-400'

  const ChallengeScreen = q ? (
    <div className="flex flex-col gap-4 p-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base">{nextP.emoji}</span>
          <span className="text-xs font-black text-white/70 uppercase tracking-wider">
            {nextP.label} Challenge
          </span>
        </div>
        <span className="text-xs text-white/40">{qIndex + 1} / {rules.questions}</span>
      </div>

      {/* Timer bar */}
      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all', timerColor)}
          style={{ width: `${timerPct}%` }}
        />
      </div>

      {/* Timer number + score */}
      <div className="flex items-center justify-between">
        <span className={cn('text-2xl font-black tabular-nums', timeLeft <= 3 ? 'text-red-400 animate-pulse' : 'text-white')}>
          {timeLeft}s
        </span>
        <span className="text-sm text-white/50">
          Score: <span className="text-white font-bold">{score}</span>/{rules.questions}
        </span>
      </div>

      {/* Question */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
        <p className="text-white font-bold text-sm leading-relaxed">{q.question_text}</p>
      </div>

      {/* Options */}
      <div className="space-y-2">
        {opts.map(opt => {
          const isCorrect = opt === q.correct_answer
          const isSelected = opt === selected
          return (
            <button
              key={opt}
              disabled={answered}
              onClick={() => handleAnswer(opt)}
              className={cn(
                'w-full text-left px-4 py-3 rounded-xl border text-sm font-semibold transition-all',
                !answered
                  ? 'border-white/15 bg-white/5 text-white hover:bg-white/15 hover:border-white/30 active:scale-[0.98]'
                  : isCorrect
                  ? 'border-emerald-400/60 bg-emerald-900/40 text-emerald-300'
                  : isSelected
                  ? 'border-red-400/60 bg-red-900/40 text-red-300'
                  : 'border-white/10 bg-white/3 text-white/30'
              )}
            >
              {opt}
            </button>
          )
        })}
      </div>
    </div>
  ) : null

  // ── RESULT SCREEN ─────────────────────────────────────────────────────────
  const ResultScreen = (
    <div className="flex flex-col items-center gap-5 p-6">
      <div className="text-6xl">{passed ? (nextLevel === 2 ? '🥇' : '🥈') : '😤'}</div>

      <div className="text-center">
        <h2 className={cn('text-2xl font-black', passed ? (nextLevel === 2 ? 'text-yellow-400' : 'text-slate-300') : 'text-white')}>
          {passed ? (nextLevel === 2 ? 'Perfect! Gold Unlocked!' : 'Silver Unlocked!') : 'Not Quite!'}
        </h2>
        <p className="text-white/50 text-sm mt-1">
          {score} / {rules.questions} correct
          {!passed && ` (needed ${rules.need})`}
        </p>
      </div>

      {passed ? (
        <>
          <div className={cn(
            'w-24 h-24 rounded-2xl border flex flex-col items-center justify-center gap-1',
            s.border, s.bg, nextP.ring, `shadow-xl ${nextP.glow}`
          )}>
            <span className="text-4xl">{badge.emoji}</span>
            <span className="text-xs font-black">{nextP.emoji} {nextP.label}</span>
          </div>
          <p className="text-center text-white/60 text-sm">
            Your <span className="text-white font-bold">{badge.name}</span> badge has been upgraded to {nextP.label}!
          </p>
          <button
            onClick={savePrestige}
            disabled={saving}
            className={cn(
              'w-full py-3.5 rounded-2xl font-black text-white text-sm shadow-lg transition-all hover:opacity-90',
              nextLevel === 2
                ? 'bg-gradient-to-r from-yellow-700 to-amber-600'
                : 'bg-gradient-to-r from-slate-600 to-slate-500'
            )}
          >
            {saving ? 'Saving…' : `✨ Claim ${nextP.label} Badge`}
          </button>
        </>
      ) : (
        <>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center w-full">
            <p className="text-white/60 text-sm">You needed <span className="text-white font-bold">{rules.need}/{rules.questions}</span>.</p>
            <p className="text-white/40 text-xs mt-1">Study harder and try again!</p>
          </div>
          <div className="flex gap-2 w-full">
            <button
              onClick={startChallenge}
              className="flex-1 py-3 rounded-2xl font-black text-white text-sm bg-white/10 hover:bg-white/20 transition"
            >
              Try Again
            </button>
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-2xl font-black text-white/50 text-sm bg-white/5 hover:bg-white/10 transition"
            >
              Close
            </button>
          </div>
        </>
      )}
    </div>
  )

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-md bg-slate-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto">
        {phase === 'info' && InfoScreen}
        {phase === 'challenge' && ChallengeScreen}
        {phase === 'result' && ResultScreen}
      </div>
    </div>
  )
}
