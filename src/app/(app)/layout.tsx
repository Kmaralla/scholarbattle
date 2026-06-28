import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Navbar } from '@/components/layout/Navbar'

export default async function AppLayout({ children, params }: { children: React.ReactNode; params: any }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Check if profile exists — skip this check when already on /onboarding
  const { data: profile } = await supabase
    .from('users')
    .select('id')
    .eq('id', user.id)
    .maybeSingle()

  // Get the pathname from headers to avoid redirecting on onboarding page itself
  const { headers } = await import('next/headers')
  const headersList = await headers()
  const pathname = headersList.get('x-pathname') ?? ''

  if (!profile && !pathname.includes('/onboarding')) {
    redirect('/onboarding')
  }

  return (
    <div className="flex flex-col md:flex-row h-full min-h-screen">
      <Navbar />
      <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
        {children}
      </main>
    </div>
  )
}
