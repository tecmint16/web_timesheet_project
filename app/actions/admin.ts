'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createAdminClient } from '@/lib/supabase/server'

// ─── Helper ───────────────────────────────────────────────
async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Tidak terautentikasi.')

  const { data: profileData } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  const profile = profileData as { role: string } | null
  if (!profile || !['admin', 'Admin'].includes(profile.role)) {
    throw new Error('Akses ditolak.')
  }
  return user
}

// ─── LEAVE MANAGEMENT ─────────────────────────────────────

/** Approve or reject a leave request */
export async function updateLeaveStatus(
  leaveId: string,
  status: 'Approved' | 'Rejected'
): Promise<{ error?: string }> {
  try {
    await requireAdmin()
    const db = createAdminClient() as any
    const { error } = await db.from('leave_requests').update({ status }).eq('id', leaveId)
    if (error) return { error: error.message }
    revalidatePath('/admin/leave-verify')
    revalidatePath('/admin/dashboard')
    return {}
  } catch (e: any) {
    return { error: e.message }
  }
}

// ─── USER MANAGEMENT ──────────────────────────────────────

/** Create a new user (Admin only) */
export async function createUser(
  _prev: { error?: string; success?: boolean },
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  try {
    await requireAdmin()
  } catch (e: any) {
    return { error: e.message }
  }

  const email        = formData.get('email') as string
  const password     = formData.get('password') as string
  const full_name    = formData.get('full_name') as string
  const npp          = formData.get('npp') as string
  const phone_number = formData.get('phone_number') as string
  const address      = formData.get('address') as string
  const role         = formData.get('role') as string
  const project_id   = (formData.get('project_id') as string) || null
  const cluster_id   = (formData.get('cluster_id') as string) || null
  const app_ids      = formData.getAll('application_ids[]') as string[]

  if (!email || !password || !full_name || !npp) {
    return { error: 'Email, Password, Nama Lengkap, dan NPP wajib diisi.' }
  }
  if (password.length < 8) {
    return { error: 'Password minimal 8 karakter.' }
  }

  const db = createAdminClient() as any

  // 1. Create auth user
  const { data: authData, error: authError } = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,  // auto-confirm email for internal system
  })

  if (authError) return { error: `Gagal membuat akun: ${authError.message}` }
  const userId = authData.user?.id
  if (!userId) return { error: 'Gagal mendapatkan user ID.' }

  // 2. Upsert profile (trigger may have created it already)
  const { error: profileError } = await db.from('profiles').upsert({
    id: userId,
    full_name,
    npp,
    phone_number,
    address,
    role,
    project_id,
    cluster_id,
    must_change_password: true,
    leave_balance: 12,
  }, { onConflict: 'id' })

  if (profileError) {
    // Cleanup: delete auth user if profile insert fails
    await db.auth.admin.deleteUser(userId)
    return { error: `Gagal menyimpan profil: ${profileError.message}` }
  }

  // 3. Insert profile_applications junction rows
  if (app_ids.length > 0) {
    const junctionRows = app_ids.map((application_id) => ({ profile_id: userId, application_id }))
    const { error: appError } = await db.from('profile_applications').insert(junctionRows)
    if (appError) console.error('profile_applications insert error:', appError)
  }

  revalidatePath('/admin/users')
  return { success: true }
}

/** Update an existing user (Admin only) */
export async function updateUser(
  _prev: { error?: string; success?: boolean },
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  try {
    await requireAdmin()
  } catch (e: any) {
    return { error: e.message }
  }

  const profile_id   = formData.get('profile_id') as string
  const full_name    = formData.get('full_name') as string
  const npp          = formData.get('npp') as string
  const phone_number = formData.get('phone_number') as string
  const address      = formData.get('address') as string
  const role         = formData.get('role') as string
  const project_id   = (formData.get('project_id') as string) || null
  const cluster_id   = (formData.get('cluster_id') as string) || null
  const app_ids      = formData.getAll('application_ids[]') as string[]

  if (!profile_id || !full_name || !npp) {
    return { error: 'Data tidak lengkap.' }
  }

  const db = createAdminClient() as any

  // Update profile
  const { error: profileError } = await db.from('profiles').update({
    full_name, npp, phone_number, address, role, project_id, cluster_id,
  }).eq('id', profile_id)

  if (profileError) return { error: profileError.message }

  // Replace profile_applications
  await db.from('profile_applications').delete().eq('profile_id', profile_id)
  if (app_ids.length > 0) {
    const rows = app_ids.map((application_id) => ({ profile_id, application_id }))
    await db.from('profile_applications').insert(rows)
  }

  revalidatePath('/admin/users')
  return { success: true }
}

/** Delete a user (Admin only) — removes auth user too */
export async function deleteUser(userId: string): Promise<{ error?: string }> {
  try {
    await requireAdmin()
  } catch (e: any) {
    return { error: e.message }
  }

  const db = createAdminClient() as any
  const { error } = await db.auth.admin.deleteUser(userId)
  if (error) return { error: error.message }

  revalidatePath('/admin/users')
  return {}
}

/** Reset a user's must_change_password flag (force re-change) */
export async function resetUserPassword(
  userId: string,
  newPassword: string
): Promise<{ error?: string }> {
  try {
    await requireAdmin()
  } catch (e: any) {
    return { error: e.message }
  }

  const db = createAdminClient() as any
  const { error: authErr } = await db.auth.admin.updateUserById(userId, { password: newPassword })
  if (authErr) return { error: authErr.message }

  const { error: profileErr } = await db
    .from('profiles').update({ must_change_password: true }).eq('id', userId)
  if (profileErr) console.error(profileErr)

  revalidatePath('/admin/users')
  return {}
}

// ─── MASTER DATA: PROJECTS ────────────────────────────────

export async function upsertProject(
  _prev: { error?: string; success?: boolean },
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  try { await requireAdmin() } catch (e: any) { return { error: e.message } }

  const id           = formData.get('id') as string | null
  const project_code = formData.get('project_code') as string
  const project_name = formData.get('project_name') as string

  if (!project_code || !project_name) return { error: 'Kode dan Nama Proyek wajib diisi.' }

  const db = createAdminClient() as any
  let err
  if (id) {
    const { error } = await db.from('projects').update({ project_code, project_name }).eq('id', id)
    err = error
  } else {
    const { error } = await db.from('projects').insert({ project_code, project_name })
    err = error
  }
  if (err) return { error: err.message }
  revalidatePath('/admin/master-data')
  return { success: true }
}

export async function deleteProject(id: string): Promise<{ error?: string }> {
  try { await requireAdmin() } catch (e: any) { return { error: e.message } }
  const db = createAdminClient() as any
  const { error } = await db.from('projects').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/master-data')
  return {}
}

// ─── MASTER DATA: CLUSTERS ────────────────────────────────

export async function upsertCluster(
  _prev: { error?: string; success?: boolean },
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  try { await requireAdmin() } catch (e: any) { return { error: e.message } }

  const id           = formData.get('id') as string | null
  const project_id   = formData.get('project_id') as string
  const cluster_name = formData.get('cluster_name') as string

  if (!project_id || !cluster_name) return { error: 'Proyek dan Nama Cluster wajib diisi.' }

  const db = createAdminClient() as any
  let err
  if (id) {
    const { error } = await db.from('clusters').update({ project_id, cluster_name }).eq('id', id)
    err = error
  } else {
    const { error } = await db.from('clusters').insert({ project_id, cluster_name })
    err = error
  }
  if (err) return { error: err.message }
  revalidatePath('/admin/master-data')
  return { success: true }
}

export async function deleteCluster(id: string): Promise<{ error?: string }> {
  try { await requireAdmin() } catch (e: any) { return { error: e.message } }
  const db = createAdminClient() as any
  const { error } = await db.from('clusters').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/master-data')
  return {}
}

// ─── MASTER DATA: APPLICATIONS ────────────────────────────

export async function upsertApplication(
  _prev: { error?: string; success?: boolean },
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  try { await requireAdmin() } catch (e: any) { return { error: e.message } }

  const id         = formData.get('id') as string | null
  const cluster_id = formData.get('cluster_id') as string
  const app_code   = formData.get('app_code') as string
  const app_name   = formData.get('app_name') as string

  if (!cluster_id || !app_code || !app_name) return { error: 'Semua field wajib diisi.' }

  const db = createAdminClient() as any
  let err
  if (id) {
    const { error } = await db.from('applications').update({ cluster_id, app_code, app_name }).eq('id', id)
    err = error
  } else {
    const { error } = await db.from('applications').insert({ cluster_id, app_code, app_name })
    err = error
  }
  if (err) return { error: err.message }
  revalidatePath('/admin/master-data')
  return { success: true }
}

export async function deleteApplication(id: string): Promise<{ error?: string }> {
  try { await requireAdmin() } catch (e: any) { return { error: e.message } }
  const db = createAdminClient() as any
  const { error } = await db.from('applications').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/master-data')
  return {}
}

// ─── TIMESHEET LOCKING ────────────────────────────────────

export async function lockTimesheetsForMonth(
  month: string
): Promise<{ error?: string; count?: number }> {
  try { await requireAdmin() } catch (e: any) { return { error: e.message } }

  const start = `${month}-01`
  const end   = `${month}-31`
  const db    = createAdminClient() as any

  const { data, error } = await db
    .from('timesheets').update({ is_locked: true })
    .gte('log_date', start).lte('log_date', end).select('id')

  if (error) return { error: error.message }
  revalidatePath('/admin/dashboard')
  return { count: data?.length ?? 0 }
}
