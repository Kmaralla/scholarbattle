import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'

const GRADE_COLORS: Record<string, string> = {
  'A+': '#34d399', A: '#34d399',
  'B+': '#60a5fa', B: '#60a5fa',
  'C+': '#fbbf24', C: '#fbbf24',
  D: '#fb923c',    F: '#f87171',
}

export default async function PublicReportCardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: row } = await supabase
    .from('report_cards')
    .select('*, users(username)')
    .eq('id', id)
    .single()

  if (!row) notFound()

  const card = row.card_data as {
    grade: string; headline: string; crushed: string[];
    awesome: string; workOn: string[]; tip: string
  }
  const username = (row.users as any)?.username ?? 'A student'
  const pct = Math.round((row.my_score / row.total_questions) * 100)
  const gradeColor = GRADE_COLORS[card.grade] ?? '#ffffff'

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(135deg,#0f0a2e,#1a1040)' }}>
      <div className="w-full max-w-md space-y-4">

        {/* Header */}
        <div className="text-center space-y-1 pb-2">
          <p className="text-white/40 text-xs uppercase tracking-widest font-bold">ScholarBattle</p>
          <h1 className="text-2xl font-black text-white">📋 Report Card</h1>
          <p className="text-white/40 text-sm">{username} · {row.subject} · Grade {row.grade}</p>
        </div>

        {/* Grade */}
        <div className="rounded-3xl p-6 text-center space-y-1"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <p className="text-8xl font-black" style={{ color: gradeColor }}>{card.grade}</p>
          <p className="text-white font-bold text-xl">{row.my_score}/{row.total_questions} · {pct}%</p>
          <p className="text-white/60 text-sm leading-snug">{card.headline}</p>
        </div>

        {/* Crushed it */}
        <div className="rounded-2xl p-4 space-y-2"
          style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
          <p className="text-xs font-black uppercase tracking-widest text-emerald-400">✅ What They Crushed</p>
          {card.crushed.map((c, i) => (
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
          <p className="text-sm text-white/80">{card.awesome}</p>
        </div>

        {/* Work on */}
        {card.workOn.length > 0 && (
          <div className="rounded-2xl p-4 space-y-2"
            style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}>
            <p className="text-xs font-black uppercase tracking-widest text-indigo-400">📚 Keep Practicing</p>
            {card.workOn.map((w, i) => (
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
          <p className="text-sm text-white/80">{card.tip}</p>
        </div>

        {/* CTA */}
        <a href="https://scholarbattle.vercel.app"
          className="block w-full py-3.5 rounded-2xl font-black text-white text-sm text-center transition-all active:scale-95"
          style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)' }}>
          ⚔️ Play ScholarBattle
        </a>

        <p className="text-center text-white/20 text-xs pb-4">scholarbattle.vercel.app</p>
      </div>
    </div>
  )
}
