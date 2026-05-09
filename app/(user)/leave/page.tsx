import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LeavePageClient } from '@/components/leave/LeavePageClient'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Pengajuan Cuti' }

export default async function LeavePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')

  const { data: leaveRequests } = await supabase
    .from('leave_requests')
    .select('*')
    .eq('profile_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <LeavePageClient
      profile={profile}
      leaveRequests={leaveRequests ?? []}
    />
  )
}
