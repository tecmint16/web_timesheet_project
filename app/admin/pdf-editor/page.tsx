import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import PdfEditorClient from '@/components/admin/PdfEditorClient'

export const metadata: Metadata = { title: 'Admin — PDF Layout Editor' }

export default async function PdfEditorPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch all templates
  const { data: templatesRaw } = await supabase
    .from('pdf_templates')
    .select('*')
    .order('created_at', { ascending: false })

  const templates = (templatesRaw ?? []) as {
    id: string
    template_name: string
    file_path: string | null
    field_mappings: Record<string, { x: number; y: number; size: number }>
    is_active: boolean
    updated_at: string
  }[]

  return (
    <div style={{ maxWidth: '1100px' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 className="page-title">PDF Layout Editor</h1>
        <p className="text-muted" style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>
          Upload template PDF dan petakan koordinat teks secara dinamis.
        </p>
      </div>
      <PdfEditorClient templates={templates} />
    </div>
  )
}
