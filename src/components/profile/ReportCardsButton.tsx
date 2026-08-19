'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { X, FileText, Clock, LayoutList } from 'lucide-react'

interface ReportCardRow {
  id: string
  subject: string
  grade: number
  my_score: number
  total_questions: number
  card_data: { grade: string; headline: string; crushed: string[]; awesome: string; workOn: string[]; tip: string }
  created_at: string
}

type View = 'menu' | 'recent' | 'all'

export function ReportCardsButton({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false)
  const [view, setView] = useState<View>('menu')
  const [cards, setCards] = useState<ReportCardRow[]>([])
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  async function fetchCards(mode: 'recent' | 'all') {
    setLoading(true)
    setView(mode)
    const query = supabase
      .from('report_cards')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    if (mode === 'recent') query.limit(5)
    const { data } = await query
    setCards((data as ReportCardRow[]) ?? [])
    setLoading(false)
  }

  function handleOpen() { setOpen(true); setView('menu'); setCards([]) }
  function handleClose() { setOpen(false); setView('menu'); setCards([]) }

  return (
    <>
      <button
        onClick={handleOpen}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-500/15 border border-indigo-400/25 text-indigo-300 font-bold text-xs hover:bg-indigo-500/25 transition-all"
      >
        <FileText className="w-3.5 h-3.5" />
        Report Cards
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={handleClose}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-md bg-[#0f0f1a] border border-white/10 rounded-3xl p-5 shadow-2xl space-y-4"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {view !== 'menu' && (
                  <button onClick={() => setView('menu')} className="text-white/40 hover:text-white transition text-sm">←</button>
                )}
                <h2 className="text-lg font-black text-white">
                  {view === 'menu' ? '📋 Report Cards' : view === 'recent' ? '🕐 Recent' : '📚 All Report Cards'}
                </h2>
              </div>
              <button onClick={handleClose} className="p-1.5 rounded-xl hover:bg-white/10 text-white/40 hover:text-white transition">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Menu view */}
            {view === 'menu' && (
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => fetchCards('recent')}
                  className="flex flex-col items-center gap-3 p-5 rounded-2xl bg-indigo-500/10 border border-indigo-400/20 hover:bg-indigo-500/20 hover:border-indigo-400/40 transition-all text-center group"
                >
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-400/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Clock className="w-6 h-6 text-indigo-300" />
                  </div>
                  <div>
                    <p className="font-black text-white text-sm">Recent</p>
                    <p className="text-xs text-white/40 mt-0.5">Last 5 cards</p>
                  </div>
                </button>
                <button
                  onClick={() => fetchCards('all')}
                  className="flex flex-col items-center gap-3 p-5 rounded-2xl bg-violet-500/10 border border-violet-400/20 hover:bg-violet-500/20 hover:border-violet-400/40 transition-all text-center group"
                >
                  <div className="w-12 h-12 rounded-2xl bg-violet-500/20 border border-violet-400/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <LayoutList className="w-6 h-6 text-violet-300" />
                  </div>
                  <div>
                    <p className="font-black text-white text-sm">All</p>
                    <p className="text-xs text-white/40 mt-0.5">Every report card</p>
                  </div>
                </button>
              </div>
            )}

            {/* List view */}
            {(view === 'recent' || view === 'all') && (
              <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-0.5">
                {loading && (
                  <div className="py-10 text-center">
                    <div className="text-3xl mb-2 animate-pulse">📋</div>
                    <p className="text-white/40 text-sm">Loading...</p>
                  </div>
                )}
                {!loading && cards.length === 0 && (
                  <div className="py-10 text-center">
                    <div className="text-3xl mb-2">📭</div>
                    <p className="text-white/40 text-sm">No report cards yet.</p>
                    <p className="text-white/25 text-xs mt-1">Finish a battle to generate one!</p>
                  </div>
                )}
                {!loading && cards.map(card => {
                  const date = new Date(card.created_at)
                  const pct = Math.round((card.my_score / card.total_questions) * 100)
                  const emoji = pct >= 80 ? '🏆' : pct >= 60 ? '⭐' : pct >= 40 ? '📘' : '💪'
                  const color = pct >= 80 ? 'text-green-400 bg-green-400/10 border-green-400/20'
                    : pct >= 60 ? 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20'
                    : 'text-white/60 bg-white/5 border-white/10'
                  return (
                    <a
                      key={card.id}
                      href={`/report-card/${card.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3.5 rounded-2xl bg-white/5 border border-white/8 hover:bg-white/10 hover:border-white/15 transition-all group"
                    >
                      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 border', color)}>
                        {emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-white text-sm capitalize truncate">
                          {card.subject} · Grade {card.grade}
                        </p>
                        <p className="text-xs text-white/40 mt-0.5">
                          {card.my_score}/{card.total_questions} correct · {date.toLocaleDateString()}
                        </p>
                        {card.card_data?.grade && (
                          <p className="text-xs text-indigo-300/70 mt-0.5 truncate">{card.card_data.grade}</p>
                        )}
                      </div>
                      <span className="text-white/20 group-hover:text-white/50 transition text-sm flex-shrink-0">→</span>
                    </a>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
