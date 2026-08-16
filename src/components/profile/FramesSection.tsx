'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { FRAMES, Frame } from '@/lib/frames'
import { AVATARS } from './avatars'
import { Check } from 'lucide-react'

export function FramesSection({
  userId,
  username,
  avatarUrl,
  coins,
  unlockedFrames,
  equippedFrame,
}: {
  userId: string
  username: string
  avatarUrl: string | null
  coins: number
  unlockedFrames: string[]
  equippedFrame: string | null
}) {
  const [localCoins, setLocalCoins] = useState(coins)
  const [localUnlocked, setLocalUnlocked] = useState<string[]>(unlockedFrames)
  const [localEquipped, setLocalEquipped] = useState<string | null>(equippedFrame)
  const [busy, setBusy] = useState<string | null>(null)
  const supabase = createClient()
  const avatar = AVATARS.find(a => a.id === avatarUrl)

  async function handleFrame(frame: Frame) {
    if (busy) return

    if (frame.id === 'none') {
      if (localEquipped === null) return
      setBusy(frame.id)
      await supabase.from('users').update({ equipped_frame: null }).eq('id', userId)
      setLocalEquipped(null)
      setBusy(null)
      return
    }

    const owned = localUnlocked.includes(frame.id)
    if (!owned) {
      if (localCoins < frame.coinCost) return
      setBusy(frame.id)
      const newUnlocked = [...localUnlocked, frame.id]
      const newCoins = localCoins - frame.coinCost
      await supabase.from('users').update({
        coins: newCoins,
        unlocked_frames: newUnlocked,
        equipped_frame: frame.id,
      }).eq('id', userId)
      setLocalUnlocked(newUnlocked)
      setLocalCoins(newCoins)
      setLocalEquipped(frame.id)
      setBusy(null)
      return
    }

    const next = localEquipped === frame.id ? null : frame.id
    setBusy(frame.id)
    await supabase.from('users').update({ equipped_frame: next }).eq('id', userId)
    setLocalEquipped(next)
    setBusy(null)
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-3">
      <h2 className="font-black text-white text-sm flex items-center gap-2 mb-2">
        🖼️ Avatar Frames
        <span className="text-white/30 font-normal text-xs ml-auto">🪙 {localCoins}</span>
      </h2>
      <div className="grid grid-cols-6 gap-1.5">
        {FRAMES.map(frame => {
          const owned = frame.id === 'none' || localUnlocked.includes(frame.id)
          const equipped = frame.id === 'none' ? localEquipped === null : localEquipped === frame.id
          const canAfford = localCoins >= frame.coinCost

          return (
            <button
              key={frame.id}
              onClick={() => handleFrame(frame)}
              disabled={busy !== null || (!owned && !canAfford)}
              className={cn(
                'flex flex-col items-center gap-1 rounded-lg border p-1.5 transition-all',
                equipped ? 'border-indigo-400/50 bg-indigo-500/15' : 'border-white/10 bg-white/5 hover:bg-white/10',
                !owned && !canAfford && 'opacity-40 cursor-not-allowed',
              )}
            >
              <div className={cn('relative', frame.special === 'rainbow' && 'rounded-full p-[2px] frame-prism')}>
                <div className={cn(
                  'w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-sm',
                  frame.id !== 'none' && !frame.special ? frame.border : 'border-2 border-white/15',
                  frame.glow,
                )}>
                  {avatar ? avatar.emoji : username[0]?.toUpperCase()}
                </div>
                {equipped && (
                  <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-green-500 rounded-full flex items-center justify-center">
                    <Check className="w-2 h-2 text-white" />
                  </div>
                )}
              </div>
              <p className="text-[8px] font-bold text-white/80 leading-tight">{frame.name}</p>
              {!owned && (
                <span className="text-[7px] font-bold text-yellow-300 leading-tight">🪙{frame.coinCost}</span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
