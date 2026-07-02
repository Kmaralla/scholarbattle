'use client'
import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User } from '@/types'
import { UserAvatar } from '@/components/profile/UserAvatar'
import { Send } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Message {
  id: string
  sender_id: string
  receiver_id: string
  content: string
  created_at: string
}

// Stable channel name for two users (same for both sides)
function channelName(a: string, b: string) {
  return `chat:${[a, b].sort().join(':')}`
}

export function FriendChat({ currentUser, friend }: { currentUser: User; friend: User }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const supabase = createClient()

  useEffect(() => {
    loadMessages()

    // Use Broadcast for instant delivery — both users subscribe to the same channel
    const ch = supabase.channel(channelName(currentUser.id, friend.id), {
      config: { broadcast: { self: false } },
    })
    channelRef.current = ch

    ch.on('broadcast', { event: 'new_message' }, ({ payload }: { payload: Message }) => {
      setMessages(prev => {
        // Ignore if we already have this message (our own optimistic insert)
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
    // Fetch both directions separately and merge — avoids nested .or() syntax issues
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

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    const content = text.trim()
    if (!content || sending) return
    setSending(true)
    setText('')

    // Optimistic insert
    const tempId = `temp-${Date.now()}`
    const optimistic: Message = {
      id: tempId,
      sender_id: currentUser.id,
      receiver_id: friend.id,
      content,
      created_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, optimistic])

    // Save to DB
    const { data, error } = await supabase.from('messages').insert({
      sender_id: currentUser.id,
      receiver_id: friend.id,
      content,
    }).select().single()

    if (error) {
      // Remove optimistic if save failed
      console.error('Message save failed:', error)
      setMessages(prev => prev.filter(m => m.id !== tempId))
      setText(content) // restore text
      setSending(false)
      return
    }

    if (data) {
      // Replace optimistic with real DB row
      setMessages(prev => prev.map(m => m.id === tempId ? data : m))

      // Broadcast to friend so they see it instantly
      await channelRef.current?.send({
        type: 'broadcast',
        event: 'new_message',
        payload: data,
      })
    }

    setSending(false)
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

          return (
            <div key={msg.id} className={cn('flex items-end gap-2', isMe ? 'flex-row-reverse' : 'flex-row')}>
              {/* Avatar — only on first of a run */}
              <div className="w-7 flex-shrink-0">
                {showAvatar && !isMe && (
                  <UserAvatar username={friend.username} avatarUrl={(friend as any).avatar_url} size="sm" />
                )}
                {showAvatar && isMe && (
                  <UserAvatar username={currentUser.username} avatarUrl={(currentUser as any).avatar_url} size="sm" />
                )}
              </div>

              <div className={cn('flex flex-col gap-0.5 max-w-[70%]', isMe && 'items-end')}>
                <div className={cn(
                  'px-3.5 py-2 rounded-2xl text-sm leading-relaxed break-words',
                  isMe
                    ? 'bg-indigo-500 text-white rounded-br-sm'
                    : 'bg-white/10 text-white rounded-bl-sm'
                )}>
                  {msg.content}
                </div>
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
    </div>
  )
}
