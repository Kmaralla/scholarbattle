import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Navbar } from '@/components/layout/Navbar'
import { ChallengeNotification } from '@/components/ChallengeNotification'
import { PresenceTracker } from '@/components/PresenceTracker'
import { headers } from 'next/headers'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('id, username')
    .eq('id', user.id)
    .maybeSingle()

  const headersList = await headers()
  const pathname = headersList.get('x-pathname') ?? ''

  if (!profile && !pathname.includes('/onboarding')) {
    redirect('/onboarding')
  }

  if (!profile) {
    return (
      <div className="flex flex-col md:flex-row h-full min-h-screen">
        <Navbar />
        <main className="flex-1 overflow-y-auto pb-20 md:pb-0">{children}</main>
      </div>
    )
  }

  return (
    <PresenceTracker userId={profile.id} username={profile.username}>
      <div className="flex flex-col md:flex-row h-full min-h-screen bg-[var(--bg-base)]">
        <Navbar />
        <main className="flex-1 overflow-y-auto pb-24 md:pb-0 min-h-screen">{children}</main>
        <ChallengeNotification userId={user.id} />
      </div>
    </PresenceTracker>
  )
}
