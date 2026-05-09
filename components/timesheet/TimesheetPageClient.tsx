'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, X } from 'lucide-react'
import { TimesheetForm } from './TimesheetForm'
import { TimesheetTable } from './TimesheetTable'
import type { TimesheetWithProject, MasterProject } from '@/types/database.types'

interface TimesheetPageClientProps {
  projects: MasterProject[]
  entries: TimesheetWithProject[]
}

export function TimesheetPageClient({ projects, entries }: TimesheetPageClientProps) {
  const [showForm, setShowForm] = useState(false)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '1200px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 className="page-title">Input Timesheet</h1>
          <p className="text-muted" style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Catat aktivitas harian Anda. Tidak ada batas waktu pengisian.
          </p>
        </div>
        <motion.button
          className="btn btn-primary"
          onClick={() => setShowForm(!showForm)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          id="add-timesheet-btn"
        >
          {showForm ? <><X size={16} /> Tutup</> : <><Plus size={16} /> Tambah Entri</>}
        </motion.button>
      </div>

      {/* Form panel */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            className="glass-card"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
            style={{ padding: '1.5rem' }}
          >
            <h2 className="section-title" style={{ marginBottom: '1.25rem' }}>Entri Baru</h2>
            <TimesheetForm
              projects={projects}
              onClose={() => setShowForm(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table */}
      <div className="glass-card" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <h2 className="section-title">Riwayat 60 Hari Terakhir</h2>
          <span style={{
            fontSize: '0.75rem', color: 'var(--muted)',
            background: 'var(--muted-bg)', padding: '0.25rem 0.625rem',
            borderRadius: '9999px', border: '1px solid var(--border-color)',
          }}>
            {entries.length} entri
          </span>
        </div>
        <TimesheetTable entries={entries} projects={projects} />
      </div>
    </div>
  )
}
