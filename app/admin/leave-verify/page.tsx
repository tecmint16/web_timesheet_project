import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LeaveVerifyClient } from '@/components/admin/LeaveVerifyClient'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Admin — Verifikasi Cuti' }

export default async function LeaveVerifyPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: leaveRequests } = await supabase
    .from('leave_requests')
    .select('*, profiles(full_name, npp)')
    .order('created_at', { ascending: false })

  return <LeaveVerifyClient leaveRequests={(leaveRequests ?? []) as any} />
}
