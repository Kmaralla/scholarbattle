'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
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
  const [error, setError] = useState<string | null>(null)
  const [confirming, setConfirming] = useState<Frame | null>(null)
  const supabase = createClient()
  const router = useRouter()
  const avatar = AVATARS.find(a => a.id === avatarUrl)

  async function equip(frameId: string | null) {
    setBusy(frameId ?? 'none')
    setError(null)
    const { error: dbError } = await supabase.from('users').update({ equipped_frame: frameId }).eq('id', userId)
    if (dbError) {
      setError('Could not save — try again.')
      setBusy(null)
      return
    }
    setLocalEquipped(frameId)
    setBusy(null)
    router.refresh()
  }

  function handleFrame(frame: Frame) {
    if (busy) return

    if (frame.id === 'none') {
      if (localEquipped === null) return
      equip(null)
      return
    }

    const owned = localUnlocked.includes(frame.id)
    if (!owned) {
      if (localCoins < frame.coinCost) return
      setConfirming(frame)
      return
    }

    equip(localEquipped === frame.id ? null : frame.id)
  }

  async function confirmPurchase() {
    const frame = confirming
    if (!frame) return
    setConfirming(null)
    setBusy(frame.id)
    setError(null)

    const newUnlocked = [...localUnlocked, frame.id]
    const newCoins = localCoins - frame.coinCost
    const { error: dbError } = await supabase.from('users').update({
      coins: newCoins,
      unlocked_frames: newUnlocked,
      equipped_frame: frame.id,
    }).eq('id', userId)

    if (dbError) {
      setError('Could not complete purchase — try again.')
      setBusy(null)
      return
    }

    setLocalUnlocked(newUnlocked)
    setLocalCoins(newCoins)
    setLocalEquipped(frame.id)
    setBusy(null)
    router.refresh()
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-3">
      <h2 className="font-black text-white text-sm flex items-center gap-2 mb-2">
        🖼️ Avatar Frames
        <span className="text-white/30 font-normal text-xs ml-auto">🪙 {localCoins}</span>
      </h2>

      {error && <p className="text-[10px] text-red-400 text-center mb-2">{error}</p>}

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

      {/* Purchase confirmation */}
      {confirming && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={e => { if (e.target === e.currentTarget) setConfirming(null) }}
        >
          <div className="w-full max-w-xs bg-[var(--bg-nav)] border border-white/15 rounded-3xl p-5 space-y-4 text-center shadow-2xl">
            <div className={cn('mx-auto w-fit', confirming.special === 'rainbow' && 'rounded-full p-[3px] frame-prism')}>
              <div className={cn(
                'w-16 h-16 rounded-full bg-white/10 flex items-center justify-center text-2xl',
                confirming.id !== 'none' && !confirming.special ? confirming.border : 'border-2 border-white/15',
                confirming.glow,
              )}>
                {avatar ? avatar.emoji : username[0]?.toUpperCase()}
              </div>
            </div>
            <div>
              <p className="font-black text-white text-base">Purchase {confirming.name} frame?</p>
              <p className="text-white/50 text-sm mt-1">This will cost 🪙 {confirming.coinCost} coins.</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirming(null)}
                className="flex-1 py-2.5 rounded-2xl font-bold text-sm text-white/60 bg-white/5 hover:bg-white/10 transition"
              >
                No
              </button>
              <button
                onClick={confirmPurchase}
                className="flex-1 py-2.5 rounded-2xl font-black text-sm text-white bg-indigo-600 hover:bg-indigo-500 transition"
              >
                Yes, buy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
