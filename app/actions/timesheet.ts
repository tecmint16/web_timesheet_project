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

  const id = formData.get('id') as string | null
  const log_date = formData.get('log_date') as string
  const shift_type = formData.get('shift_type') as string
  const time_in = formData.get('time_in') as string
  const time_out = formData.get('time_out') as string
  const status = formData.get('status') as string
  const project_id = (formData.get('project_id') as string) || null
  const activity_desc = formData.get('activity_desc') as string
  const short_hours_reason = (formData.get('short_hours_reason') as string) || null

  if (!log_date || !shift_type || !time_in || !time_out) {
    return { error: 'Semua field wajib diisi.' }
  }

  // Calculate work hours to validate soft warning
  const [inH, inM] = time_in.split(':').map(Number)
  const [outH, outM] = time_out.split(':').map(Number)
  let diffMin = (outH * 60 + outM) - (inH * 60 + inM)
  if (diffMin < 0) diffMin += 24 * 60
  const workHours = diffMin / 60

  if (workHours < 8 && !short_hours_reason?.trim()) {
    return { error: 'Jam kerja kurang dari 8 jam. Wajib mengisi alasan kekurangan jam.' }
  }

  const payload = {
    profile_id: user.id,
    log_date,
    shift_type,
    time_in,
    time_out,
    status,
    project_id,
    activity_desc,
    short_hours_reason: workHours < 8 ? short_hours_reason : null,
  }

  // Use admin client to bypass strict enum typing in Supabase
  const db = await createAdminClient() as any

  let dbError
  if (id) {
    const { error } = await db
      .from('timesheets')
      .update(payload)
      .eq('id', id)
      .eq('profile_id', user.id)
      .eq('is_locked', false)
    dbError = error
  } else {
    const { error } = await db.from('timesheets').insert(payload)
    dbError = error
  }

  if (dbError) {
    if (dbError.code === '23505') {
      return { error: 'Sudah ada entri untuk tanggal ini. Gunakan tombol Edit untuk mengubahnya.' }
    }
    return { error: `Gagal menyimpan: ${dbError.message}` }
  }

  revalidatePath('/timesheet')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function deleteTimesheet(id: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Tidak terautentikasi.' }

  // Delete only own unlocked timesheets — RLS still enforces via profile_id check
  const db = await createAdminClient() as any
  const { error } = await db
    .from('timesheets')
    .delete()
    .eq('id', id)
    .eq('profile_id', user.id)
    .eq('is_locked', false)

  if (error) return { error: error.message }

  revalidatePath('/timesheet')
  revalidatePath('/dashboard')
  return {}
}
