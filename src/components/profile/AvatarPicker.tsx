'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { Check, X } from 'lucide-react'

import { AVATARS } from './avatars'
export { AVATARS } from './avatars'

export function AvatarPicker({
  userId,
  username,
  currentAvatar,
}: {
  userId: string
  username: string
  currentAvatar: string | null
}) {
  const [selected, setSelected] = useState<string | null>(currentAvatar)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  const current = AVATARS.find(a => a.id === selected)

  async function handlePick(id: string) {
    setSaving(true)
    setSelected(id)
    await supabase.from('users').update({ avatar_url: id }).eq('id', userId)
    setSaving(false)
    setOpen(false)
  }

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Current avatar display */}
      <button
        onClick={() => setOpen(true)}
        className="relative group w-20 h-20 rounded-full bg-white/10 border-2 border-white/20 flex items-center justify-center hover:border-white/40 transition-all"
      >
        {current ? (
          <span className="text-4xl">{current.emoji}</span>
        ) : (
          <span className="text-3xl font-black text-white/60">{username[0].toUpperCase()}</span>
        )}
        <div className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
          <span className="text-xs text-white opacity-0 group-hover:opacity-100 font-bold">Change</span>
        </div>
      </button>
      <p className="text-xs text-white/30">{current ? current.label : 'Pick an avatar'}</p>

      {/* Picker modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[var(--bg-nav)] border border-white/15 rounded-3xl p-5 w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black text-white text-base">Choose your avatar</h3>
              <button onClick={() => setOpen(false)} className="text-white/40 hover:text-white transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-white/30 mb-3 font-medium uppercase tracking-wide">ScholarBattle</p>
            <div className="grid grid-cols-6 gap-2 mb-4">
              {AVATARS.slice(0, 12).map(a => (
                <button
                  key={a.id}
                  title={a.label}
                  onClick={() => handlePick(a.id)}
                  disabled={saving}
                  className={cn(
                    'relative w-full aspect-square rounded-xl flex items-center justify-center text-2xl transition-all hover:scale-110',
                    selected === a.id
                      ? 'bg-white/20 border-2 border-white/50'
                      : 'bg-white/5 border border-white/10 hover:bg-white/10'
                  )}
                >
                  {a.emoji}
                  {selected === a.id && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 text-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>

            <p className="text-xs text-white/30 mb-3 font-medium uppercase tracking-wide">Other</p>
            <div className="grid grid-cols-6 gap-2">
              {AVATARS.slice(12).map(a => (
                <button
                  key={a.id}
                  title={a.label}
                  onClick={() => handlePick(a.id)}
                  disabled={saving}
                  className={cn(
                    'relative w-full aspect-square rounded-xl flex items-center justify-center text-2xl transition-all hover:scale-110',
                    selected === a.id
                      ? 'bg-white/20 border-2 border-white/50'
                      : 'bg-white/5 border border-white/10 hover:bg-white/10'
                  )}
                >
                  {a.emoji}
                  {selected === a.id && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 text-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>

            {saving && <p className="text-xs text-white/40 text-center mt-3">Saving...</p>}
          </div>
        </div>
      )}
    </div>
  )
}
