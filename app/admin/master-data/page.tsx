import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import MasterDataClient from '@/components/admin/MasterDataClient'

export const metadata: Metadata = { title: 'Master Data' }

export default async function AdminMasterDataPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: projectsRaw } = await supabase
    .from('projects').select('*').order('project_code')

  const { data: clustersRaw } = await supabase
    .from('clusters')
    .select('*, projects(project_code, project_name)')
    .order('cluster_name')

  const { data: appsRaw } = await supabase
    .from('applications')
    .select('*, clusters(cluster_name, project_id, projects(project_code))')
    .order('app_name')

  return (
    <div style={{ maxWidth: '1100px' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 className="page-title">Master Data</h1>
        <p className="text-muted" style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>
          Kelola hierarki Proyek → Cluster → Aplikasi.
        </p>
      </div>
      <MasterDataClient
        projects={(projectsRaw ?? []) as any[]}
        clusters={(clustersRaw ?? []) as any[]}
        applications={(appsRaw ?? []) as any[]}
      />
    </div>
  )
}
