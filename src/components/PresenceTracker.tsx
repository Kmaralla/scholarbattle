'use client'
import { useEffect, createContext, useContext, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

const OnlineUsersContext = createContext<Set<string>>(new Set())
export const useOnlineUsers = () => useContext(OnlineUsersContext)

export function PresenceTracker({ userId, username, children }: {
  userId: string
  username: string
  children: React.ReactNode
}) {
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set())
  const supabase = createClient()
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  useEffect(() => {
    // Remove any stale channel with this name before creating a fresh one
    const stale = supabase.getChannels().find(c => c.topic === 'realtime:presence:global')
    if (stale) supabase.removeChannel(stale)

    const channel = supabase.channel('presence:global', {
      config: { presence: { key: userId } },
    })
    channelRef.current = channel

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        setOnlineIds(new Set(Object.keys(state)))
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ user_id: userId, username, online_at: new Date().toISOString() })
        }
      })

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [userId, username])

  return (
    <OnlineUsersContext.Provider value={onlineIds}>
      {children}
    </OnlineUsersContext.Provider>
  )
}
