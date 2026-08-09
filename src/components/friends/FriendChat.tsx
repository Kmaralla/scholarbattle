'use client'
import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User, Subject } from '@/types'
import { UserAvatar } from '@/components/profile/UserAvatar'
import { TopicPicker } from '@/components/battle/TopicPicker'
import { Send, Swords, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { pickQuestionIndices } from '@/lib/questions'
import { useRouter } from 'next/navigation'

interface Message {
  id: string
  sender_id: string
  receiver_id: string
  content: string
  created_at: string
}

// Messages whose content starts with this prefix are challenge cards
const CHALLENGE_PREFIX = '__challenge__:'

function channelName(a: string, b: string) {
  return `chat:${[a, b].sort().join(':')}`
}

function ChallengeCard({ content, isMe }: { content: string; isMe: boolean }) {
  // Format: __challenge__:battleId:subject:grade:timeout
  const parts = content.split(':')
  const [, battleId, subject, grade] = parts
  const timeout = parts[4] ?? '15'
  const router = useRouter()
  return (
    <div className={cn(
      'rounded-2xl overflow-hidden border text-sm w-56',
      isMe ? 'border-indigo-400/40' : 'border-violet-400/40'
    )}
      style={{ background: isMe ? 'rgba(99,102,241,0.15)' : 'rgba(139,92,246,0.15)' }}>
      <div className="px-3 py-2 flex items-center gap-2 border-b border-white/10">
        <Swords className="w-3.5 h-3.5 text-indigo-300 flex-shrink-0" />
        <span className="font-black text-white text-xs uppercase tracking-wide">Battle Challenge!</span>
      </div>
      <div className="px-3 py-2.5 space-y-2">
        <div className="flex gap-1.5 flex-wrap">
          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 capitalize">{subject}</span>
          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-white/10 text-white/50 border border-white/10">Grade {grade}</span>
          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-white/10 text-white/50 border border-white/10">⏱ {timeout}s</span>
        </div>
        {!isMe && (
          <button
            onClick={() => router.push(`/battle/${battleId}?timeout=${timeout}`)}
            className="w-full py-1.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-black transition active:scale-95"
          >
            ⚔️ Accept &amp; Fight!
          </button>
        )}
        {isMe && <p className="text-white/40 text-xs">Waiting for them to accept...</p>}
      </div>
    </div>
  )
}

export function FriendChat({ currentUser, friend }: { currentUser: User; friend: User }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [showChallenge, setShowChallenge] = useState(false)
  const [challenging, setChallenging] = useState(false)
  const [timeoutSec, setTimeoutSec] = useState(15)
  const bottomRef = useRef<HTMLDivElement>(null)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    loadMessages()

    const ch = supabase.channel(channelName(currentUser.id, friend.id), {
      config: { broadcast: { self: false } },
    })
    channelRef.current = ch

    ch.on('broadcast', { event: 'new_message' }, ({ payload }: { payload: Message }) => {
      setMessages(prev => {
        if (prev.some(m => m.id === payload.id)) return prev
        return [...prev, payload]
      })
    }).subscribe()

    return () => {
      supabase.removeChannel(ch)
      channelRef.current = null
    }
  }, [friend.id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function loadMessages() {
    const [sentRes, receivedRes] = await Promise.all([
      supabase.from('messages').select('*')
        .eq('sender_id', currentUser.id).eq('receiver_id', friend.id)
        .order('created_at', { ascending: true }).limit(100),
      supabase.from('messages').select('*')
        .eq('sender_id', friend.id).eq('receiver_id', currentUser.id)
        .order('created_at', { ascending: true }).limit(100),
    ])
    const all = [...(sentRes.data ?? []), ...(receivedRes.data ?? [])]
    all.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    setMessages(all)
  }

  async function sendMessage(content: string) {
    const tempId = `temp-${Date.now()}`
    const optimistic: Message = {
      id: tempId, sender_id: currentUser.id, receiver_id: friend.id,
      content, created_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, optimistic])

    const { data, error } = await supabase.from('messages').insert({
      sender_id: currentUser.id, receiver_id: friend.id, content,
    }).select().single()

    if (error) {
      setMessages(prev => prev.filter(m => m.id !== tempId))
      return null
    }

    if (data) {
      setMessages(prev => prev.map(m => m.id === tempId ? data : m))
      await channelRef.current?.send({ type: 'broadcast', event: 'new_message', payload: data })
    }
    return data
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    const content = text.trim()
    if (!content || sending) return
    setSending(true)
    setText('')
    await sendMessage(content)
    setSending(false)
  }

  async function handleChallenge(subject: Subject, grade: number, topic: string) {
    if (challenging) return
    setChallenging(true)
    setShowChallenge(false)

    const { data: battle, error } = await supabase.from('battles').insert({
      challenger_id: currentUser.id,
      opponent_id: friend.id,
      subject, grade_level: grade,
      status: 'pending',
      challenger_score: 0, opponent_score: 0,
      question_ids: pickQuestionIndices(subject, grade, 10, topic),
    }).select().single()

    if (error || !battle) {
      alert(`Couldn't create battle: ${error?.message}`)
      setChallenging(false)
      return
    }

    // Send real-time challenge notification
    const notifCh = supabase.channel(`challenge:${friend.id}`)
    await notifCh.subscribe()
    await notifCh.send({
      type: 'broadcast', event: 'incoming_challenge',
      payload: {
        battle_id: battle.id,
        challenger_username: currentUser.username,
        challenger_avatar_url: (currentUser as any).avatar_url ?? null,
        subject, grade_level: grade,
      },
    })
    supabase.removeChannel(notifCh)

    // Send challenge card message in chat (includes timeout so recipient sees same setting)
    await sendMessage(`${CHALLENGE_PREFIX}${battle.id}:${subject}:${grade}:${timeoutSec}`)

    setChallenging(false)
    router.push(`/battle/${battle.id}?timeout=${timeoutSec}`)
  }

  function formatTime(iso: string) {
    const d = new Date(iso)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="flex flex-col h-full">
      {/* Chat header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 flex-shrink-0">
        <UserAvatar username={friend.username} avatarUrl={(friend as any).avatar_url} size="md" />
        <div>
          <p className="font-black text-white text-sm">{friend.username}</p>
          <p className="text-xs text-white/40 capitalize">{friend.rank_tier} · {friend.elo_rating} ELO</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0">
        {messages.length === 0 && (
          <div className="text-center text-white/30 text-sm mt-10">
            <p className="text-3xl mb-2">👋</p>
            <p>Say hi to {friend.username}!</p>
          </div>
        )}
        {messages.map((msg, i) => {
          const isMe = msg.sender_id === currentUser.id
          const prevMsg = messages[i - 1]
          const showAvatar = !prevMsg || prevMsg.sender_id !== msg.sender_id
          const isChallenge = msg.content.startsWith(CHALLENGE_PREFIX)

          return (
            <div key={msg.id} className={cn('flex items-end gap-2', isMe ? 'flex-row-reverse' : 'flex-row')}>
              <div className="w-7 flex-shrink-0">
                {showAvatar && !isMe && (
                  <UserAvatar username={friend.username} avatarUrl={(friend as any).avatar_url} size="sm" />
                )}
                {showAvatar && isMe && (
                  <UserAvatar username={currentUser.username} avatarUrl={(currentUser as any).avatar_url} size="sm" />
                )}
              </div>

              <div className={cn('flex flex-col gap-0.5 max-w-[70%]', isMe && 'items-end')}>
                {isChallenge ? (
                  <ChallengeCard content={msg.content} isMe={isMe} />
                ) : (
                  <div className={cn(
                    'px-3.5 py-2 rounded-2xl text-sm leading-relaxed break-words',
                    isMe
                      ? 'bg-indigo-500 text-white rounded-br-sm'
                      : 'bg-white/10 text-white rounded-bl-sm'
                  )}>
                    {msg.content}
                  </div>
                )}
                {showAvatar && (
                  <span className="text-[10px] text-white/25 px-1">{formatTime(msg.created_at)}</span>
                )}
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="flex items-center gap-2 px-4 py-3 border-t border-white/10 flex-shrink-0 bg-[var(--bg-nav)]">
        <button
          type="button"
          onClick={() => setShowChallenge(true)}
          className="w-10 h-10 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 flex items-center justify-center transition flex-shrink-0"
          title="Challenge to a battle"
        >
          <Swords className="w-4 h-4 text-indigo-300" />
        </button>
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend(e as any)}
          placeholder={`Message ${friend.username}...`}
          className="flex-1 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-400 transition"
          style={{ background: 'rgba(255,255,255,0.06)', color: 'inherit', pointerEvents: 'auto' }}
        />
        <button
          type="submit"
          disabled={!text.trim() || sending}
          className="w-10 h-10 bg-indigo-500 hover:bg-indigo-400 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl flex items-center justify-center transition flex-shrink-0"
        >
          <Send className="w-4 h-4 text-white" />
        </button>
      </form>

      {/* Challenge bottom sheet */}
      {showChallenge && (
        <div className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}
          onClick={e => { if (e.target === e.currentTarget) setShowChallenge(false) }}>
          <div className="w-full max-w-md rounded-t-3xl pb-8"
            style={{ background: 'linear-gradient(135deg,#1a1040,#0f0a2e)', border: '1px solid rgba(167,139,250,0.2)' }}>
            {/* Handle + header */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>
            <div className="flex items-center justify-between px-5 py-3">
              <div>
                <h3 className="font-black text-white">⚔️ Challenge {friend.username}</h3>
                <p className="text-xs text-white/40 mt-0.5">Pick a subject and grade</p>
              </div>
              <button onClick={() => setShowChallenge(false)}
                className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition">
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
            <div className="px-5 space-y-4">
              {challenging ? (
                <div className="flex flex-col items-center py-10 gap-3">
                  <div className="w-8 h-8 border-3 border-violet-400/30 border-t-violet-400 rounded-full animate-spin" />
                  <p className="text-white/50 text-sm">Sending challenge...</p>
                </div>
              ) : (
                <>
                  {/* Time per question picker */}
                  <div>
                    <p className="text-xs font-bold text-white/40 uppercase tracking-widest mb-2">Time per Question</p>
                    <div className="flex gap-2">
                      {[10, 15, 20, 30].map(t => (
                        <button
                          key={t}
                          onClick={() => setTimeoutSec(t)}
                          className={cn(
                            'flex-1 py-2 rounded-xl border-2 text-sm font-black transition-all',
                            timeoutSec === t
                              ? 'border-indigo-400 bg-indigo-500/20 text-white'
                              : 'border-white/10 bg-white/5 text-white/40 hover:border-white/20 hover:text-white'
                          )}
                        >
                          {t}s
                        </button>
                      ))}
                    </div>
                  </div>
                  <TopicPicker onSelect={handleChallenge} />
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
