'use client'

import { useActionState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { changePassword } from '@/app/actions/auth'
import { Eye, EyeOff, Lock, ShieldCheck, AlertTriangle, Loader2, CheckCircle } from 'lucide-react'
import { useState } from 'react'
import type { Metadata } from 'next'

const initialState = { error: undefined, success: false }

export default function ChangePasswordPage() {
  const [state, formAction, isPending] = useActionState(changePassword, initialState)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')

  const strength = newPw.length === 0 ? 0 : newPw.length < 6 ? 1 : newPw.length < 8 ? 2 : /[A-Z]/.test(newPw) && /[0-9]/.test(newPw) ? 4 : 3
  const strengthLabel = ['', 'Sangat Lemah', 'Lemah', 'Cukup', 'Kuat'][strength]
  const strengthColor = ['', '#ef4444', '#f59e0b', '#3b82f6', '#10b981'][strength]

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg)',
      padding: '1.5rem',
    }}>
      {/* Background blobs */}
      <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '-15%', left: '-10%', width: '500px', height: '500px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 70%)', filter: 'blur(40px)' }} />
        <div style={{ position: 'absolute', bottom: '-15%', right: '-10%', width: '500px', height: '500px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%)', filter: 'blur(40px)' }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        style={{
          width: '100%', maxWidth: '420px',
          background: 'var(--surface)',
          backdropFilter: 'blur(24px) saturate(1.8)',
          borderRadius: '1.25rem',
          border: '1px solid var(--border-color)',
          boxShadow: '0 24px 64px rgba(99,102,241,0.12)',
          padding: '2.25rem',
          position: 'relative', zIndex: 1,
        }}
      >
        {/* Icon + title */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div style={{
            width: '56px', height: '56px', borderRadius: '16px',
            background: 'var(--gradient-brand)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1rem',
            boxShadow: '0 8px 24px rgba(99,102,241,0.35)',
          }}>
            <ShieldCheck size={28} color="white" />
          </div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--fg)', letterSpacing: '-0.02em' }}>
            Ubah Password
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--muted)', marginTop: '0.4rem', lineHeight: 1.5 }}>
            Anda diminta untuk memperbarui password sebelum melanjutkan ke aplikasi.
          </p>
        </div>

        <AnimatePresence>
          {state.error && (
            <motion.div
              className="alert-danger"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}
            >
              <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: '1px' }} />
              {state.error}
            </motion.div>
          )}
        </AnimatePresence>

        <form action={formAction} style={{ display: 'flex', flexDirection: 'column', gap: '1.125rem' }}>
          {/* New password */}
          <div>
            <label className="label" htmlFor="new-password">Password Baru</label>
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }}>
                <Lock size={16} />
              </div>
              <input
                id="new-password"
                name="new_password"
                type={showNew ? 'text' : 'password'}
                value={newPw}
                onChange={e => setNewPw(e.target.value)}
                placeholder="Minimal 8 karakter"
                required
                className="input-glass"
                style={{ paddingLeft: '2.5rem', paddingRight: '2.5rem' }}
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 0 }}
              >
                {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {/* Strength bar */}
            {newPw.length > 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ marginTop: '0.5rem' }}>
                <div style={{ height: '4px', borderRadius: '2px', background: 'var(--border-color)', overflow: 'hidden' }}>
                  <motion.div
                    style={{ height: '100%', background: strengthColor, borderRadius: '2px' }}
                    initial={{ width: 0 }}
                    animate={{ width: `${strength * 25}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                <p style={{ fontSize: '0.72rem', color: strengthColor, marginTop: '0.25rem', fontWeight: 600 }}>
                  {strengthLabel}
                </p>
              </motion.div>
            )}
          </div>

          {/* Confirm password */}
          <div>
            <label className="label" htmlFor="confirm-password">Konfirmasi Password</label>
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }}>
                <Lock size={16} />
              </div>
              <input
                id="confirm-password"
                name="confirm_password"
                type={showConfirm ? 'text' : 'password'}
                value={confirmPw}
                onChange={e => setConfirmPw(e.target.value)}
                placeholder="Ulangi password baru"
                required
                className="input-glass"
                style={{
                  paddingLeft: '2.5rem', paddingRight: '2.5rem',
                  borderColor: confirmPw && confirmPw !== newPw ? 'rgba(239,68,68,0.5)' : undefined,
                }}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 0 }}
              >
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {confirmPw && confirmPw !== newPw && (
              <p style={{ fontSize: '0.72rem', color: '#ef4444', marginTop: '0.25rem' }}>
                Password tidak cocok
              </p>
            )}
          </div>

          <motion.button
            type="submit"
            className="btn btn-primary"
            disabled={isPending}
            whileHover={{ scale: isPending ? 1 : 1.02 }}
            whileTap={{ scale: 0.98 }}
            style={{ marginTop: '0.375rem', width: '100%' }}
            id="change-password-submit"
          >
            {isPending
              ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Memperbarui...</>
              : <><CheckCircle size={16} /> Simpan Password Baru</>}
          </motion.button>
        </form>
      </motion.div>
    </div>
  )
}
