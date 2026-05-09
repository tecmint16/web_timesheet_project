'use client'

import { useState, useTransition } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Pencil, Trash2, Lock, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import { deleteTimesheet } from '@/app/actions/timesheet'
import { formatDate, formatTime, calcWorkHours } from '@/lib/utils'
import { TimesheetForm } from './TimesheetForm'
import type { TimesheetWithProject, MasterProject } from '@/types/database.types'

interface TimesheetTableProps {
  entries: TimesheetWithProject[]
  projects: MasterProject[]
}

export function TimesheetTable({ entries, projects }: TimesheetTableProps) {
  const [editId, setEditId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const handleDelete = (id: string) => {
    if (!confirm('Hapus entri timesheet ini?')) return
    setDeletingId(id)
    startTransition(async () => {
      await deleteTimesheet(id)
      setDeletingId(null)
    })
  }

  if (entries.length === 0) {
    return (
      <div style={{
        textAlign: 'center', padding: '3rem',
        color: 'var(--muted)', fontSize: '0.875rem',
      }}>
        Belum ada entri timesheet. Mulai dengan mengklik tombol <strong>"+ Tambah Entri"</strong> di atas.
      </div>
    )
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="table-glass">
        <thead>
          <tr>
            <th>Tanggal</th>
            <th>Shift</th>
            <th>Masuk</th>
            <th>Pulang</th>
            <th>Jam Kerja</th>
            <th>Status</th>
            <th>Proyek</th>
            <th>Detail</th>
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => {
            const hours = calcWorkHours(entry.time_in, entry.time_out)
            const isShort = hours < 8
            const isEditing = editId === entry.id
            const isExpanded = expandedId === entry.id

            return (
              <>
                <tr key={entry.id}>
                  <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
                    {formatDate(entry.log_date, { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td>
                    <span style={{
                      padding: '0.2rem 0.5rem',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      background: 'var(--muted-bg)',
                      color: 'var(--fg)',
                    }}>
                      {entry.shift_type}
                    </span>
                  </td>
                  <td style={{ fontFamily: 'monospace' }}>{formatTime(entry.time_in)}</td>
                  <td style={{ fontFamily: 'monospace' }}>{formatTime(entry.time_out)}</td>
                  <td>
                    <span style={{
                      fontWeight: 700,
                      color: isShort ? '#ef4444' : '#10b981',
                      fontSize: '0.875rem',
                    }}>
                      {hours.toFixed(1)}j
                    </span>
                    {isShort && (
                      <span style={{ fontSize: '0.7rem', color: '#ef4444', marginLeft: '4px' }}>⚠</span>
                    )}
                  </td>
                  <td>
                    <span className={`badge ${entry.status === 'Hadir' ? 'badge-approved' : entry.status === 'Lembur' ? 'badge-locked' : 'badge-pending'}`}>
                      {entry.status}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--muted)', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {entry.master_projects?.project_code
                      ? `[${entry.master_projects.project_code}]`
                      : '—'}
                  </td>
                  <td>
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '2px',
                        fontSize: '0.75rem',
                      }}
                    >
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                  </td>
                  <td>
                    {entry.is_locked ? (
                      <span title="Dikunci oleh Admin" style={{ color: 'var(--muted)' }}>
                        <Lock size={14} />
                      </span>
                    ) : (
                      <div style={{ display: 'flex', gap: '0.375rem' }}>
                        <button
                          onClick={() => setEditId(isEditing ? null : entry.id)}
                          style={{
                            background: 'rgba(59,130,246,0.1)', border: 'none',
                            borderRadius: '6px', padding: '0.3rem', cursor: 'pointer',
                            color: '#3b82f6', display: 'flex',
                          }}
                          title="Edit"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(entry.id)}
                          disabled={deletingId === entry.id}
                          style={{
                            background: 'rgba(239,68,68,0.1)', border: 'none',
                            borderRadius: '6px', padding: '0.3rem', cursor: 'pointer',
                            color: '#ef4444', display: 'flex',
                          }}
                          title="Hapus"
                        >
                          {deletingId === entry.id
                            ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                            : <Trash2 size={14} />}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>

                {/* Expanded detail row */}
                <AnimatePresence>
                  {isExpanded && (
                    <tr>
                      <td colSpan={9} style={{ padding: 0, border: 'none' }}>
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          style={{
                            padding: '0.875rem 1rem',
                            background: 'var(--muted-bg)',
                            borderBottom: '1px solid var(--border-color)',
                            fontSize: '0.85rem',
                          }}
                        >
                          {entry.master_projects && (
                            <p style={{ color: 'var(--muted)', marginBottom: '0.375rem' }}>
                              <strong>Proyek:</strong> {entry.master_projects.project_name} ({entry.master_projects.cluster_name} / {entry.master_projects.app_name})
                            </p>
                          )}
                          {entry.activity_desc && (
                            <p style={{ color: 'var(--fg)', marginBottom: '0.375rem' }}>
                              <strong>Kegiatan:</strong> {entry.activity_desc}
                            </p>
                          )}
                          {entry.short_hours_reason && (
                            <p style={{ color: '#d97706' }}>
                              <strong>⚠ Alasan jam kurang:</strong> {entry.short_hours_reason}
                            </p>
                          )}
                        </motion.div>
                      </td>
                    </tr>
                  )}
                </AnimatePresence>

                {/* Inline edit row */}
                <AnimatePresence>
                  {isEditing && (
                    <tr>
                      <td colSpan={9} style={{ padding: 0, border: 'none' }}>
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          style={{
                            padding: '1.25rem',
                            background: 'var(--surface)',
                            borderBottom: '2px solid #3b82f6',
                          }}
                        >
                          <TimesheetForm
                            projects={projects}
                            editEntry={entry}
                            onClose={() => setEditId(null)}
                          />
                        </motion.div>
                      </td>
                    </tr>
                  )}
                </AnimatePresence>
              </>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
