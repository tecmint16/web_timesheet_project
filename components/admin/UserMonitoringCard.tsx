'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Download, FileSpreadsheet, FileText, Users, Search, ChevronDown, X } from 'lucide-react'

type MonitoringUser = {
  id: string
  full_name: string | null
  npp: string | null
  role: string
  projects: { project_code: string; project_name: string } | null
  clusters: { cluster_name: string } | null
  timesheet_count_30d: number
}

interface Props {
  users: MonitoringUser[]
}

function ExportDropdown({ userId, userName }: { userId: string; userName: string }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState<'xlsx' | 'pdf' | null>(null)

  const handleExport = async (format: 'xlsx' | 'pdf') => {
    setLoading(format)
    setOpen(false)
    try {
      const params = new URLSearchParams({ userId, userName, format })
      const res = await fetch(`/api/export/timesheet?${params}`)
      if (!res.ok) { alert('Gagal export: ' + (await res.json()).error); return }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `timesheet_${userName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.${format}`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setLoading(null)
    }
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        className="btn btn-secondary"
        style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
        disabled={!!loading}
      >
        <Download size={13} />
        {loading ? 'Exporting...' : 'Export'}
        <ChevronDown size={11} />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
              style={{
                position: 'absolute', right: 0, top: '100%', marginTop: '4px', zIndex: 50,
                background: 'var(--surface-alt)', border: '1px solid var(--border-color)',
                borderRadius: '0.625rem', overflow: 'hidden', minWidth: '150px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
              }}
            >
              <button onClick={() => handleExport('xlsx')} style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%',
                padding: '0.625rem 0.875rem', background: 'none', border: 'none',
                cursor: 'pointer', fontSize: '0.82rem', color: 'var(--fg)',
              }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--muted-bg)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'none')}
              >
                <FileSpreadsheet size={14} color="#10b981" />
                Export .xlsx
              </button>
              <button onClick={() => handleExport('pdf')} style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%',
                padding: '0.625rem 0.875rem', background: 'none', border: 'none',
                cursor: 'pointer', fontSize: '0.82rem', color: 'var(--fg)',
              }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--muted-bg)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'none')}
              >
                <FileText size={14} color="#ef4444" />
                Export .pdf
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function UserMonitoringCard({ users }: Props) {
  const [search, setSearch] = useState('')

  const filtered = users.filter(u =>
    (u.full_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (u.npp ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (u.projects?.project_code ?? '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      {/* Card header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <div style={{ width: 36, height: 36, borderRadius: '10px', background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Users size={18} color="white" />
          </div>
          <div>
            <h2 className="section-title">Monitoring Pegawai</h2>
            <p style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>{users.length} pegawai terdaftar</p>
          </div>
        </div>
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: '0.625rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cari nama, NPP, proyek..."
            className="input-glass"
            style={{ paddingLeft: '2rem', paddingRight: '0.75rem', paddingTop: '0.45rem', paddingBottom: '0.45rem', fontSize: '0.85rem', width: '240px' }}
          />
        </div>
      </div>

      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="table-glass">
            <thead>
              <tr>
                <th>Nama Pegawai</th>
                <th>NPP</th>
                <th>Role</th>
                <th>Proyek / Cluster</th>
                <th>Timesheet (30 hari)</th>
                <th style={{ textAlign: 'right' }}>Export</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted)' }}>
                    <Users size={32} style={{ opacity: 0.3, margin: '0 auto 0.5rem' }} />
                    <p>Tidak ada pegawai ditemukan.</p>
                  </td>
                </tr>
              )}
              {filtered.map(u => (
                <tr key={u.id}>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{u.full_name ?? '—'}</div>
                  </td>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: 'var(--muted)' }}>{u.npp ?? '—'}</td>
                  <td>
                    <span style={{
                      fontSize: '0.72rem', fontWeight: 700, padding: '0.2rem 0.5rem',
                      borderRadius: '9999px',
                      background: u.role === 'PM' ? 'rgba(245,158,11,0.12)' : 'rgba(59,130,246,0.12)',
                      color: u.role === 'PM' ? '#f59e0b' : '#3b82f6',
                      border: `1px solid ${u.role === 'PM' ? 'rgba(245,158,11,0.3)' : 'rgba(59,130,246,0.3)'}`,
                    }}>
                      {u.role}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.8rem' }}>
                    {u.projects ? (
                      <div>
                        <span style={{ fontWeight: 700, color: '#3b82f6', fontFamily: 'monospace' }}>{u.projects.project_code}</span>
                        {u.clusters && <span style={{ color: 'var(--muted)', marginLeft: '0.35rem' }}>· {u.clusters.cluster_name}</span>}
                      </div>
                    ) : <span style={{ color: 'var(--muted)' }}>—</span>}
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{
                        width: `${Math.min((u.timesheet_count_30d / 22) * 100, 100)}%`,
                        minWidth: '4px',
                        height: '6px',
                        borderRadius: '9999px',
                        background: u.timesheet_count_30d >= 20 ? '#10b981' : u.timesheet_count_30d >= 10 ? '#f59e0b' : '#ef4444',
                        maxWidth: '80px',
                      }} />
                      <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>{u.timesheet_count_30d} hari</span>
                    </div>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <ExportDropdown userId={u.id} userName={u.full_name ?? u.npp ?? 'user'} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
