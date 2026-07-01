'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { FriendsList } from '@/components/friends/FriendsList'
import { TopicPicker } from '@/components/battle/TopicPicker'
import { User, Subject } from '@/types'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { UserPlus, X, Check, Bell } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface PendingInvite {
  id: string
  user_id: string
  username: string
}

export default function FriendsPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [challenging, setChallenging] = useState<User | null>(null)
  const [addUsername, setAddUsername] = useState('')
  const [addStatus, setAddStatus] = useState<string | null>(null)
  const [invites, setInvites] = useState<PendingInvite[]>([])
  const [friendsKey, setFriendsKey] = useState(0)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase.from('users').select('*').eq('id', user.id).single()
          .then(({ data }) => { if (data) { setCurrentUser(data); loadInvites(data.id) } })
      }
    })
  }, [])

  async function loadInvites(userId: string) {
    const { data } = await supabase
      .from('friendships')
      .select('id, user_id, users!friendships_user_id_fkey(username)')
      .eq('friend_id', userId)
      .eq('status', 'pending')
    if (data) {
      setInvites(data.map((r: any) => ({ id: r.id, user_id: r.user_id, username: r.users?.username ?? 'Unknown' })))
    }
  }

  async function handleAddFriend(e: React.FormEvent) {
    e.preventDefault()
    setAddStatus(null)
    const { data: found } = await supabase
      .from('users')
      .select('id, username')
      .ilike('username', addUsername.trim())
      .single()

    if (!found) { setAddStatus('User not found'); return }
    if (found.id === currentUser?.id) { setAddStatus("That's you!"); return }

    // Check if already friends or pending
    const { data: existing } = await supabase
      .from('friendships')
      .select('id, status')
      .eq('user_id', currentUser!.id)
      .eq('friend_id', found.id)
      .maybeSingle()

    if (existing) {
      setAddStatus(existing.status === 'accepted' ? 'Already friends!' : 'Request already sent!')
      return
    }

    const { error } = await supabase.from('friendships').insert({
      user_id: currentUser!.id,
      friend_id: found.id,
      status: 'pending',
    })
    if (error) { setAddStatus('Could not send request'); return }
    setAddStatus(`✅ Friend request sent to ${found.username}!`)
    setAddUsername('')
  }

  async function handleAccept(invite: PendingInvite) {
    // Update the existing pending row to accepted
    await supabase.from('friendships').update({ status: 'accepted' }).eq('id', invite.id)
    // Create the reverse accepted row
    await supabase.from('friendships').insert({
      user_id: currentUser!.id,
      friend_id: invite.user_id,
      status: 'accepted',
    })
    setInvites(prev => prev.filter(i => i.id !== invite.id))
    setFriendsKey(k => k + 1)
  }

  async function handleDecline(invite: PendingInvite) {
    await supabase.from('friendships').delete().eq('id', invite.id)
    setInvites(prev => prev.filter(i => i.id !== invite.id))
  }

  async function handleStartBattle(subject: Subject, grade: number) {
    if (!challenging || !currentUser) return

    // Create battle with pending status
    const { data: battle } = await supabase.from('battles').insert({
      challenger_id: currentUser.id,
      opponent_id: challenging.id,
      subject,
      grade_level: grade,
      status: 'pending',
      challenger_score: 0,
      opponent_score: 0,
      question_ids: [],
    }).select().single()

    if (!battle) return

    // Broadcast challenge notification to opponent's personal channel
    const notifChannel = supabase.channel(`challenge:${challenging.id}`)
    await notifChannel.subscribe()
    await notifChannel.send({
      type: 'broadcast',
      event: 'incoming_challenge',
      payload: {
        battle_id: battle.id,
        challenger_username: currentUser.username,
        subject,
        grade_level: grade,
      },
    })
    supabase.removeChannel(notifChannel)

    setChallenging(null)
    // Challenger waits in the battle room for opponent to accept
    router.push(`/battle/${battle.id}`)
  }

  if (!currentUser) return <div className="p-4 text-center text-white/60">Loading...</div>

  return (
    <div className="max-w-lg mx-auto p-4 space-y-4">
      <h1 className="text-xl font-black text-white">Friends</h1>

      {/* Add friend */}
      <Card>
        <CardHeader>
          <h2 className="font-bold text-white flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-indigo-600" /> Add Friend
          </h2>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddFriend} className="flex gap-2">
            <input
              value={addUsername}
              onChange={e => setAddUsername(e.target.value)}
              placeholder="Enter username..."
              className="flex-1 px-3 py-2 rounded-xl border border-white/20 bg-white/5 text-white placeholder:text-white/30 text-sm outline-none focus:border-indigo-400"
            />
            <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition">
              Send
            </button>
          </form>
          {addStatus && <p className="mt-2 text-sm text-white/70">{addStatus}</p>}
        </CardContent>
      </Card>

      {/* Friend Invites */}
      <Card>
        <CardHeader>
          <h2 className="font-bold text-white flex items-center gap-2">
            <Bell className="w-4 h-4 text-orange-500" />
            Friend Invites
            {invites.length > 0 && (
              <span className="ml-auto bg-orange-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {invites.length}
              </span>
            )}
          </h2>
        </CardHeader>
        <CardContent>
          {invites.length === 0 ? (
            <p className="text-sm text-white/40 text-center py-3">No pending invites</p>
          ) : (
            <div className="space-y-2">
              {invites.map(invite => (
                <div key={invite.id} className="flex items-center justify-between py-2 px-1">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-700 font-bold text-sm">
                      {invite.username[0].toUpperCase()}
                    </div>
                    <span className="text-sm font-semibold text-white">{invite.username}</span>
                    <span className="text-xs text-white/50">wants to be friends</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAccept(invite)}
                      className="w-8 h-8 bg-green-100 hover:bg-green-200 text-green-700 rounded-full flex items-center justify-center transition"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDecline(invite)}
                      className="w-8 h-8 bg-red-100 hover:bg-red-200 text-red-600 rounded-full flex items-center justify-center transition"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Challenge modal */}
      {challenging && (
        <Card className="border-indigo-400/30 bg-indigo-500/10">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="font-bold text-white">Challenge {challenging.username}</p>
              <button onClick={() => setChallenging(null)}>
                <X className="w-4 h-4 text-white/40" />
              </button>
            </div>
            <TopicPicker onSelect={handleStartBattle} onCancel={() => setChallenging(null)} />
          </CardContent>
        </Card>
      )}

      {/* Friends list */}
      <Card>
        <CardHeader>
          <h2 className="font-bold text-white">Your Friends</h2>
        </CardHeader>
        <CardContent>
          <FriendsList key={friendsKey} currentUserId={currentUser.id} onChallenge={setChallenging} />
        </CardContent>
      </Card>
    </div>
  )
}
