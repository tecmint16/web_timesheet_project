import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { TimesheetPageClient } from '@/components/timesheet/TimesheetPageClient'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Input Timesheet' }

export default async function TimesheetPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch projects for dropdown
  const { data: projects } = await supabase
    .from('master_projects')
    .select('*')
    .eq('is_active', true)
    .order('project_name')

  // Fetch last 60 days of timesheets
  const since = new Date()
  since.setDate(since.getDate() - 60)
  const sinceStr = since.toISOString().split('T')[0]

  const { data: entries } = await supabase
    .from('timesheets')
    .select('*, master_projects(project_name, project_code, cluster_name, app_name)')
    .eq('profile_id', user.id)
    .gte('log_date', sinceStr)
    .order('log_date', { ascending: false })

  return (
    <TimesheetPageClient
      projects={projects ?? []}
      entries={(entries ?? []) as any}
    />
  )
}
