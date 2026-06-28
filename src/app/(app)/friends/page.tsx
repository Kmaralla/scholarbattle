'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { FriendsList } from '@/components/friends/FriendsList'
import { TopicPicker } from '@/components/battle/TopicPicker'
import { User, Subject } from '@/types'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { UserPlus, X } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function FriendsPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [challenging, setChallenging] = useState<User | null>(null)
  const [addEmail, setAddEmail] = useState('')
  const [addStatus, setAddStatus] = useState<string | null>(null)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user }, error: authErr }) => {
      console.log('[Friends] auth user:', user?.id, 'authErr:', authErr)
      if (user) {
        supabase.from('users').select('*').eq('id', user.id).single()
          .then(({ data, error }) => {
            console.log('[Friends] profile:', data, 'error:', error)
            if (data) setCurrentUser(data)
            else if (error) console.error('[Friends] profile fetch failed:', error.message, error.code)
          })
      }
    })
  }, [])

  async function handleAddFriend(e: React.FormEvent) {
    e.preventDefault()
    setAddStatus(null)
    const { data: found } = await supabase
      .from('users')
      .select('id, username')
      .ilike('username', addEmail.trim())
      .single()

    if (!found) { setAddStatus('User not found'); return }
    if (found.id === currentUser?.id) { setAddStatus('That\'s you!'); return }

    const { error } = await supabase.from('friendships').insert({
      user_id: currentUser!.id,
      friend_id: found.id,
      status: 'accepted',
    })
    if (error) { setAddStatus('Already friends or request pending'); return }
    // Also create reverse
    await supabase.from('friendships').insert({
      user_id: found.id,
      friend_id: currentUser!.id,
      status: 'accepted',
    })
    setAddStatus(`✅ Added ${found.username}!`)
    setAddEmail('')
  }

  async function handleStartBattle(subject: Subject, grade: number) {
    if (!challenging || !currentUser) return
    // Create battle record
    const { data: battle } = await supabase.from('battles').insert({
      challenger_id: currentUser.id,
      opponent_id: challenging.id,
      subject,
      grade_level: grade,
      status: 'in_progress',
      challenger_score: 0,
      opponent_score: 0,
      question_ids: [],
    }).select().single()

    if (battle) router.push(`/battle/${battle.id}`)
  }

  if (!currentUser) return <div className="p-4 text-center text-gray-400">Loading...</div>

  return (
    <div className="max-w-lg mx-auto p-4 space-y-4">
      <h1 className="text-xl font-black text-gray-900">Friends</h1>

      {/* Add friend */}
      <Card>
        <CardHeader>
          <h2 className="font-bold text-gray-900 flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-indigo-600" /> Add Friend
          </h2>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddFriend} className="flex gap-2">
            <input
              value={addEmail}
              onChange={e => setAddEmail(e.target.value)}
              placeholder="Enter username..."
              className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-indigo-400"
            />
            <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition">
              Add
            </button>
          </form>
          {addStatus && <p className="mt-2 text-sm text-gray-600">{addStatus}</p>}
        </CardContent>
      </Card>

      {/* Challenge modal */}
      {challenging && (
        <Card className="border-indigo-200 bg-indigo-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="font-bold text-indigo-900">Challenge {challenging.username}</p>
              <button onClick={() => setChallenging(null)}>
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
            <TopicPicker onSelect={handleStartBattle} onCancel={() => setChallenging(null)} />
          </CardContent>
        </Card>
      )}

      {/* Friends list */}
      <Card>
        <CardHeader>
          <h2 className="font-bold text-gray-900">Your Friends</h2>
        </CardHeader>
        <CardContent>
          <FriendsList currentUserId={currentUser.id} onChallenge={setChallenging} />
        </CardContent>
      </Card>
    </div>
  )
}
