'use client'

import { useState, useTransition } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle, XCircle, Eye, Loader2, Filter, AlertTriangle } from 'lucide-react'
import { updateLeaveStatus } from '@/app/actions/admin'
import { formatDate } from '@/lib/utils'

type LeaveItem = {
  id: string; leave_type: string; status: string; total_days: number;
  start_date: string; end_date: string; created_at: string;
  address_phone_during_leave: string; description: string | null;
  pdf_generated_url: string | null; signed_scan_url: string | null;
  profiles: { full_name: string; npp: string } | null
}

interface LeaveVerifyClientProps {
  leaveRequests: LeaveItem[]
}

const STATUS_FILTERS = ['Semua', 'Pending_Approval', 'Approved', 'Rejected', 'Draft']

export function LeaveVerifyClient({ leaveRequests }: LeaveVerifyClientProps) {
  const [filter, setFilter] = useState('Pending_Approval')
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const filtered = filter === 'Semua'
    ? leaveRequests
    : leaveRequests.filter(lr => lr.status === filter)

  const handleAction = (id: string, status: 'Approved' | 'Rejected') => {
    setProcessingId(id)
    setActionError(null)
    startTransition(async () => {
      const res = await updateLeaveStatus(id, status)
      if (res.error) setActionError(res.error)
      setProcessingId(null)
    })
  }

  const filterLabels: Record<string, string> = {
    Semua: 'Semua',
    Pending_Approval: 'Menunggu',
    Approved: 'Disetujui',
    Rejected: 'Ditolak',
    Draft: 'Draft',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '1200px' }}>
      <div>
        <h1 className="page-title">Verifikasi Cuti</h1>
        <p className="text-muted" style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>
          Review dan setujui dokumen cuti karyawan yang sudah ditandatangani.
        </p>
      </div>

      {actionError && (
        <div className="alert-danger" style={{ display: 'flex', gap: '0.5rem' }}>
          <AlertTriangle size={16} /> {actionError}
        </div>
      )}

      {/* Filters */}
      <div className="glass-card" style={{ padding: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexWrap: 'wrap' }}>
          <Filter size={15} style={{ color: 'var(--muted)' }} />
          {STATUS_FILTERS.map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              style={{
                padding: '0.35rem 0.875rem',
                borderRadius: '9999px',
                border: '1px solid',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                background: filter === s ? '#3b82f6' : 'transparent',
                borderColor: filter === s ? '#3b82f6' : 'var(--border-color)',
                color: filter === s ? 'white' : 'var(--muted)',
              }}
            >
              {filterLabels[s]}
            </button>
          ))}
          <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--muted)' }}>
            {filtered.length} item
          </span>
        </div>
      </div>

      {/* Leave list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
        {filtered.length === 0 ? (
          <div className="glass-card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--muted)' }}>
            Tidak ada data untuk filter ini.
          </div>
        ) : (
          filtered.map(lr => {
            const isPendingRow = lr.status === 'Pending_Approval'
            const isProcessing = processingId === lr.id

            return (
              <motion.div
                key={lr.id}
                className="glass-card"
                style={{ padding: '1.25rem' }}
                layout
              >
                <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                  {/* Left: info */}
                  <div style={{ flex: 1, minWidth: '280px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.5rem' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--fg)' }}>
                        {lr.profiles?.full_name ?? '—'}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>NPP: {lr.profiles?.npp ?? '—'}</span>
                      <span className={`badge ${
                        lr.status === 'Approved' ? 'badge-approved'
                        : lr.status === 'Rejected' ? 'badge-rejected'
                        : lr.status === 'Pending_Approval' ? 'badge-pending'
                        : 'badge-draft'
                      }`}>
                        {lr.status.replace('_', ' ')}
                      </span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.375rem 1.5rem', fontSize: '0.825rem' }}>
                      <span style={{ color: 'var(--muted)' }}>Jenis Cuti:</span>
                      <span style={{ fontWeight: 600, color: 'var(--fg)' }}>{lr.leave_type}</span>
                      <span style={{ color: 'var(--muted)' }}>Periode:</span>
                      <span style={{ fontWeight: 600, color: 'var(--fg)' }}>
                        {formatDate(lr.start_date, { day: '2-digit', month: 'short' })} — {formatDate(lr.end_date, { day: '2-digit', month: 'short', year: 'numeric' })} ({lr.total_days} hari)
                      </span>
                      <span style={{ color: 'var(--muted)' }}>Alamat/Telp:</span>
                      <span style={{ color: 'var(--fg)' }}>{lr.address_phone_during_leave}</span>
                      {lr.description && (
                        <>
                          <span style={{ color: 'var(--muted)' }}>Keterangan:</span>
                          <span style={{ color: 'var(--fg)' }}>{lr.description}</span>
                        </>
                      )}
                      <span style={{ color: 'var(--muted)' }}>Diajukan:</span>
                      <span style={{ color: 'var(--muted)' }}>{formatDate(lr.created_at, { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                    </div>
                  </div>

                  {/* Right: actions */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', minWidth: '160px' }}>
                    {lr.signed_scan_url && (
                      <a
                        href={lr.signed_scan_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-secondary"
                        style={{ fontSize: '0.8rem', justifyContent: 'center' }}
                      >
                        <Eye size={14} /> Lihat Scan TTD
                      </a>
                    )}
                    {lr.pdf_generated_url && (
                      <a
                        href={lr.pdf_generated_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-secondary"
                        style={{ fontSize: '0.8rem', justifyContent: 'center' }}
                      >
                        PDF Form ↗
                      </a>
                    )}
                    {!lr.signed_scan_url && (
                      <p style={{ fontSize: '0.75rem', color: '#f59e0b', textAlign: 'center' }}>
                        ⚠ Scan TTD belum diupload
                      </p>
                    )}
                    {isPendingRow && (
                      <div style={{ display: 'flex', gap: '0.375rem', marginTop: '0.25rem' }}>
                        <button
                          onClick={() => handleAction(lr.id, 'Approved')}
                          disabled={isProcessing}
                          className="btn btn-success"
                          style={{ flex: 1, fontSize: '0.8rem', padding: '0.5rem' }}
                          id={`approve-btn-${lr.id}`}
                        >
                          {isProcessing
                            ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                            : <><CheckCircle size={14} /> Setuju</>}
                        </button>
                        <button
                          onClick={() => handleAction(lr.id, 'Rejected')}
                          disabled={isProcessing}
                          className="btn btn-danger"
                          style={{ flex: 1, fontSize: '0.8rem', padding: '0.5rem' }}
                          id={`reject-btn-${lr.id}`}
                        >
                          <XCircle size={14} /> Tolak
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )
          })
        )}
      </div>
    </div>
  )
}
