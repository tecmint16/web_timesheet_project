'use client'

import { deleteTimesheet } from '@/app/actions/timesheet'
import { formatDate, formatTime, calcWorkHours } from '@/lib/utils'
import { Pencil, Trash2, Loader2, Lock, LayoutGrid } from 'lucide-react'
import { useState } from 'react'

interface Props {
  timesheets: any[]
  onEdit: (entry: any) => void
}

export default function TimesheetTable({ timesheets, onEdit }: Props) {
  const [deleting, setDeleting] = useState<string | null>(null)
  const [error, setError] = useState('')

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus entri timesheet ini?')) return
    setDeleting(id)
    const res = await deleteTimesheet(id)
    if (res.error) setError(res.error)
    setDeleting(null)
  }

  if (timesheets.length === 0) {
    return (
      <div className="glass-card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--muted)' }}>
        <LayoutGrid size={40} style={{ opacity: 0.3, margin: '0 auto 1rem' }} />
        <p style={{ fontWeight: 600 }}>Belum ada data timesheet.</p>
        <p style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>Klik "Input Baru" untuk mulai mengisi timesheet.</p>
      </div>
    )
  }

  return (
    <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
      {error && (
        <div className="alert-danger" style={{ margin: '0.75rem', display: 'flex', gap: '0.5rem', fontSize: '0.85rem' }}>
          {error}
        </div>
      )}
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
              <th>Aplikasi</th>
              <th>Keterangan</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {timesheets.map(ts => {
              const hours = calcWorkHours(ts.time_in, ts.time_out)
              const isShort = hours > 0 && hours < 8
              const apps: any[] = ts.timesheet_applications ?? []

              return (
                <tr key={ts.id}>
                  <td style={{ whiteSpace: 'nowrap', fontWeight: 600, fontSize: '0.85rem' }}>
                    {formatDate(ts.log_date, { day: '2-digit', month: 'short' })}
                  </td>
                  <td>
                    <span style={{
                      fontSize: '0.72rem', fontWeight: 700, padding: '0.2rem 0.5rem',
                      borderRadius: '9999px', background: 'var(--muted-bg)', color: 'var(--muted)',
                      border: '1px solid var(--border-color)',
                    }}>{ts.shift_type}</span>
                  </td>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{formatTime(ts.time_in)}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{formatTime(ts.time_out)}</td>
                  <td>
                    <span style={{
                      fontWeight: 700, fontSize: '0.875rem',
                      color: isShort ? '#ef4444' : '#10b981',
                    }}>
                      {hours.toFixed(1)}j{isShort ? ' ⚠' : ''}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${ts.status === 'Hadir' ? 'badge-approved' : ts.status === 'Lembur' ? 'badge-pending' : 'badge-draft'}`}>
                      {ts.status}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.2rem' }}>
                      {apps.length === 0 && <span style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>—</span>}
                      {apps.slice(0, 2).map((ta: any) => (
                        <span key={ta.application_id} style={{
                          fontSize: '0.68rem', fontWeight: 700, fontFamily: 'monospace',
                          padding: '0.15rem 0.4rem', borderRadius: '9999px',
                          background: 'rgba(139,92,246,0.12)', color: '#8b5cf6',
                          border: '1px solid rgba(139,92,246,0.25)',
                        }}>
                          {ta.applications?.app_code ?? '?'}
                        </span>
                      ))}
                      {apps.length > 2 && (
                        <span style={{ fontSize: '0.68rem', color: 'var(--muted)' }}>+{apps.length - 2}</span>
                      )}
                    </div>
                  </td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--muted)', maxWidth: '200px' }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {ts.activity_desc || '—'}
                    </div>
                    {isShort && ts.short_hours_reason && (
                      <div style={{ fontSize: '0.72rem', color: '#f59e0b', marginTop: '0.125rem' }}>
                        ⚠ {ts.short_hours_reason}
                      </div>
                    )}
                  </td>
                  <td>
                    {ts.is_locked ? (
                      <span title="Dikunci oleh Admin" style={{ color: '#818cf8' }}><Lock size={15} /></span>
                    ) : (
                      <div style={{ display: 'flex', gap: '0.375rem' }}>
                        <button onClick={() => onEdit(ts)} className="btn btn-secondary"
                          style={{ padding: '0.3rem 0.55rem' }} title="Edit">
                          <Pencil size={13} />
                        </button>
                        <button onClick={() => handleDelete(ts.id)} disabled={deleting === ts.id}
                          className="btn btn-danger" style={{ padding: '0.3rem 0.55rem' }} title="Hapus">
                          {deleting === ts.id
                            ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
                            : <Trash2 size={13} />}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
