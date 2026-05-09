import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { MasterDataClient } from '@/components/admin/MasterDataClient'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Admin — Master Data' }

export default async function MasterDataPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: projects } = await supabase
    .from('master_projects')
    .select('*')
    .order('project_name')

  return <MasterDataClient projects={projects ?? []} />
}
