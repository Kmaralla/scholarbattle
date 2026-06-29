'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User, Friendship, PresenceState } from '@/types'
import { RankBadge } from '@/components/RankBadge'
import { Button } from '@/components/ui/button'
import { Swords, UserPlus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FriendWithPresence extends User {
  online: boolean
}

export function FriendsList({ currentUserId, onChallenge }: {
  currentUserId: string
  onChallenge: (friend: User) => void
}) {
  const [friends, setFriends] = useState<FriendWithPresence[]>([])
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set())
  const supabase = createClient()

  useEffect(() => {
    loadFriends()

    // Join presence channel read-only — PresenceTracker in layout handles tracking
    const channel = supabase.channel('presence:global')
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<PresenceState>()
        const ids = new Set(Object.keys(state))
        setOnlineIds(ids)
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [currentUserId])

  async function loadFriends() {
    const { data } = await supabase
      .from('friendships')
      .select('*, friend:users!friendships_friend_id_fkey(*)')
      .eq('user_id', currentUserId)
      .eq('status', 'accepted')

    if (data) {
      setFriends(data.map((f: any) => ({ ...f.friend, online: false })))
    }
  }

  const sorted = friends
    .map(f => ({ ...f, online: onlineIds.has(f.id) }))
    .sort((a, b) => Number(b.online) - Number(a.online))

  return (
    <div className="space-y-2">
      {sorted.length === 0 && (
        <div className="text-center py-10 text-gray-400">
          <UserPlus className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No friends yet. Add some to start battling!</p>
        </div>
      )}
      {sorted.map(friend => (
        <div key={friend.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm">
              {friend.username[0].toUpperCase()}
            </div>
            <span className={cn(
              'absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white',
              friend.online ? 'bg-green-400' : 'bg-gray-300'
            )} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-gray-900 truncate">{friend.username}</p>
            <div className="flex items-center gap-2">
              <RankBadge tier={friend.rank_tier} elo={friend.elo_rating} showElo />
              <span className={cn('text-xs', friend.online ? 'text-green-500' : 'text-gray-400')}>
                {friend.online ? 'Online' : 'Offline'}
              </span>
            </div>
          </div>
          {friend.online && (
            <Button size="sm" onClick={() => onChallenge(friend)}>
              <Swords className="w-3.5 h-3.5 mr-1" />
              Challenge
            </Button>
          )}
        </div>
      ))}
    </div>
  )
}
