'use client'
import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

// Mounts once in the app layout — keeps the user marked online site-wide
export function PresenceTracker({ userId, username }: { userId: string; username: string }) {
  const supabase = createClient()

  useEffect(() => {
    const channel = supabase.channel('presence:global', {
      config: { presence: { key: userId } },
    })
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({ user_id: userId, username, online_at: new Date().toISOString() })
      }
    })
    return () => { supabase.removeChannel(channel) }
  }, [userId, username])

  return null
}
