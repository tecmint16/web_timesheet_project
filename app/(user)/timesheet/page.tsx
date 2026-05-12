import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import TimesheetPageClient from '@/components/timesheet/TimesheetPageClient'
import type { Profile, Project, Cluster, Application } from '@/types/database.types'

export const metadata: Metadata = { title: 'Input Timesheet' }

export default async function TimesheetPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch profile with project/cluster assignments
  const { data: profileRaw } = await supabase
    .from('profiles')
    .select(`
      *,
      projects(id, project_code, project_name),
      clusters(id, cluster_name)
    `)
    .eq('id', user.id)
    .single()
  const profile = profileRaw as Profile & {
    projects: Pick<Project, 'id' | 'project_code' | 'project_name'> | null
    clusters: Pick<Cluster, 'id' | 'cluster_name'> | null
  } | null
  if (!profile) redirect('/login')

  // Fetch only apps assigned to this user (from profile_applications)
  const { data: profileAppsRaw } = await supabase
    .from('profile_applications')
    .select('application_id, applications(id, app_code, app_name)')
    .eq('profile_id', user.id)

  const assignedApps = ((profileAppsRaw ?? []) as any[]).map(pa => ({
    id: pa.applications?.id ?? pa.application_id,
    app_code: pa.applications?.app_code ?? '',
    app_name: pa.applications?.app_name ?? '',
  })) as Pick<Application, 'id' | 'app_code' | 'app_name'>[]

  // Fetch timesheets (last 60 days) with their applications
  const since = new Date()
  since.setDate(since.getDate() - 60)
  const sinceStr = since.toISOString().split('T')[0]

  const { data: timesheetsRaw } = await supabase
    .from('timesheets')
    .select(`
      *,
      timesheet_applications(
        application_id,
        applications(id, app_code, app_name)
      )
    `)
    .eq('profile_id', user.id)
    .gte('log_date', sinceStr)
    .order('log_date', { ascending: false })

  const timesheets = (timesheetsRaw ?? []) as any[]

  return (
    <TimesheetPageClient
      profile={profile}
      assignedApps={assignedApps}
      timesheets={timesheets}
    />
  )
}
