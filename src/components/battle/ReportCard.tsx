'use client'
import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import type { QuestionResult } from '@/components/battle/BattleRoom'

interface ReportCardData {
  grade: string
  headline: string
  crushed: string[]
  awesome: string
  workOn: string[]
  tip: string
}

const GRADE_COLORS: Record<string, string> = {
  'A+': 'text-emerald-400', A: 'text-emerald-400',
  'B+': 'text-blue-400',   B: 'text-blue-400',
  'C+': 'text-yellow-400', C: 'text-yellow-400',
  D: 'text-orange-400',    F: 'text-red-400',
}

interface Props {
  subject: string
  grade: number
  myScore: number
  totalQuestions: number
  results: QuestionResult[]
  username: string
  onClose: () => void
}

export function ReportCard({ subject, grade, myScore, totalQuestions, results, username, onClose }: Props) {
  const [data, setData] = useState<ReportCardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetch('/api/report-card', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject, grade, myScore, totalQuestions, results }),
    })
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => { setError(true); setLoading(false) })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function share() {
    if (!data) return
    const pct = Math.round((myScore / totalQuestions) * 100)
    const text = `📋 My ScholarBattle Report Card\n\n` +
      `Grade: ${data.grade} | ${myScore}/${totalQuestions} (${pct}%) in ${subject}\n\n` +
      `✅ What I crushed:\n${data.crushed.map(c => `• ${c}`).join('\n')}\n\n` +
      `🌟 Awesome: ${data.awesome}\n\n` +
      (data.workOn.length ? `📚 Working on:\n${data.workOn.map(w => `• ${w}`).join('\n')}\n\n` : '') +
      `💡 Tip: ${data.tip}\n\n` +
      `Play ScholarBattle! 🎮`

    if (navigator.share) {
      navigator.share({ title: 'My ScholarBattle Report Card', text })
    } else {
      navigator.clipboard.writeText(text)
      alert('Report card copied to clipboard!')
    }
  }

  const gradeColor = data ? (GRADE_COLORS[data.grade] ?? 'text-white') : 'text-white'
  const pct = Math.round((myScore / totalQuestions) * 100)

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}>
      <div className="w-full sm:max-w-md max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl"
        style={{ background: 'linear-gradient(135deg,#1a1040,#0f0a2e)', border: '1px solid rgba(167,139,250,0.25)' }}>

        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between px-5 pt-5 pb-3"
          style={{ background: 'linear-gradient(135deg,#1a1040,#0f0a2e)' }}>
          <div>
            <h2 className="text-lg font-black text-white">📋 Report Card</h2>
            <p className="text-xs text-white/40">{username} · {subject} · Grade {grade}</p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition">
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        {loading && (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="w-10 h-10 border-4 border-violet-400/30 border-t-violet-400 rounded-full animate-spin" />
            <p className="text-white/50 text-sm">AI is grading your battle...</p>
          </div>
        )}

        {error && (
          <div className="text-center py-12 px-5">
            <p className="text-2xl mb-2">😕</p>
            <p className="text-white/60 text-sm">Couldn't generate report card. Try again later.</p>
          </div>
        )}

        {data && (
          <div className="px-5 pb-6 space-y-4">
            {/* Grade + score */}
            <div className="rounded-2xl p-5 text-center space-y-1"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <p className={`text-7xl font-black ${gradeColor}`}>{data.grade}</p>
              <p className="text-white font-bold text-lg">{myScore}/{totalQuestions} · {pct}%</p>
              <p className="text-white/60 text-sm leading-snug">{data.headline}</p>
            </div>

            {/* Crushed it */}
            <div className="rounded-2xl p-4 space-y-2"
              style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
              <p className="text-xs font-black uppercase tracking-widest text-emerald-400">✅ What You Crushed</p>
              {data.crushed.map((c, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-emerald-400 text-xs mt-0.5 flex-shrink-0">→</span>
                  <p className="text-sm text-white/80">{c}</p>
                </div>
              ))}
            </div>

            {/* Awesome */}
            <div className="rounded-2xl p-4"
              style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)' }}>
              <p className="text-xs font-black uppercase tracking-widest text-yellow-400 mb-2">🌟 Awesome Moment</p>
              <p className="text-sm text-white/80">{data.awesome}</p>
            </div>

            {/* Work on */}
            {data.workOn.length > 0 && (
              <div className="rounded-2xl p-4 space-y-2"
                style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}>
                <p className="text-xs font-black uppercase tracking-widest text-indigo-400">📚 Keep Practicing</p>
                {data.workOn.map((w, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-indigo-400 text-xs mt-0.5 flex-shrink-0">→</span>
                    <p className="text-sm text-white/80">{w}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Tip */}
            <div className="rounded-2xl p-4"
              style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)' }}>
              <p className="text-xs font-black uppercase tracking-widest text-violet-400 mb-2">💡 Study Tip</p>
              <p className="text-sm text-white/80">{data.tip}</p>
            </div>

            {/* Share */}
            <button
              onClick={share}
              className="w-full py-3.5 rounded-2xl font-black text-white text-sm transition-all active:scale-95"
              style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)' }}>
              📤 Share Report Card
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
