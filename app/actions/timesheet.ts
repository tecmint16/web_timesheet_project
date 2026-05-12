'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export type TimesheetFormState = {
  error?: string
  success?: boolean
}

export async function upsertTimesheet(
  _prev: TimesheetFormState,
  formData: FormData
): Promise<TimesheetFormState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Sesi tidak valid. Silakan login ulang.' }

  const id                = formData.get('id') as string | null
  const log_date          = formData.get('log_date') as string
  const shift_type        = formData.get('shift_type') as string
  const time_in           = formData.get('time_in') as string
  const time_out          = formData.get('time_out') as string
  const status            = formData.get('status') as string
  const activity_desc     = formData.get('activity_desc') as string
  const short_hours_reason = (formData.get('short_hours_reason') as string) || null
  const app_ids           = formData.getAll('application_ids[]') as string[]

  if (!log_date || !shift_type || !time_in || !time_out) {
    return { error: 'Semua field wajib diisi.' }
  }

  // Calculate work hours
  const [inH, inM]   = time_in.split(':').map(Number)
  const [outH, outM] = time_out.split(':').map(Number)
  let diffMin = (outH * 60 + outM) - (inH * 60 + inM)
  if (diffMin < 0) diffMin += 24 * 60
  const workHours = diffMin / 60

  if (workHours < 8 && !short_hours_reason?.trim()) {
    return { error: 'Jam kerja kurang dari 8 jam. Wajib mengisi alasan kekurangan jam.' }
  }

  const payload = {
    profile_id:         user.id,
    log_date,
    shift_type,
    time_in,
    time_out,
    status,
    activity_desc,
    short_hours_reason: workHours < 8 ? short_hours_reason : null,
  }

  const db = createAdminClient() as any
  let timesheetId: string | null = null
  let dbError

  if (id) {
    // Update existing (verify ownership + not locked)
    const { data: ts } = await db.from('timesheets').select('id, profile_id, is_locked').eq('id', id).single()
    if (!ts || ts.profile_id !== user.id) return { error: 'Entri tidak ditemukan.' }
    if (ts.is_locked) return { error: 'Entri ini sudah dikunci oleh Admin dan tidak dapat diubah.' }

    const { error } = await db.from('timesheets').update(payload).eq('id', id)
    dbError = error
    timesheetId = id

    // Replace app associations
    if (!dbError) {
      await db.from('timesheet_applications').delete().eq('timesheet_id', id)
    }
  } else {
    // Insert new
    const { data: newTs, error } = await db.from('timesheets').insert(payload).select('id').single()
    dbError = error
    timesheetId = newTs?.id ?? null
  }

  if (dbError) {
    if (dbError.code === '23505') {
      return { error: 'Sudah ada entri untuk tanggal ini. Gunakan tombol Edit untuk mengubahnya.' }
    }
    return { error: `Gagal menyimpan: ${dbError.message}` }
  }

  // Insert timesheet_applications
  if (timesheetId && app_ids.length > 0) {
    const rows = app_ids.map(application_id => ({ timesheet_id: timesheetId, application_id }))
    const { error: appErr } = await db.from('timesheet_applications').insert(rows)
    if (appErr) console.error('timesheet_applications insert error:', appErr)
  }

  revalidatePath('/timesheet')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function deleteTimesheet(id: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Tidak terautentikasi.' }

  const db = createAdminClient() as any

  // Verify ownership and not locked
  const { data: ts } = await db.from('timesheets').select('profile_id, is_locked').eq('id', id).single()
  if (!ts || ts.profile_id !== user.id) return { error: 'Entri tidak ditemukan.' }
  if (ts.is_locked) return { error: 'Entri sudah dikunci dan tidak dapat dihapus.' }

  const { error } = await db.from('timesheets').delete().eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/timesheet')
  revalidatePath('/dashboard')
  return {}
}
