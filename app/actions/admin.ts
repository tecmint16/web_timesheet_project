'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createAdminClient } from '@/lib/supabase/server'

/** Helper: verify the calling user is an admin */
async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Tidak terautentikasi.')

  const { data: profileData } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  const profile = profileData as { role: string } | null
  if (!profile || profile.role !== 'admin') throw new Error('Akses ditolak.')

  return user
}

/** Approve or reject a leave request */
export async function updateLeaveStatus(
  leaveId: string,
  status: 'Approved' | 'Rejected'
): Promise<{ error?: string }> {
  try {
    await requireAdmin()
    // Use admin client to bypass strict enum typing
    const db = await createAdminClient() as any
    const { error } = await db.from('leave_requests').update({ status }).eq('id', leaveId)
    if (error) return { error: error.message }
    revalidatePath('/admin/leave-verify')
    revalidatePath('/admin/dashboard')
    return {}
  } catch (e: any) {
    return { error: e.message }
  }
}

/** Upsert a master project */
export async function upsertProject(
  _prev: { error?: string; success?: boolean },
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  try {
    await requireAdmin()
  } catch (e: any) {
    return { error: e.message }
  }

  const id = formData.get('id') as string | null
  const project_name = formData.get('project_name') as string
  const project_code = formData.get('project_code') as string
  const cluster_name = formData.get('cluster_name') as string
  const app_name = formData.get('app_name') as string
  const is_active = formData.get('is_active') === 'true'

  if (!project_name || !project_code || !cluster_name || !app_name) {
    return { error: 'Semua field wajib diisi.' }
  }

  const payload = { project_name, project_code, cluster_name, app_name, is_active }
  const db = await createAdminClient() as any

  let dbError
  if (id) {
    const { error } = await db.from('master_projects').update(payload).eq('id', id)
    dbError = error
  } else {
    const { error } = await db.from('master_projects').insert(payload)
    dbError = error
  }

  if (dbError) return { error: dbError.message }

  revalidatePath('/admin/master-data')
  return { success: true }
}

/** Delete a master project */
export async function deleteProject(id: string): Promise<{ error?: string }> {
  try {
    await requireAdmin()
  } catch (e: any) {
    return { error: e.message }
  }

  const db = await createAdminClient() as any
  const { error } = await db.from('master_projects').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/master-data')
  return {}
}

/** Lock all timesheets for a given month (for monthly recap) */
export async function lockTimesheetsForMonth(
  month: string // format: YYYY-MM
): Promise<{ error?: string; count?: number }> {
  try {
    await requireAdmin()
  } catch (e: any) {
    return { error: e.message }
  }

  const start = `${month}-01`
  const end = `${month}-31`
  const db = await createAdminClient() as any

  const { data, error } = await db
    .from('timesheets')
    .update({ is_locked: true })
    .gte('log_date', start)
    .lte('log_date', end)
    .select('id')

  if (error) return { error: error.message }
  revalidatePath('/admin/dashboard')
  return { count: data?.length ?? 0 }
}
