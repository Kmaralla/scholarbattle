'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { TopicPicker } from '@/components/battle/TopicPicker'
import { FriendChat } from '@/components/friends/FriendChat'
import { UserAvatar } from '@/components/profile/UserAvatar'
import { User, Subject } from '@/types'
import { useOnlineUsers } from '@/components/PresenceTracker'
import { RankBadge } from '@/components/RankBadge'
import { UserPlus, X, Check, Bell, Swords, MessageCircle, UserMinus, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import { pickQuestionIndices } from '@/lib/questions'
import { Users2 } from 'lucide-react'

interface PendingInvite {
  id: string
  user_id: string
  username: string
}

interface FriendWithPresence extends User {
  online: boolean
}

export default function FriendsPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [friends, setFriends] = useState<FriendWithPresence[]>([])
  const [invites, setInvites] = useState<PendingInvite[]>([])
  const [friendsKey, setFriendsKey] = useState(0)
  const [addUsername, setAddUsername] = useState('')
  const [addStatus, setAddStatus] = useState<string | null>(null)
  const [challenging, setChallenging] = useState<User | null>(null)
  const [challengeTimeout, setChallengeTimeout] = useState(15)
  const [chattingWith, setChattingWith] = useState<User | null>(null)
  const [view, setView] = useState<'friends' | 'add' | 'invites'>('friends')
  const [removingId, setRemovingId] = useState<string | null>(null)
  const onlineIds = useOnlineUsers()
  const supabase = createClient()
  const router = useRouter()

  // Team Battle flow
  const [teamBattleStep, setTeamBattleStep] = useState<'closed' | 'select' | 'customize'>('closed')
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([])
  const [tbTeamsEnabled, setTbTeamsEnabled] = useState(true)
  const [tbSubject, setTbSubject] = useState<Subject>('math')
  const [tbGrade, setTbGrade] = useState(5)
  const [tbSeconds, setTbSeconds] = useState(15)
  const [tbCreating, setTbCreating] = useState(false)
  const [tbError, setTbError] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from('users').select('*').eq('id', user.id).single()
        .then(({ data }) => { if (data) { setCurrentUser(data); loadInvites(data.id) } })
    })
  }, [])

  useEffect(() => {
    if (currentUser) loadFriends()
  }, [currentUser, friendsKey])

  // Real-time: listen for incoming friend requests while on this page
  useEffect(() => {
    if (!currentUser) return
    const ch = supabase.channel(`friend_requests:${currentUser.id}`)
    ch.on('broadcast', { event: 'friend_request' }, ({ payload }) => {
      setInvites(prev => {
        if (prev.some(i => i.user_id === payload.user_id)) return prev
        return [...prev, { id: payload.friendship_id, user_id: payload.user_id, username: payload.username }]
      })
    }).subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [currentUser?.id])

  // Auto-challenge flow from the share card link
  useEffect(() => {
    if (!currentUser) return
    const autoChallenge = localStorage.getItem('auto_challenge')
    if (!autoChallenge) return
    localStorage.removeItem('auto_challenge')
    supabase.from('users').select('*').eq('username', autoChallenge).single()
      .then(({ data }) => { if (data) setChallenging(data) })
  }, [currentUser])

  async function loadFriends() {
    const { data: rows } = await supabase
      .from('friendships')
      .select('friend_id')
      .eq('user_id', currentUser!.id)
      .eq('status', 'accepted')
    if (!rows || rows.length === 0) { setFriends([]); return }
    const ids = rows.map((r: any) => r.friend_id)
    const { data: users } = await supabase.from('users').select('*').in('id', ids)
    if (users) setFriends(users.map((u: any) => ({ ...u, online: false })))
  }

  async function loadInvites(userId: string) {
    const { data } = await supabase
      .from('friendships')
      .select('id, user_id, users!friendships_user_id_fkey(username)')
      .eq('friend_id', userId)
      .eq('status', 'pending')
    if (data) setInvites(data.map((r: any) => ({ id: r.id, user_id: r.user_id, username: r.users?.username ?? 'Unknown' })))
  }

  async function handleAddFriend(e: React.FormEvent) {
    e.preventDefault()
    setAddStatus(null)
    const { data: found } = await supabase.from('users').select('id, username').ilike('username', addUsername.trim()).single()
    if (!found) { setAddStatus('User not found'); return }
    if (found.id === currentUser?.id) { setAddStatus("That's you!"); return }
    const { data: existing } = await supabase.from('friendships').select('id, status').eq('user_id', currentUser!.id).eq('friend_id', found.id).maybeSingle()
    if (existing) { setAddStatus(existing.status === 'accepted' ? 'Already friends!' : 'Request already sent!'); return }
    const { error } = await supabase.from('friendships').insert({ user_id: currentUser!.id, friend_id: found.id, status: 'pending' })
    if (error) { setAddStatus('Could not send request'); return }
    setAddStatus(`✅ Friend request sent to ${found.username}!`)
    setAddUsername('')
  }

  async function handleAccept(invite: PendingInvite) {
    await supabase.rpc('accept_friend', { request_id: invite.id, requester: invite.user_id, accepter: currentUser!.id })
    setInvites(prev => prev.filter(i => i.id !== invite.id))
    setFriendsKey(k => k + 1)
  }

  async function handleDecline(invite: PendingInvite) {
    await supabase.from('friendships').delete().eq('id', invite.id)
    setInvites(prev => prev.filter(i => i.id !== invite.id))
  }

  async function handleRemove(friendId: string) {
    setRemovingId(friendId)
    await supabase.rpc('remove_friend', { user_a: currentUser!.id, user_b: friendId })
    setFriends(prev => prev.filter(f => f.id !== friendId))
    if (chattingWith?.id === friendId) setChattingWith(null)
    setRemovingId(null)
  }

  async function handleStartBattle(subject: Subject, grade: number) {
    if (!challenging || !currentUser) return
    const questionIndices = pickQuestionIndices(subject, grade, 10)
    const { data: battle } = await supabase.from('battles').insert({
      challenger_id: currentUser.id, opponent_id: challenging.id,
      subject, grade_level: grade, status: 'pending',
      challenger_score: 0, opponent_score: 0, question_ids: questionIndices,
    }).select().single()
    if (!battle) return
    const notifChannel = supabase.channel(`challenge:${challenging.id}`)
    await notifChannel.subscribe()
    await notifChannel.send({ type: 'broadcast', event: 'incoming_challenge', payload: { battle_id: battle.id, challenger_username: currentUser.username, challenger_avatar_url: (currentUser as any).avatar_url ?? null, challenger_equipped_frame: (currentUser as any).equipped_frame ?? null, subject, grade_level: grade, timeout: challengeTimeout } })
    supabase.removeChannel(notifChannel)
    setChallenging(null)
    router.push(`/battle/${battle.id}?timeout=${challengeTimeout}`)
  }

  function toggleFriendSelected(id: string) {
    setSelectedFriendIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  function closeTeamBattle() {
    setTeamBattleStep('closed')
    setSelectedFriendIds([])
    setTbError(null)
  }

  async function createTeamBattle() {
    if (!currentUser || selectedFriendIds.length === 0) return
    setTbCreating(true)
    setTbError(null)
    try {
      const questionIds = pickQuestionIndices(tbSubject, tbGrade, 30)
      const { data: battleId, error } = await supabase.rpc('create_team_battle', {
        p_subject: tbSubject,
        p_grade_level: tbGrade,
        p_seconds_per_question: tbSeconds,
        p_teams_enabled: tbTeamsEnabled,
        p_friend_ids: selectedFriendIds,
        p_question_ids: questionIds,
      })
      if (error) throw error

      for (const friendId of selectedFriendIds) {
        const ch = supabase.channel(`team_challenge:${friendId}`)
        await ch.subscribe()
        await ch.send({
          type: 'broadcast', event: 'incoming_team_challenge',
          payload: {
            team_battle_id: battleId,
            host_username: currentUser.username,
            host_avatar_url: (currentUser as any).avatar_url ?? null,
            host_equipped_frame: (currentUser as any).equipped_frame ?? null,
            subject: tbSubject, grade_level: tbGrade, teams_enabled: tbTeamsEnabled,
          },
        })
        supabase.removeChannel(ch)
      }

      router.push(`/team-battle/${battleId}`)
    } catch (err: any) {
      console.error('[TeamBattle] create failed:', err)
      setTbError(err?.message ?? 'Could not create the battle — try again.')
    } finally {
      setTbCreating(false)
    }
  }

  const sorted = friends
    .map(f => ({ ...f, online: onlineIds.has(f.id) }))
    .sort((a, b) => Number(b.online) - Number(a.online))
  const onlineFriends = sorted.filter(f => f.online)

  if (!currentUser) return <div className="p-4 text-center text-white/60">Loading...</div>

  return (
    <div className="flex h-[calc(100dvh-5rem)] md:h-screen max-w-4xl mx-auto overflow-hidden">

      {/* ── Left sidebar ── */}
      <div className={cn(
        'flex flex-col border-r border-white/10 bg-[var(--bg-nav)] flex-shrink-0',
        chattingWith ? 'hidden md:flex w-72' : 'flex w-full md:w-72'
      )}>
        {/* Sidebar header */}
        <div className="px-4 py-4 border-b border-white/10">
          <h1 className="font-black text-white text-lg">Friends</h1>
          <button
            onClick={() => setTeamBattleStep('select')}
            className="w-full mt-3 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:opacity-90 text-white text-sm font-black transition"
          >
            <Users2 className="w-4 h-4" /> Battle with Teams
          </button>
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => setView('friends')}
              className={cn('flex-1 py-1.5 rounded-xl text-xs font-bold transition', view === 'friends' ? 'bg-indigo-500 text-white' : 'bg-white/5 text-white/50 hover:bg-white/10')}
            >
              <Users className="w-3.5 h-3.5 inline mr-1" />Friends
            </button>
            <button
              onClick={() => setView('add')}
              className={cn('flex-1 py-1.5 rounded-xl text-xs font-bold transition', view === 'add' ? 'bg-indigo-500 text-white' : 'bg-white/5 text-white/50 hover:bg-white/10')}
            >
              <UserPlus className="w-3.5 h-3.5 inline mr-1" />Add
            </button>
            <button
              onClick={() => setView('invites')}
              className={cn('relative flex-1 py-1.5 rounded-xl text-xs font-bold transition', view === 'invites' ? 'bg-indigo-500 text-white' : 'bg-white/5 text-white/50 hover:bg-white/10')}
            >
              <Bell className="w-3.5 h-3.5 inline mr-1" />Invites
              {invites.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 rounded-full text-[9px] font-black text-white flex items-center justify-center">
                  {invites.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Sidebar content */}
        <div className="flex-1 overflow-y-auto">

          {/* Friends list view */}
          {view === 'friends' && (
            <div className="p-2 space-y-1">
              {sorted.length === 0 && (
                <div className="text-center py-10 text-white/30">
                  <UserPlus className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-xs">No friends yet</p>
                </div>
              )}
              {sorted.map(friend => (
                <div
                  key={friend.id}
                  onClick={() => setChattingWith(friend)}
                  className={cn(
                    'flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition group',
                    chattingWith?.id === friend.id ? 'bg-indigo-500/20 border border-indigo-500/30' : 'hover:bg-white/5'
                  )}
                >
                  <div className="relative flex-shrink-0">
                    <UserAvatar username={friend.username} avatarUrl={(friend as any).avatar_url} frameId={(friend as any).equipped_frame} size="md" />
                    <span className={cn('absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[var(--bg-nav)]', friend.online ? 'bg-green-400' : 'bg-gray-600')} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-white truncate">{friend.username}</p>
                    <p className={cn('text-xs', friend.online ? 'text-green-400' : 'text-white/30')}>{friend.online ? 'Online' : 'Offline'}</p>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                    {friend.online && (
                      <button
                        onClick={e => { e.stopPropagation(); setChallenging(friend) }}
                        className="p-1.5 rounded-lg text-indigo-300 hover:bg-indigo-500/20 transition"
                        title="Challenge"
                      >
                        <Swords className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={e => { e.stopPropagation(); handleRemove(friend.id) }}
                      disabled={removingId === friend.id}
                      className="p-1.5 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-400/10 transition"
                      title="Remove friend"
                    >
                      <UserMinus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add friend view */}
          {view === 'add' && (
            <div className="p-4 space-y-3">
              <form onSubmit={handleAddFriend} className="space-y-2">
                <input
                  value={addUsername}
                  onChange={e => setAddUsername(e.target.value)}
                  placeholder="Enter username..."
                  className="w-full px-3 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white placeholder:text-white/30 text-sm outline-none focus:border-indigo-400 transition"
                />
                <button type="submit" className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold transition">
                  Send Request
                </button>
              </form>
              {addStatus && <p className="text-sm text-white/70 text-center">{addStatus}</p>}
            </div>
          )}

          {/* Invites view */}
          {view === 'invites' && (
            <div className="p-3 space-y-2">
              {invites.length === 0 && (
                <p className="text-xs text-white/30 text-center py-8">No pending invites</p>
              )}
              {invites.map(invite => (
                <div key={invite.id} className="flex items-center gap-2 p-2.5 rounded-xl bg-white/5">
                  <div className="w-8 h-8 rounded-full bg-orange-400/20 flex items-center justify-center text-orange-300 font-black text-sm flex-shrink-0">
                    {(invite.username?.[0] ?? '?').toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white truncate">{invite.username}</p>
                    <p className="text-xs text-white/40">wants to be friends</p>
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={() => handleAccept(invite)} className="w-7 h-7 bg-green-500/20 hover:bg-green-500/40 text-green-400 rounded-lg flex items-center justify-center transition">
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDecline(invite)} className="w-7 h-7 bg-red-500/20 hover:bg-red-500/40 text-red-400 rounded-lg flex items-center justify-center transition">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Right: Chat panel ── */}
      <div className={cn('flex-1 flex flex-col min-w-0', !chattingWith && 'hidden md:flex')}>
        {chattingWith ? (
          <>
            {/* Mobile back button */}
            <div className="md:hidden flex items-center gap-2 px-4 py-2 border-b border-white/10">
              <button onClick={() => setChattingWith(null)} className="text-white/60 hover:text-white text-sm font-semibold transition">
                ← Back
              </button>
            </div>
            <div className="flex-1 min-h-0 flex flex-col">
              <FriendChat currentUser={currentUser} friend={chattingWith} />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-center p-8">
            <div>
              <MessageCircle className="w-14 h-14 text-white/10 mx-auto mb-3" />
              <p className="text-white/30 font-semibold">Select a friend to start chatting</p>
            </div>
          </div>
        )}
      </div>

      {/* Challenge modal overlay */}
      {challenging && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[var(--bg-nav)] border border-white/15 rounded-3xl p-5 w-full max-w-sm shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <p className="font-black text-white">Challenge {challenging.username}</p>
              <button onClick={() => setChallenging(null)}><X className="w-5 h-5 text-white/40" /></button>
            </div>
            {/* Time per question */}
            <div className="mb-4">
              <p className="text-xs font-bold text-white/40 uppercase tracking-widest mb-2">Time per Question</p>
              <div className="flex gap-2">
                {[10, 15, 20, 30].map(t => (
                  <button
                    key={t}
                    onClick={() => setChallengeTimeout(t)}
                    className={`flex-1 py-2 rounded-xl border-2 text-sm font-black transition-all ${
                      challengeTimeout === t
                        ? 'border-indigo-400 bg-indigo-500/20 text-white'
                        : 'border-white/10 bg-white/5 text-white/40 hover:border-white/20 hover:text-white'
                    }`}
                  >
                    {t}s
                  </button>
                ))}
              </div>
            </div>
            <TopicPicker onSelect={handleStartBattle} onCancel={() => setChallenging(null)} />
          </div>
        </div>
      )}

      {/* Team Battle: step 1 — select friends */}
      {teamBattleStep === 'select' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[var(--bg-nav)] border border-white/15 rounded-3xl p-5 w-full max-w-sm shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-1">
              <p className="font-black text-white">⚔️ Battle with Teams</p>
              <button onClick={closeTeamBattle}><X className="w-5 h-5 text-white/40" /></button>
            </div>
            <p className="text-xs text-white/40 mb-4">Pick who to invite. Only online friends can join in time.</p>

            {onlineFriends.length === 0 ? (
              <p className="text-sm text-white/40 text-center py-8">No friends online right now.</p>
            ) : (
              <div className="space-y-1.5 mb-4">
                {onlineFriends.map(friend => {
                  const selected = selectedFriendIds.includes(friend.id)
                  return (
                    <button
                      key={friend.id}
                      onClick={() => toggleFriendSelected(friend.id)}
                      className={cn(
                        'w-full flex items-center gap-3 p-2.5 rounded-xl border-2 transition-all text-left',
                        selected ? 'border-violet-400 bg-violet-500/15' : 'border-white/10 bg-white/5 hover:border-white/20'
                      )}
                    >
                      <UserAvatar username={friend.username} avatarUrl={(friend as any).avatar_url} frameId={(friend as any).equipped_frame} size="sm" />
                      <span className="flex-1 text-sm font-semibold text-white">{friend.username}</span>
                      <div className={cn(
                        'w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0',
                        selected ? 'border-violet-400 bg-violet-500' : 'border-white/20'
                      )}>
                        {selected && <Check className="w-3 h-3 text-white" />}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}

            <button
              onClick={() => setTeamBattleStep('customize')}
              disabled={selectedFriendIds.length === 0}
              className="w-full py-3 rounded-2xl font-black text-white text-sm bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:opacity-90 transition disabled:opacity-40"
            >
              Next ({selectedFriendIds.length} selected) →
            </button>
          </div>
        </div>
      )}

      {/* Team Battle: step 2 — customize */}
      {teamBattleStep === 'customize' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[var(--bg-nav)] border border-white/15 rounded-3xl p-5 w-full max-w-sm shadow-2xl max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between">
              <button onClick={() => setTeamBattleStep('select')} className="text-white/40 hover:text-white text-sm font-semibold transition">← Back</button>
              <p className="font-black text-white">Customize</p>
              <button onClick={closeTeamBattle}><X className="w-5 h-5 text-white/40" /></button>
            </div>

            {tbError && <p className="text-sm text-red-400 bg-red-500/10 border border-red-400/20 rounded-xl px-3 py-2">{tbError}</p>}

            {/* Teams toggle */}
            <div>
              <p className="text-xs font-bold text-white/40 uppercase tracking-widest mb-2">Format</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setTbTeamsEnabled(true)}
                  className={cn('flex-1 py-2.5 rounded-xl border-2 text-sm font-black transition-all', tbTeamsEnabled ? 'border-violet-400 bg-violet-500/20 text-white' : 'border-white/10 bg-white/5 text-white/50')}
                >
                  👥 Teams
                </button>
                <button
                  onClick={() => setTbTeamsEnabled(false)}
                  className={cn('flex-1 py-2.5 rounded-xl border-2 text-sm font-black transition-all', !tbTeamsEnabled ? 'border-violet-400 bg-violet-500/20 text-white' : 'border-white/10 bg-white/5 text-white/50')}
                >
                  🆓 Free-for-all
                </button>
              </div>
              <p className="text-[11px] text-white/40 mt-1.5 pl-1">
                {tbTeamsEnabled ? 'Everyone splits evenly into 2 teams.' : 'Everyone plays for themselves.'}
              </p>
            </div>

            {/* Subject */}
            <div>
              <p className="text-xs font-bold text-white/40 uppercase tracking-widest mb-2">Subject</p>
              <div className="grid grid-cols-2 gap-1.5">
                {(['math', 'science', 'history', 'english'] as Subject[]).map(s => (
                  <button
                    key={s}
                    onClick={() => setTbSubject(s)}
                    className={cn('py-2 rounded-xl border-2 text-xs font-semibold capitalize transition-all', tbSubject === s ? 'border-violet-400 bg-violet-500/20 text-white' : 'border-white/10 bg-white/5 text-white/70')}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Grade */}
            <div>
              <p className="text-xs font-bold text-white/40 uppercase tracking-widest mb-2">Grade Level</p>
              <div className="grid grid-cols-6 gap-1">
                {Array.from({ length: 12 }, (_, i) => i + 1).map(g => (
                  <button
                    key={g}
                    onClick={() => setTbGrade(g)}
                    className={cn('py-1.5 rounded-lg text-[11px] font-bold border-2 transition-all', tbGrade === g ? 'border-violet-400 bg-violet-600 text-white' : 'border-white/10 bg-white/5 text-white/70')}
                  >
                    Gr.{g}
                  </button>
                ))}
              </div>
            </div>

            {/* Time per question */}
            <div>
              <p className="text-xs font-bold text-white/40 uppercase tracking-widest mb-2">Time per Question</p>
              <div className="flex gap-2">
                {[10, 15, 20, 30].map(t => (
                  <button
                    key={t}
                    onClick={() => setTbSeconds(t)}
                    className={cn('flex-1 py-2 rounded-xl border-2 text-sm font-black transition-all', tbSeconds === t ? 'border-violet-400 bg-violet-500/20 text-white' : 'border-white/10 bg-white/5 text-white/40')}
                  >
                    {t}s
                  </button>
                ))}
              </div>
            </div>

            <p className="text-xs text-center text-white/30">First to 5 points wins</p>

            <button
              onClick={createTeamBattle}
              disabled={tbCreating}
              className="w-full py-3.5 rounded-2xl font-black text-white text-sm bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:opacity-90 transition disabled:opacity-50"
            >
              {tbCreating ? 'Starting...' : 'Start Battle ⚔️'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
