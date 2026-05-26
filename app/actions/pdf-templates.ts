'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createAdminClient } from '@/lib/supabase/server'

type FieldMapping = Record<string, { x: number; y: number; size: number }>

// ─── Helper ───────────────────────────────────────────────
async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Tidak terautentikasi.')
  const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!['admin', 'Admin'].includes((data as any)?.role ?? '')) throw new Error('Akses ditolak.')
  return user
}

// ─── PDF TEMPLATES ─────────────────────────────────────────

/** Upload PDF file to Supabase Storage + create template record */
export async function uploadPdfTemplate(
  _prev: { error?: string; success?: boolean; id?: string },
  formData: FormData
): Promise<{ error?: string; success?: boolean; id?: string }> {
  try { await requireAdmin() } catch (e: any) { return { error: e.message } }

  const templateName = formData.get('template_name') as string
  const file = formData.get('pdf_file') as File | null

  if (!templateName) return { error: 'Nama template wajib diisi.' }

  const db = createAdminClient() as any
  let filePath: string | null = null

  if (file && file.size > 0) {
    const arrayBuffer = await file.arrayBuffer()
    const bytes = new Uint8Array(arrayBuffer)
    const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`

    const { error: storageError } = await db.storage
      .from('pdf-templates')
      .upload(fileName, bytes, { contentType: 'application/pdf', upsert: false })

    if (storageError) return { error: `Gagal upload file: ${storageError.message}` }
    filePath = fileName
  }

  const payload: any = { template_name: templateName, is_active: true }
  if (filePath) payload.file_path = filePath

  const { data: newTemplate, error } = await db
    .from('pdf_templates')
    .insert(payload)
    .select('id')
    .single()

  if (error) return { error: `Gagal menyimpan template: ${error.message}` }
  revalidatePath('/admin/pdf-editor')
  return { success: true, id: newTemplate?.id }
}

/** Save field_mappings JSONB for a template */
export async function savePdfFieldMappings(
  templateId: string,
  fieldMappings: FieldMapping
): Promise<{ error?: string }> {
  try { await requireAdmin() } catch (e: any) { return { error: e.message } }

  const db = createAdminClient() as any
  const { error } = await db
    .from('pdf_templates')
    .update({ field_mappings: fieldMappings })
    .eq('id', templateId)

  if (error) return { error: error.message }
  revalidatePath('/admin/pdf-editor')
  return {}
}

/** Delete a template (and its storage file) */
export async function deletePdfTemplate(
  templateId: string
): Promise<{ error?: string }> {
  try { await requireAdmin() } catch (e: any) { return { error: e.message } }

  const db = createAdminClient() as any

  // Get file_path before deleting
  const { data: tpl } = await db
    .from('pdf_templates').select('file_path').eq('id', templateId).single()

  if (tpl?.file_path) {
    await db.storage.from('pdf-templates').remove([tpl.file_path])
  }

  const { error } = await db.from('pdf_templates').delete().eq('id', templateId)
  if (error) return { error: error.message }
  revalidatePath('/admin/pdf-editor')
  return {}
}

/** Set a template as active (deactivate others) */
export async function setActiveTemplate(
  templateId: string
): Promise<{ error?: string }> {
  try { await requireAdmin() } catch (e: any) { return { error: e.message } }
  const db = createAdminClient() as any
  await db.from('pdf_templates').update({ is_active: false }).neq('id', templateId)
  const { error } = await db.from('pdf_templates').update({ is_active: true }).eq('id', templateId)
  if (error) return { error: error.message }
  revalidatePath('/admin/pdf-editor')
  return {}
}
