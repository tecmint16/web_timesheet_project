'use client'

import { useState, useActionState, useTransition } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, X, Download, Upload, CheckCircle, AlertTriangle,
  Loader2, FileText, Calendar, Clock,
} from 'lucide-react'
import { submitLeaveRequest, uploadSignedScan } from '@/app/actions/leave'
import { formatDate, calcDays } from '@/lib/utils'
import type { Profile, LeaveRequest } from '@/types/database.types'

const LEAVE_TYPES = [
  { value: 'Tahunan', label: 'Cuti Tahunan' },
  { value: 'Melahirkan', label: 'Cuti Melahirkan' },
  { value: 'Khusus', label: 'Cuti Khusus' },
]

interface LeavePageClientProps {
  profile: Profile
  leaveRequests: LeaveRequest[]
}

const initialState = { error: undefined, success: false }

export function LeavePageClient({ profile, leaveRequests }: LeavePageClientProps) {
  const [showForm, setShowForm] = useState(false)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [uploadLeaveId, setUploadLeaveId] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const [isUploading, startUploadTransition] = useTransition()

  const [state, formAction, isPending] = useActionState(submitLeaveRequest, initialState)

  const previewDays = startDate && endDate ? calcDays(startDate, endDate) : 0

  const handleUpload = (leaveId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadError(null)
    setUploadSuccess(false)
    const fd = new FormData()
    fd.append('signed_scan', file)
    startUploadTransition(async () => {
      const result = await uploadSignedScan(leaveId, fd)
      if (result.error) setUploadError(result.error)
      else setUploadSuccess(true)
      setUploadLeaveId(null)
    })
  }

  const statusConfig: Record<string, { label: string; cls: string }> = {
    Draft:            { label: 'Draft',                  cls: 'badge badge-draft' },
    Pending_Approval: { label: 'Menunggu Persetujuan',   cls: 'badge badge-pending' },
    Approved:         { label: 'Disetujui',              cls: 'badge badge-approved' },
    Rejected:         { label: 'Ditolak',                cls: 'badge badge-rejected' },
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '1100px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 className="page-title">Pengajuan Cuti</h1>
          <p className="text-muted" style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Sisa cuti Anda: <strong style={{ color: '#3b82f6' }}>{profile.leave_balance} hari</strong>
          </p>
        </div>
        <motion.button
          className="btn btn-primary"
          onClick={() => setShowForm(!showForm)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          id="new-leave-btn"
        >
          {showForm ? <><X size={16} /> Tutup</> : <><Plus size={16} /> Ajukan Cuti</>}
        </motion.button>
      </div>

      {/* How it works info */}
      <div className="glass-card" style={{ padding: '1.25rem' }}>
        <h3 style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.75rem', color: 'var(--fg)' }}>
          📋 Alur Pengajuan Cuti Hibrida
        </h3>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          {[
            { step: '1', title: 'Isi Form Digital', desc: 'Lengkapi formulir cuti' },
            { step: '2', title: 'Download PDF', desc: 'Unduh & cetak PDF yang sudah terisi otomatis' },
            { step: '3', title: 'Tanda Tangan', desc: 'Minta tanda tangan atasan pada dokumen fisik' },
            { step: '4', title: 'Upload Scan', desc: 'Upload scan dokumen bertanda tangan (max 5MB)' },
          ].map((s) => (
            <div key={s.step} style={{ display: 'flex', gap: '0.625rem', alignItems: 'flex-start', flex: '1', minWidth: '200px' }}>
              <div style={{
                width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
                background: 'var(--gradient-brand)', color: 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.8rem', fontWeight: 700,
              }}>{s.step}</div>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--fg)' }}>{s.title}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{s.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            className="glass-card"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            style={{ padding: '1.75rem' }}
          >
            <h2 className="section-title" style={{ marginBottom: '1.5rem' }}>
              Step 1: Formulir Cuti Digital
            </h2>

            <AnimatePresence>
              {state.error && (
                <motion.div
                  className="alert-danger"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem' }}
                >
                  <AlertTriangle size={16} style={{ flexShrink: 0 }} />
                  {state.error}
                </motion.div>
              )}
              {state.success && (
                <motion.div
                  className="alert-success"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem' }}
                >
                  <CheckCircle size={16} style={{ flexShrink: 0 }} />
                  Pengajuan berhasil! PDF telah digenerate. Silakan unduh dan upload scan TTD.
                </motion.div>
              )}
            </AnimatePresence>

            <form action={formAction} style={{ display: 'flex', flexDirection: 'column', gap: '1.125rem' }}>
              {/* Jenis Cuti */}
              <div>
                <label className="label" htmlFor="leave-type">Jenis Cuti</label>
                <select id="leave-type" name="leave_type" className="input-glass" required>
                  <option value="">— Pilih Jenis Cuti —</option>
                  {LEAVE_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              {/* Date range */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label className="label" htmlFor="leave-start">Tanggal Mulai</label>
                  <input
                    id="leave-start" name="start_date" type="date"
                    value={startDate} onChange={e => setStartDate(e.target.value)}
                    required className="input-glass"
                  />
                </div>
                <div>
                  <label className="label" htmlFor="leave-end">Tanggal Selesai</label>
                  <input
                    id="leave-end" name="end_date" type="date"
                    value={endDate} onChange={e => setEndDate(e.target.value)}
                    min={startDate}
                    required className="input-glass"
                  />
                </div>
              </div>

              {/* Days preview */}
              {previewDays > 0 && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  padding: '0.625rem 0.875rem',
                  background: 'rgba(59,130,246,0.08)',
                  border: '1px solid rgba(59,130,246,0.2)',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem', color: '#2563eb',
                }}>
                  <Calendar size={15} />
                  Total: <strong>{previewDays} hari</strong>
                  {previewDays > profile.leave_balance && (
                    <span style={{ color: '#ef4444', marginLeft: '0.5rem' }}>
                      ⚠ Melebihi sisa cuti ({profile.leave_balance} hari)
                    </span>
                  )}
                </div>
              )}

              {/* Address & Phone */}
              <div>
                <label className="label" htmlFor="leave-addr">Alamat & No. Telp Selama Cuti</label>
                <input
                  id="leave-addr"
                  name="address_phone_during_leave"
                  type="text"
                  placeholder="Jl. Contoh No. 1, Kota — Telp: 08123456789"
                  required className="input-glass"
                />
              </div>

              {/* Description */}
              <div>
                <label className="label" htmlFor="leave-desc">Keterangan (Opsional)</label>
                <textarea
                  id="leave-desc" name="description" rows={2}
                  placeholder="Tambahkan keterangan jika diperlukan..."
                  className="input-glass"
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" onClick={() => setShowForm(false)} className="btn btn-secondary">
                  <X size={16} /> Batal
                </button>
                <motion.button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isPending}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {isPending
                    ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Memproses...</>
                    : <><FileText size={16} /> Submit & Generate PDF</>
                  }
                </motion.button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Leave list */}
      <div className="glass-card" style={{ padding: '1.5rem' }}>
        <h2 className="section-title" style={{ marginBottom: '1.25rem' }}>Riwayat Pengajuan Cuti</h2>

        {uploadError && (
          <div className="alert-danger" style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem' }}>
            <AlertTriangle size={16} /> {uploadError}
          </div>
        )}
        {uploadSuccess && (
          <div className="alert-success" style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem' }}>
            <CheckCircle size={16} /> Scan berhasil diupload! Tim Admin akan segera mereview.
          </div>
        )}

        {leaveRequests.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--muted)' }}>
            <Calendar size={40} style={{ margin: '0 auto 0.75rem', opacity: 0.4 }} />
            <p>Belum ada pengajuan cuti.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            {leaveRequests.map((leave) => {
              const sc = statusConfig[leave.status] ?? statusConfig.Draft
              const showUpload = leave.status === 'Draft' && leave.pdf_generated_url

              return (
                <div key={leave.id} className="glass-card" style={{ padding: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.375rem' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--fg)' }}>
                          Cuti {leave.leave_type}
                        </span>
                        <span className={sc.cls}>{sc.label}</span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--muted)', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                        <span>📅 {formatDate(leave.start_date)} — {formatDate(leave.end_date)}</span>
                        <span>⏱ {leave.total_days} hari</span>
                        <span>🕐 Diajukan {formatDate(leave.created_at)}</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0, flexWrap: 'wrap' }}>
                      {/* Download PDF */}
                      {leave.pdf_generated_url && (
                        <a
                          href={leave.pdf_generated_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-secondary"
                          style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}
                        >
                          <Download size={14} /> Download PDF
                        </a>
                      )}

                      {/* Upload scan */}
                      {showUpload && (
                        <label
                          htmlFor={`upload-${leave.id}`}
                          className="btn btn-primary"
                          style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem', cursor: 'pointer' }}
                        >
                          {isUploading ? (
                            <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Uploading...</>
                          ) : (
                            <><Upload size={14} /> Upload Scan TTD</>
                          )}
                          <input
                            id={`upload-${leave.id}`}
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            style={{ display: 'none' }}
                            onChange={e => handleUpload(leave.id, e)}
                          />
                        </label>
                      )}

                      {/* Show scan uploaded */}
                      {leave.signed_scan_url && (
                        <a
                          href={leave.signed_scan_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-success"
                          style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}
                        >
                          <CheckCircle size={14} /> Lihat Scan
                        </a>
                      )}
                    </div>
                  </div>

                  {leave.description && (
                    <p style={{
                      fontSize: '0.8rem', color: 'var(--muted)',
                      marginTop: '0.625rem', paddingTop: '0.625rem',
                      borderTop: '1px solid var(--border-color)',
                    }}>
                      {leave.description}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
