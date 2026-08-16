'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const GRADES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]

export function GradePicker({ userId, currentGrade }: { userId: string; currentGrade: number }) {
  const [open, setOpen]     = useState(false)
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  async function changeGrade(grade: number) {
    if (grade === currentGrade) { setOpen(false); return }
    setSaving(true)
    const supabase = createClient()
    await supabase.from('users').update({ grade_level: grade }).eq('id', userId)
    router.refresh()
    setOpen(false)
    setSaving(false)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-center hover:border-indigo-400/50 hover:bg-white/8 transition-all"
      >
        <div className="text-lg mb-0.5">🎓</div>
        <p className="text-base font-black text-white leading-none">{currentGrade}</p>
        <p className="text-white/40 text-[10px] font-medium mt-0.5">Grade</p>
      </button>

      {open && (
        <>
          {/* Dismiss backdrop */}
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />

          {/* Floating picker */}
          <div className="absolute top-full left-0 right-0 mt-1.5 z-20 bg-[#1a1535] border border-white/15 rounded-2xl p-3 shadow-2xl">
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-2">Pick your grade</p>
            <div className="grid grid-cols-4 gap-1.5">
              {GRADES.map(g => (
                <button
                  key={g}
                  disabled={saving}
                  onClick={() => changeGrade(g)}
                  className={`py-2 rounded-lg text-xs font-black border-2 transition-all ${
                    g === currentGrade
                      ? 'border-indigo-400 bg-indigo-600 text-white'
                      : 'border-white/10 bg-white/5 text-white/70 hover:border-indigo-400/60 hover:bg-indigo-500/15'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
