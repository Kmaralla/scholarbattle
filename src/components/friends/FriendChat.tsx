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

export function FriendChat({ currentUser, friend }: { currentUser: User; friend: User }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  useEffect(() => {
    loadMessages()

    // Real-time subscription
    const channel = supabase
      .channel(`chat:${[currentUser.id, friend.id].sort().join(':')}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `receiver_id=eq.${currentUser.id}`,
      }, (payload) => {
        const msg = payload.new as Message
        if (msg.sender_id === friend.id) {
          setMessages(prev => [...prev, msg])
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [friend.id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function loadMessages() {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .or(
        `and(sender_id.eq.${currentUser.id},receiver_id.eq.${friend.id}),` +
        `and(sender_id.eq.${friend.id},receiver_id.eq.${currentUser.id})`
      )
      .order('created_at', { ascending: true })
      .limit(100)
    if (data) setMessages(data)
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    const content = text.trim()
    if (!content || sending) return
    setSending(true)
    setText('')

    const optimistic: Message = {
      id: `temp-${Date.now()}`,
      sender_id: currentUser.id,
      receiver_id: friend.id,
      content,
      created_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, optimistic])

    const { data } = await supabase.from('messages').insert({
      sender_id: currentUser.id,
      receiver_id: friend.id,
      content,
    }).select().single()

    if (data) {
      setMessages(prev => prev.map(m => m.id === optimistic.id ? data : m))
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
      <form onSubmit={handleSend} className="flex items-center gap-2 px-4 py-3 border-t border-white/10 flex-shrink-0">
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder={`Message ${friend.username}...`}
          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-indigo-400 transition"
          autoFocus
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
