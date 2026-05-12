'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function login(formData: FormData) {
  const supabase = await createClient()
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

/** Change password — clears must_change_password flag */
export async function changePassword(
  _prev: { error?: string; success?: boolean },
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Sesi tidak valid. Silakan login ulang.' }

  const newPassword = formData.get('new_password') as string
  const confirmPassword = formData.get('confirm_password') as string

  if (!newPassword || newPassword.length < 8) {
    return { error: 'Password harus minimal 8 karakter.' }
  }
  if (newPassword !== confirmPassword) {
    return { error: 'Konfirmasi password tidak cocok.' }
  }

  // Update password via Supabase Auth
  const { error: authError } = await supabase.auth.updateUser({ password: newPassword })
  if (authError) return { error: `Gagal update password: ${authError.message}` }

  // Clear must_change_password flag
  const db = createAdminClient() as any
  const { error: profileError } = await db
    .from('profiles')
    .update({ must_change_password: false })
    .eq('id', user.id)

  if (profileError) {
    console.error('Failed to clear must_change_password:', profileError)
    // Non-fatal — password was changed successfully
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}
