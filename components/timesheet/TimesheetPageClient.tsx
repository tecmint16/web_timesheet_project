'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Profile, Project, Cluster, Application } from '@/types/database.types'
import TimesheetForm from './TimesheetForm'
import TimesheetTable from './TimesheetTable'
import { ClipboardList, PlusCircle, Download, FileSpreadsheet, FileText, ChevronDown } from 'lucide-react'

type ProfileWithAssignment = Profile & {
  projects: Pick<Project, 'id' | 'project_code' | 'project_name'> | null
  clusters: Pick<Cluster, 'id' | 'cluster_name'> | null
}

interface Props {
  profile: ProfileWithAssignment
  assignedApps: Pick<Application, 'id' | 'app_code' | 'app_name'>[]
  timesheets: any[]
}

function ExportDropdown({ userId, userName }: { userId: string; userName: string }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState<'xlsx' | 'pdf' | null>(null)

  const doExport = async (format: 'xlsx' | 'pdf') => {
    setLoading(format); setOpen(false)
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
    } finally { setLoading(null) }
  }

  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => setOpen(!open)} disabled={!!loading}
        className="btn btn-secondary"
        style={{ fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
        <Download size={14} />
        {loading ? 'Exporting...' : 'Export'}
        <ChevronDown size={12} />
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setOpen(false)} />
            <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{
                position: 'absolute', right: 0, top: '100%', marginTop: '4px', zIndex: 50,
                background: 'var(--surface-alt)', border: '1px solid var(--border-color)',
                borderRadius: '0.625rem', overflow: 'hidden', minWidth: '145px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
              }}>
              {(['xlsx', 'pdf'] as const).map(fmt => (
                <button key={fmt} onClick={() => doExport(fmt)} style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%',
                  padding: '0.6rem 0.875rem', background: 'none', border: 'none',
                  cursor: 'pointer', fontSize: '0.82rem', color: 'var(--fg)',
                }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--muted-bg)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                >
                  {fmt === 'xlsx'
                    ? <FileSpreadsheet size={14} color="#10b981" />
                    : <FileText size={14} color="#ef4444" />}
                  Export .{fmt}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}


export default function TimesheetPageClient({ profile, assignedApps, timesheets }: Props) {
  const [view, setView] = useState<'form' | 'history'>('form')
  const [editEntry, setEditEntry] = useState<any | null>(null)

  const handleEdit = (entry: any) => {
    setEditEntry(entry)
    setView('form')
  }

  return (
    <div style={{ maxWidth: '1100px', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 className="page-title">Input Timesheet</h1>
          <p className="text-muted" style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Catat kehadiran dan aktivitas harian Anda.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--muted-bg)', padding: '0.25rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)' }}>
          {[
            { key: 'form',    label: 'Input Baru', icon: PlusCircle },
            { key: 'history', label: 'Riwayat',    icon: ClipboardList },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => { setView(key as any); if (key === 'form') setEditEntry(null) }}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.4rem',
                padding: '0.45rem 0.9rem', borderRadius: '0.55rem', fontSize: '0.85rem',
                fontWeight: view === key ? 700 : 500, border: 'none', cursor: 'pointer',
                background: view === key ? 'var(--surface-alt)' : 'transparent',
                color: view === key ? 'var(--fg)' : 'var(--muted)',
                boxShadow: view === key ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.18s ease',
              }}
            >
              <Icon size={15} /> {label}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {view === 'form' ? (
          <motion.div key="form" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <TimesheetForm
              profile={profile}
              assignedApps={assignedApps}
              editEntry={editEntry}
              onSuccess={() => { setEditEntry(null); setView('history') }}
            />
          </motion.div>
        ) : (
          <motion.div key="history" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.75rem' }}>
              <ExportDropdown
                userId={profile.id}
                userName={profile.full_name ?? profile.npp ?? 'user'}
              />
            </div>
            <TimesheetTable
              timesheets={timesheets}
              onEdit={handleEdit}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
