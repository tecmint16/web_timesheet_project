import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import type { Profile, Project, Cluster, Application } from '@/types/database.types'
import UserManagement from '@/components/admin/UserManagement'

export const metadata: Metadata = { title: 'Manajemen User' }

export default async function AdminUsersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch all users with their assignments
  const { data: usersRaw } = await supabase
    .from('profiles')
    .select(`
      *,
      projects(project_code, project_name),
      clusters(cluster_name),
      profile_applications(
        application_id,
        applications(id, app_code, app_name)
      )
    `)
    .order('created_at', { ascending: false })

  const { data: projectsRaw } = await supabase
    .from('projects')
    .select('*')
    .order('project_code')

  const { data: clustersRaw } = await supabase
    .from('clusters')
    .select('*, projects(project_code, project_name)')
    .order('cluster_name')

  const { data: appsRaw } = await supabase
    .from('applications')
    .select('*, clusters(cluster_name, project_id)')
    .order('app_name')

  const users = (usersRaw ?? []) as any[]
  const projects = (projectsRaw ?? []) as Project[]
  const clusters = (clustersRaw ?? []) as any[]
  const applications = (appsRaw ?? []) as any[]

  return (
    <div style={{ maxWidth: '1200px' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 className="page-title">Manajemen User</h1>
        <p className="text-muted" style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>
          Kelola akun pegawai, penugasan proyek, cluster, dan aplikasi.
        </p>
      </div>
      <UserManagement
        users={users}
        projects={projects}
        clusters={clusters}
        applications={applications}
      />
    </div>
  )
}
