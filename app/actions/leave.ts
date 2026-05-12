'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { generateLeavePdf } from '@/lib/pdf/generator'

export type LeaveFormState = {
  error?: string
  success?: boolean
  leaveId?: string
}

export async function submitLeaveRequest(
  _prev: LeaveFormState,
  formData: FormData
): Promise<LeaveFormState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Sesi tidak valid.' }

  const { data: profileData } = await supabase
    .from('profiles').select('full_name, npp').eq('id', user.id).single()
  const profile = profileData as { full_name: string | null; npp: string | null } | null
  if (!profile) return { error: 'Profil tidak ditemukan.' }

  const leave_type = formData.get('leave_type') as string
  const start_date = formData.get('start_date') as string
  const end_date = formData.get('end_date') as string
  const address_phone = formData.get('address_phone_during_leave') as string
  const description = formData.get('description') as string

  if (!leave_type || !start_date || !end_date || !address_phone) {
    return { error: 'Semua field wajib diisi.' }
  }

  // Calculate days
  const s = new Date(start_date), e = new Date(end_date)
  if (e < s) return { error: 'Tanggal selesai harus setelah tanggal mulai.' }
  const total_days = Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1

  // Use admin client for write operations to bypass strict enum typing
  const db = createAdminClient() as any

  const { data: leaveRecord, error: insertError } = await db
    .from('leave_requests')
    .insert({
      profile_id: user.id,
      leave_type,
      start_date,
      end_date,
      total_days,
      address_phone_during_leave: address_phone,
      description,
      status: 'Draft',
    })
    .select()
    .single()

  if (insertError) return { error: `Gagal menyimpan: ${insertError.message}` }

  // Generate PDF
  try {
    const pdfBytes = await generateLeavePdf({
      full_name: profile.full_name ?? 'Karyawan',
      npp: profile.npp ?? '-',
      leave_type,
      start_date,
      end_date,
      total_days,
      address_phone_during_leave: address_phone,
      description,
      created_at: leaveRecord.created_at,
    })

    const fileName = `leave_${leaveRecord.id}_generated.pdf`
    const { error: uploadError } = await supabase.storage
      .from('leave-scans')
      .upload(`${user.id}/${fileName}`, pdfBytes, {
        contentType: 'application/pdf',
        upsert: true,
      })

    if (!uploadError) {
      const { data: urlData } = supabase.storage
        .from('leave-scans')
        .getPublicUrl(`${user.id}/${fileName}`)

      await (db as any)
        .from('leave_requests')
        .update({ pdf_generated_url: urlData.publicUrl })
        .eq('id', leaveRecord.id)
    }
  } catch (pdfErr) {
    console.error('PDF generation error:', pdfErr)
    // Non-fatal — leave request still saved
  }

  revalidatePath('/leave')
  revalidatePath('/dashboard')
  revalidatePath('/history')
  return { success: true, leaveId: leaveRecord.id }
}

export async function uploadSignedScan(
  leaveId: string,
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Sesi tidak valid.' }

  const file = formData.get('signed_scan') as File
  if (!file || file.size === 0) return { error: 'File tidak valid.' }

  // Validate: max 5MB
  if (file.size > 5 * 1024 * 1024) {
    return { error: 'Ukuran file melebihi batas 5MB.' }
  }

  // Validate format
  const allowed = ['application/pdf', 'image/jpeg', 'image/png']
  if (!allowed.includes(file.type)) {
    return { error: 'Format file harus PDF, JPG, atau PNG.' }
  }

  const ext = file.name.split('.').pop()
  const filePath = `${user.id}/leave_${leaveId}_signed.${ext}`

  const arrayBuffer = await file.arrayBuffer()
  const { error: uploadError } = await supabase.storage
    .from('leave-scans')
    .upload(filePath, arrayBuffer, {
      contentType: file.type,
      upsert: true,
    })

  if (uploadError) return { error: `Upload gagal: ${uploadError.message}` }

  const { data: urlData } = supabase.storage
    .from('leave-scans')
    .getPublicUrl(filePath)

  // Update status to Pending_Approval using admin client
  const db = createAdminClient() as any
  const { error: updateError } = await db
    .from('leave_requests')
    .update({
      signed_scan_url: urlData.publicUrl,
      status: 'Pending_Approval',
    })
    .eq('id', leaveId)
    .eq('profile_id', user.id)

  if (updateError) return { error: updateError.message }

  revalidatePath('/leave')
  revalidatePath('/history')
  revalidatePath('/admin/leave-verify')
  return { success: true }
}
