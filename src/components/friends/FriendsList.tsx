'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User } from '@/types'
import { useOnlineUsers } from '@/components/PresenceTracker'
import { RankBadge } from '@/components/RankBadge'
import { Button } from '@/components/ui/button'
import { Swords, UserPlus, UserMinus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { UserAvatar } from '@/components/profile/UserAvatar'

interface FriendWithPresence extends User {
  online: boolean
}

export function FriendsList({ currentUserId, onChallenge }: {
  currentUserId: string
  onChallenge: (friend: User) => void
}) {
  const [friends, setFriends] = useState<FriendWithPresence[]>([])
  const [removingId, setRemovingId] = useState<string | null>(null)
  const onlineIds = useOnlineUsers()
  const supabase = createClient()

  useEffect(() => {
    loadFriends()
    const interval = setInterval(loadFriends, 5000)
    return () => clearInterval(interval)
  }, [currentUserId])

  async function loadFriends() {
    const { data: rows } = await supabase
      .from('friendships')
      .select('friend_id')
      .eq('user_id', currentUserId)
      .eq('status', 'accepted')

    if (!rows || rows.length === 0) { setFriends([]); return }

    const ids = rows.map((r: any) => r.friend_id)
    const { data: users } = await supabase
      .from('users')
      .select('*')
      .in('id', ids)

    if (users) setFriends(users.map((u: any) => ({ ...u, online: false })))
  }

  async function handleRemove(friendId: string) {
    setRemovingId(friendId)
    await supabase.rpc('remove_friend', { user_a: currentUserId, user_b: friendId })
    setFriends(prev => prev.filter(f => f.id !== friendId))
    setRemovingId(null)
  }

  const sorted = friends
    .map(f => ({ ...f, online: onlineIds.has(f.id) }))
    .sort((a, b) => Number(b.online) - Number(a.online))

  return (
    <div className="space-y-2">
      {sorted.length === 0 && (
        <div className="text-center py-10 text-white/40">
          <UserPlus className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No friends yet. Add some to start battling!</p>
        </div>
      )}
      {sorted.map(friend => (
        <div key={friend.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors group">
          <div className="relative">
            <UserAvatar username={friend.username} avatarUrl={(friend as any).avatar_url} size="md" />
            <span className={cn(
              'absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-slate-800',
              friend.online ? 'bg-green-400' : 'bg-gray-600'
            )} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-white truncate">{friend.username}</p>
            <div className="flex items-center gap-2">
              <RankBadge tier={friend.rank_tier} elo={friend.elo_rating} showElo />
              <span className={cn('text-xs', friend.online ? 'text-green-400' : 'text-white/30')}>
                {friend.online ? 'Online' : 'Offline'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {friend.online && (
              <Button size="sm" onClick={() => onChallenge(friend)}>
                <Swords className="w-3.5 h-3.5 mr-1" />
                Challenge
              </Button>
            )}
            <button
              onClick={() => handleRemove(friend.id)}
              disabled={removingId === friend.id}
              title="Remove friend"
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-400/10 disabled:opacity-30"
            >
              <UserMinus className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
