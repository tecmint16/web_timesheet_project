'use client'

import { useState, useActionState, useTransition } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Pencil, Trash2, X, Save, Loader2, AlertTriangle, CheckCircle, ToggleLeft, ToggleRight } from 'lucide-react'
import { upsertProject, deleteProject } from '@/app/actions/admin'
import type { MasterProject } from '@/types/database.types'

interface MasterDataClientProps {
  projects: MasterProject[]
}

const initial = { error: undefined, success: false }

export function MasterDataClient({ projects }: MasterDataClientProps) {
  const [showForm, setShowForm] = useState(false)
  const [editProject, setEditProject] = useState<MasterProject | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isActive, setIsActive] = useState(true)
  const [isPendingDel, startDelTransition] = useTransition()
  const [state, formAction, isPending] = useActionState(upsertProject, initial)

  const handleEdit = (p: MasterProject) => {
    setEditProject(p)
    setIsActive(p.is_active)
    setShowForm(true)
  }

  const handleNew = () => {
    setEditProject(null)
    setIsActive(true)
    setShowForm(true)
  }

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`Hapus proyek "${name}"? Ini akan menghapus referensi dari timesheet.`)) return
    setDeletingId(id)
    startDelTransition(async () => {
      await deleteProject(id)
      setDeletingId(null)
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '1100px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 className="page-title">Master Data Proyek</h1>
          <p className="text-muted" style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Kelola data referensi proyek untuk dropdown timesheet karyawan.
          </p>
        </div>
        <motion.button
          className="btn btn-primary"
          onClick={handleNew}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          id="new-project-btn"
        >
          <Plus size={16} /> Tambah Proyek
        </motion.button>
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
            <h2 className="section-title" style={{ marginBottom: '1.25rem' }}>
              {editProject ? 'Edit Proyek' : 'Proyek Baru'}
            </h2>

            <AnimatePresence>
              {state.error && (
                <motion.div className="alert-danger" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem' }}>
                  <AlertTriangle size={16} /> {state.error}
                </motion.div>
              )}
              {state.success && (
                <motion.div className="alert-success" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem' }}>
                  <CheckCircle size={16} /> Proyek berhasil disimpan!
                </motion.div>
              )}
            </AnimatePresence>

            <form action={formAction} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {editProject && <input type="hidden" name="id" value={editProject.id} />}
              <input type="hidden" name="is_active" value={String(isActive)} />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label className="label" htmlFor="proj-name">Nama Proyek</label>
                  <input id="proj-name" name="project_name" className="input-glass"
                    placeholder="Nama proyek" required defaultValue={editProject?.project_name ?? ''} />
                </div>
                <div>
                  <label className="label" htmlFor="proj-code">Kode Proyek</label>
                  <input id="proj-code" name="project_code" className="input-glass"
                    placeholder="PRJ-001" required defaultValue={editProject?.project_code ?? ''} />
                </div>
                <div>
                  <label className="label" htmlFor="proj-cluster">Cluster</label>
                  <input id="proj-cluster" name="cluster_name" className="input-glass"
                    placeholder="Nama cluster" required defaultValue={editProject?.cluster_name ?? ''} />
                </div>
                <div>
                  <label className="label" htmlFor="proj-app">Aplikasi</label>
                  <input id="proj-app" name="app_name" className="input-glass"
                    placeholder="Nama aplikasi" required defaultValue={editProject?.app_name ?? ''} />
                </div>
              </div>

              {/* Active toggle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <label className="label" style={{ margin: 0 }}>Status Aktif</label>
                <button type="button" onClick={() => setIsActive(!isActive)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 0 }}
                  aria-label="Toggle active">
                  {isActive
                    ? <ToggleRight size={28} color="#10b981" />
                    : <ToggleLeft size={28} color="#94a3b8" />}
                </button>
                <span style={{ fontSize: '0.875rem', color: isActive ? '#10b981' : 'var(--muted)', fontWeight: 600 }}>
                  {isActive ? 'Aktif' : 'Nonaktif'}
                </span>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowForm(false)} className="btn btn-secondary">
                  <X size={16} /> Batal
                </button>
                <motion.button type="submit" className="btn btn-primary" disabled={isPending}
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  {isPending
                    ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Menyimpan...</>
                    : <><Save size={16} /> Simpan</>}
                </motion.button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Projects table */}
      <div className="glass-card" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <h2 className="section-title">Daftar Proyek</h2>
          <span style={{
            fontSize: '0.75rem', color: 'var(--muted)',
            background: 'var(--muted-bg)', padding: '0.25rem 0.625rem',
            borderRadius: '9999px', border: '1px solid var(--border-color)',
          }}>{projects.length} proyek</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="table-glass">
            <thead>
              <tr>
                <th>Nama Proyek</th>
                <th>Kode</th>
                <th>Cluster</th>
                <th>Aplikasi</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {projects.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', color: 'var(--muted)', padding: '2rem' }}>
                    Belum ada data proyek. Tambahkan proyek pertama Anda.
                  </td>
                </tr>
              )}
              {projects.map(p => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 600 }}>{p.project_name}</td>
                  <td><code style={{ fontSize: '0.8rem', background: 'var(--muted-bg)', padding: '2px 6px', borderRadius: '4px' }}>{p.project_code}</code></td>
                  <td style={{ color: 'var(--muted)' }}>{p.cluster_name}</td>
                  <td style={{ color: 'var(--muted)' }}>{p.app_name}</td>
                  <td>
                    <span className={p.is_active ? 'badge badge-approved' : 'badge badge-rejected'}>
                      {p.is_active ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.375rem' }}>
                      <button onClick={() => handleEdit(p)}
                        style={{ background: 'rgba(59,130,246,0.1)', border: 'none', borderRadius: '6px', padding: '0.3rem', cursor: 'pointer', color: '#3b82f6', display: 'flex' }}
                        title="Edit">
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(p.id, p.project_name)}
                        disabled={deletingId === p.id}
                        style={{ background: 'rgba(239,68,68,0.1)', border: 'none', borderRadius: '6px', padding: '0.3rem', cursor: 'pointer', color: '#ef4444', display: 'flex' }}
                        title="Hapus">
                        {deletingId === p.id
                          ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                          : <Trash2 size={14} />}
                      </button>
                    </div>
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
