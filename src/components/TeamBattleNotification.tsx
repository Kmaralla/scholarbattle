'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Swords, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Subject } from '@/types'
import { UserAvatar } from '@/components/profile/UserAvatar'

interface TeamChallengePayload {
  team_battle_id: string
  host_username: string
  host_avatar_url: string | null
  host_equipped_frame?: string | null
  subject: Subject
  grade_level: number
  teams_enabled: boolean
}

export function TeamBattleNotification({ userId }: { userId: string }) {
  const [invite, setInvite] = useState<TeamChallengePayload | null>(null)
  const [accepting, setAccepting] = useState(false)
  const [visible, setVisible] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const channel = supabase.channel(`team_challenge:${userId}`)
    channel
      .on('broadcast', { event: 'incoming_team_challenge' }, ({ payload }) => {
        setInvite(payload as TeamChallengePayload)
        setAccepting(false)
        setVisible(true)
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [userId])

  async function accept() {
    if (!invite) return
    setAccepting(true)
    await supabase.from('team_battle_participants')
      .update({ status: 'accepted' })
      .eq('team_battle_id', invite.team_battle_id)
      .eq('user_id', userId)
    router.push(`/team-battle/${invite.team_battle_id}`)
    setVisible(false)
  }

  function decline() {
    if (invite) {
      supabase.from('team_battle_participants')
        .update({ status: 'declined' })
        .eq('team_battle_id', invite.team_battle_id)
        .eq('user_id', userId)
    }
    setVisible(false)
    setInvite(null)
  }

  if (!visible || !invite) return null

  return (
    <div className={cn(
      'fixed bottom-24 right-4 z-50 md:bottom-6',
      'w-80 bg-slate-900 rounded-2xl shadow-2xl border border-white/10 overflow-hidden',
      'animate-in slide-in-from-bottom-4 duration-300'
    )}>
      <div className="bg-violet-600 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Swords className="w-4 h-4 text-white" />
          <span className="text-white font-bold text-sm">{invite.teams_enabled ? 'Team Battle!' : 'Group Battle!'}</span>
        </div>
        <button onClick={decline} className="text-violet-200 hover:text-white transition">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 space-y-3">
        <div className="flex items-center gap-3">
          <UserAvatar username={invite.host_username} avatarUrl={invite.host_avatar_url} frameId={invite.host_equipped_frame} size="md" />
          <p className="text-sm text-white/70">
            <span className="font-bold text-white">{invite.host_username}</span> invited you to a {invite.teams_enabled ? 'team' : 'group'} battle!
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-full text-xs font-bold border border-violet-400/30 bg-violet-500/20 text-violet-300 capitalize">
            {invite.subject}
          </span>
          <span className="text-xs text-white/40">Grade {invite.grade_level}</span>
          <span className="text-xs text-white/40">First to 5 wins</span>
        </div>
        <div className="flex gap-2 pt-1">
          <button
            onClick={decline}
            className="flex-1 py-2 rounded-xl border border-white/10 text-sm font-semibold text-white/50 hover:bg-white/5 transition"
          >
            Decline
          </button>
          <button
            onClick={accept}
            disabled={accepting}
            className="flex-1 py-2 rounded-xl bg-violet-600 text-white text-sm font-bold hover:bg-violet-500 transition disabled:opacity-60"
          >
            {accepting ? 'Joining...' : '⚔️ Accept'}
          </button>
        </div>
      </div>
    </div>
  )
}
