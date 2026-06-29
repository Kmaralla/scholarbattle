'use client'
import { useEffect, createContext, useContext, useState } from 'react'
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

  useEffect(() => {
    const channel = supabase.channel('presence:global', {
      config: { presence: { key: userId } },
    })
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
    return () => { supabase.removeChannel(channel) }
  }, [userId, username])

  return (
    <OnlineUsersContext.Provider value={onlineIds}>
      {children}
    </OnlineUsersContext.Provider>
  )
}
