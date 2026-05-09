import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdminDashboardClient } from '@/components/admin/AdminDashboardClient'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Admin — Monitoring Dashboard' }

export default async function AdminDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Summary counts
  const { count: totalUsers } = await supabase
    .from('profiles').select('*', { count: 'exact', head: true })
    .eq('role', 'user')

  const { count: pendingLeave } = await supabase
    .from('leave_requests').select('*', { count: 'exact', head: true })
    .eq('status', 'Pending_Approval')

  const { count: totalProjects } = await supabase
    .from('master_projects').select('*', { count: 'exact', head: true })
    .eq('is_active', true)

  // Shift distribution (last 30 days)
  const since = new Date()
  since.setDate(since.getDate() - 30)
  const sinceStr = since.toISOString().split('T')[0]

  const { data: shiftDataRaw } = await supabase
    .from('timesheets')
    .select('shift_type')
    .gte('log_date', sinceStr)

  const shiftData = (shiftDataRaw ?? []) as { shift_type: string }[]

  const shiftCounts: Record<string, number> = {}
  for (const ts of shiftData) {
    shiftCounts[ts.shift_type] = (shiftCounts[ts.shift_type] ?? 0) + 1
  }
  const shiftChartData = Object.entries(shiftCounts).map(([name, value]) => ({ name, value }))

  // App allocation (top 8 projects by timesheet count)
  const { data: tsWithProjectRaw } = await supabase
    .from('timesheets')
    .select('project_id, master_projects(app_name)')
    .gte('log_date', sinceStr)
    .not('project_id', 'is', null)

  const tsWithProject = (tsWithProjectRaw ?? []) as { project_id: string; master_projects: { app_name: string } | null }[]

  const appCounts: Record<string, number> = {}
  for (const ts of tsWithProject) {
    const app = ts.master_projects?.app_name ?? 'Lainnya'
    appCounts[app] = (appCounts[app] ?? 0) + 1
  }
  const appChartData = Object.entries(appCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, value]) => ({ name, value }))

  // Recent leave requests
  const { data: recentLeave } = await supabase
    .from('leave_requests')
    .select('*, profiles(full_name, npp)')
    .order('created_at', { ascending: false })
    .limit(5)

  return (
    <AdminDashboardClient
      stats={{
        totalUsers: totalUsers ?? 0,
        pendingLeave: pendingLeave ?? 0,
        totalProjects: totalProjects ?? 0,
      }}
      shiftChartData={shiftChartData}
      appChartData={appChartData}
      recentLeave={(recentLeave ?? []) as any}
    />
  )
}
