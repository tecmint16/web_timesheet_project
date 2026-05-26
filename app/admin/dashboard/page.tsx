import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { AdminDashboardClient } from '@/components/admin/AdminDashboardClient'
import UserMonitoringCard from '@/components/admin/UserMonitoringCard'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Admin — Monitoring Dashboard' }

export default async function AdminDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Use admin client (bypasses RLS) for all cross-user monitoring queries
  const db = createAdminClient() as any

  // Summary counts — use admin client to bypass RLS
  const { count: totalUsers } = await db
    .from('profiles').select('*', { count: 'exact', head: true })
    .ilike('role', '%user%')

  const { count: pendingLeave } = await db
    .from('leave_requests').select('*', { count: 'exact', head: true })
    .eq('status', 'Pending_Approval')

  const { count: totalProjects } = await db
    .from('projects').select('*', { count: 'exact', head: true })

  // Shift distribution (last 30 days)
  const since = new Date()
  since.setDate(since.getDate() - 30)
  const sinceStr = since.toISOString().split('T')[0]

  const { data: shiftDataRaw } = await db
    .from('timesheets').select('shift_type').gte('log_date', sinceStr)

  const shiftData = (shiftDataRaw ?? []) as { shift_type: string }[]
  const shiftCounts: Record<string, number> = {}
  for (const ts of shiftData) {
    shiftCounts[ts.shift_type] = (shiftCounts[ts.shift_type] ?? 0) + 1
  }
  const shiftChartData = Object.entries(shiftCounts).map(([name, value]) => ({ name, value }))

  // App usage from timesheet_applications (V1.2 normalized)
  const { data: appUsageRaw } = await db
    .from('timesheet_applications')
    .select('applications(app_code, app_name)')
    .limit(200)

  const appCounts: Record<string, number> = {}
  for (const row of (appUsageRaw ?? []) as any[]) {
    const name = row.applications?.app_name ?? 'Lainnya'
    appCounts[name] = (appCounts[name] ?? 0) + 1
  }
  const appChartData = Object.entries(appCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, value]) => ({ name, value }))

  // Recent leave requests
  const { data: recentLeave } = await db
    .from('leave_requests')
    .select('*, profiles(full_name, npp)')
    .order('created_at', { ascending: false })
    .limit(5)

  // User monitoring list — fetch all, filter admin roles in JS
  // PostgREST does not support ilike on ENUM columns in .not()
  const { data: allProfiles, error: monErr } = await db
    .from('profiles')
    .select(`
      id, full_name, npp, role,
      projects(project_code, project_name),
      clusters(cluster_name)
    `)
    .order('full_name')

  if (monErr) {
    console.error('[monitoring] profiles query error:', JSON.stringify(monErr))
  }

  // Filter out admin roles client-side (handles 'admin', 'Admin', and any future casing)
  const usersForMonitoring = ((allProfiles ?? []) as any[]).filter(
    u => !['admin', 'Admin'].includes(u.role ?? '')
  )

  // Timesheet summary per user (last 30 days)
  const { data: tsCountRaw } = await db
    .from('timesheets')
    .select('profile_id')
    .gte('log_date', sinceStr)

  const tsCount: Record<string, number> = {}
  for (const r of (tsCountRaw ?? []) as any[]) {
    tsCount[r.profile_id] = (tsCount[r.profile_id] ?? 0) + 1
  }

  const monitoringUsers = usersForMonitoring.map(u => ({
    ...u,
    timesheet_count_30d: tsCount[u.id] ?? 0,
  }))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '1200px' }}>
      <div>
        <h1 className="page-title">Monitoring Dashboard</h1>
        <p className="text-muted" style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>
          Ringkasan aktivitas seluruh pegawai dan laporan ekspor timesheet.
        </p>
      </div>

      {/* Existing charts */}
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

      {/* V1.2 New: User monitoring + export */}
      <UserMonitoringCard users={monitoringUsers} />
    </div>
  )
}
