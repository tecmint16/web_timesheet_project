'use client'

import { useState, useActionState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createUser, updateUser, deleteUser, resetUserPassword } from '@/app/actions/admin'
import type { Project } from '@/types/database.types'
import {
  UserPlus, Pencil, Trash2, X, ChevronDown, Check,
  Loader2, AlertTriangle, KeyRound, Users
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────
type UserRow = {
  id: string; full_name: string | null; npp: string | null; email?: string | null
  phone_number: string | null; address: string | null; role: string
  project_id: string | null; cluster_id: string | null; must_change_password: boolean
  projects: { project_code: string; project_name: string } | null
  clusters: { cluster_name: string } | null
  profile_applications: { application_id: string; applications: { id: string; app_code: string; app_name: string } | null }[]
}
type ClusterRow = { id: string; project_id: string; cluster_name: string; projects?: any }
type AppRow    = { id: string; cluster_id: string; app_code: string; app_name: string; clusters?: any }

interface Props {
  users: UserRow[]
  projects: Project[]
  clusters: ClusterRow[]
  applications: AppRow[]
}

const ROLES = ['Admin', 'PM', 'Staff']
const initialState = { error: undefined as string | undefined, success: false }

// ─── Modal Component ──────────────────────────────────────
function UserModal({
  mode, user, projects, clusters, applications, onClose,
}: {
  mode: 'add' | 'edit'
  user?: UserRow
  projects: Project[]
  clusters: ClusterRow[]
  applications: AppRow[]
  onClose: () => void
}) {
  const action = mode === 'add' ? createUser : updateUser
  const [state, formAction, isPending] = useActionState(action as any, initialState)

  const [selectedProject, setSelectedProject] = useState(user?.project_id ?? '')
  const [selectedCluster, setSelectedCluster] = useState(user?.cluster_id ?? '')
  const [selectedApps, setSelectedApps] = useState<string[]>(
    user?.profile_applications?.map(pa => pa.application_id) ?? []
  )

  // Cascading filters
  const filteredClusters = clusters.filter(c => c.project_id === selectedProject)
  const filteredApps = applications.filter(a => a.cluster_id === selectedCluster)

  // Reset cluster/app if project changes
  useEffect(() => {
    setSelectedCluster('')
    setSelectedApps([])
  }, [selectedProject])
  useEffect(() => { setSelectedApps([]) }, [selectedCluster])

  // Close on success
  useEffect(() => {
    if ((state as any).success) onClose()
  }, [(state as any).success])

  const toggleApp = (id: string) => {
    setSelectedApps(prev => prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id])
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
    }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        style={{
          background: 'var(--surface-alt)', backdropFilter: 'blur(24px)',
          border: '1px solid var(--border-color)', borderRadius: '1.25rem',
          width: '100%', maxWidth: '600px', maxHeight: '90vh',
          overflowY: 'auto', padding: '1.75rem',
          boxShadow: '0 32px 80px rgba(0,0,0,0.2)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <h2 className="section-title">{mode === 'add' ? '+ Tambah User Baru' : 'Edit User'}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: '4px' }}>
            <X size={20} />
          </button>
        </div>

        <AnimatePresence>
          {(state as any).error && (
            <motion.div className="alert-danger" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: '1px' }} />
              {(state as any).error}
            </motion.div>
          )}
        </AnimatePresence>

        <form action={formAction} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {mode === 'edit' && <input type="hidden" name="profile_id" value={user?.id} />}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label className="label">Nama Lengkap *</label>
              <input name="full_name" defaultValue={user?.full_name ?? ''} required className="input-glass" placeholder="Nama lengkap" />
            </div>
            <div>
              <label className="label">NPP *</label>
              <input name="npp" defaultValue={user?.npp ?? ''} required className="input-glass" placeholder="NPP Pegawai" />
            </div>
          </div>

          {mode === 'add' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label className="label">Email *</label>
                <input name="email" type="email" required className="input-glass" placeholder="email@perusahaan.com" />
              </div>
              <div>
                <label className="label">Password Default *</label>
                <input name="password" type="password" required minLength={8} className="input-glass" placeholder="Min. 8 karakter" />
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label className="label">No. Telepon</label>
              <input name="phone_number" defaultValue={user?.phone_number ?? ''} className="input-glass" placeholder="+62..." />
            </div>
            <div>
              <label className="label">Role *</label>
              <select name="role" defaultValue={user?.role ?? 'Staff'} required className="input-glass">
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="label">Alamat Tempat Tinggal</label>
            <textarea name="address" defaultValue={user?.address ?? ''} className="input-glass" rows={2} placeholder="Alamat lengkap" style={{ resize: 'vertical' }} />
          </div>

          {/* ─ Cascading Project → Cluster → Apps ─ */}
          <div style={{ padding: '1rem', background: 'var(--muted-bg)', borderRadius: '0.75rem', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            <p style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Penugasan Proyek</p>

            <div>
              <label className="label">Kode Proyek</label>
              <select
                name="project_id"
                value={selectedProject}
                onChange={e => setSelectedProject(e.target.value)}
                className="input-glass"
              >
                <option value="">— Pilih Proyek —</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.project_code} — {p.project_name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Nama Cluster</label>
              <select
                name="cluster_id"
                value={selectedCluster}
                onChange={e => setSelectedCluster(e.target.value)}
                className="input-glass"
                disabled={!selectedProject}
              >
                <option value="">— Pilih Cluster —</option>
                {filteredClusters.map(c => (
                  <option key={c.id} value={c.id}>{c.cluster_name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Aplikasi (multi-pilih)</label>
              {filteredApps.length === 0 ? (
                <p style={{ fontSize: '0.8rem', color: 'var(--muted)', fontStyle: 'italic' }}>
                  {selectedCluster ? 'Tidak ada aplikasi di cluster ini.' : 'Pilih cluster terlebih dahulu.'}
                </p>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {filteredApps.map(app => {
                    const isSelected = selectedApps.includes(app.id)
                    return (
                      <button
                        key={app.id}
                        type="button"
                        onClick={() => toggleApp(app.id)}
                        style={{
                          padding: '0.375rem 0.75rem', borderRadius: '9999px', fontSize: '0.8rem',
                          fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s ease',
                          background: isSelected ? 'rgba(59,130,246,0.15)' : 'var(--muted-bg)',
                          color: isSelected ? '#3b82f6' : 'var(--muted)',
                          border: isSelected ? '1px solid rgba(59,130,246,0.4)' : '1px solid var(--border-color)',
                          display: 'flex', alignItems: 'center', gap: '0.35rem',
                        }}
                      >
                        {isSelected && <Check size={12} />}
                        {app.app_code} — {app.app_name}
                      </button>
                    )
                  })}
                </div>
              )}
              {/* Hidden inputs for selected app IDs */}
              {selectedApps.map(id => (
                <input key={id} type="hidden" name="application_ids[]" value={id} />
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.25rem' }}>
            <button type="button" onClick={onClose} className="btn btn-secondary">Batal</button>
            <button type="submit" disabled={isPending} className="btn btn-primary">
              {isPending
                ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Menyimpan...</>
                : mode === 'add' ? '+ Buat User' : 'Simpan Perubahan'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────
export default function UserManagement({ users, projects, clusters, applications }: Props) {
  const [modalMode, setModalMode] = useState<'add' | 'edit' | null>(null)
  const [editTarget, setEditTarget] = useState<UserRow | undefined>()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState('')
  const [search, setSearch] = useState('')

  const filtered = users.filter(u =>
    (u.full_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (u.npp ?? '').toLowerCase().includes(search.toLowerCase())
  )

  const handleDelete = async (userId: string) => {
    if (!confirm('Hapus user ini secara permanen?')) return
    setDeletingId(userId)
    const res = await deleteUser(userId)
    if (res.error) setDeleteError(res.error)
    setDeletingId(null)
  }

  const roleBadge = (role: string) => {
    const map: Record<string, string> = {
      Admin: 'badge badge-approved',
      admin: 'badge badge-approved',
      PM: 'badge badge-pending',
      Staff: 'badge badge-draft',
      user: 'badge badge-draft',
    }
    return map[role] ?? 'badge badge-draft'
  }

  return (
    <>
      {/* Header actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input-glass"
          placeholder="🔍  Cari nama atau NPP..."
          style={{ width: '280px', padding: '0.5rem 0.875rem' }}
        />
        <button onClick={() => { setEditTarget(undefined); setModalMode('add') }} className="btn btn-primary" id="add-user-btn">
          <UserPlus size={16} /> Tambah User
        </button>
      </div>

      {deleteError && (
        <div className="alert-danger" style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem' }}>
          <AlertTriangle size={15} /> {deleteError}
        </div>
      )}

      {/* User table */}
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="table-glass">
            <thead>
              <tr>
                <th>Nama</th>
                <th>NPP</th>
                <th>Role</th>
                <th>Proyek</th>
                <th>Cluster</th>
                <th>Aplikasi</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted)' }}>
                    <Users size={36} style={{ opacity: 0.3, margin: '0 auto 0.5rem' }} />
                    <p>Belum ada user.</p>
                  </td>
                </tr>
              )}
              {filtered.map(u => (
                <tr key={u.id}>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{u.full_name ?? '—'}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{u.phone_number ?? ''}</div>
                  </td>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{u.npp ?? '—'}</td>
                  <td><span className={roleBadge(u.role)}>{u.role}</span></td>
                  <td style={{ fontSize: '0.8rem' }}>
                    {u.projects ? (
                      <div>
                        <span style={{ fontWeight: 700, color: '#3b82f6' }}>{u.projects.project_code}</span>
                        <div style={{ color: 'var(--muted)' }}>{u.projects.project_name}</div>
                      </div>
                    ) : '—'}
                  </td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
                    {u.clusters?.cluster_name ?? '—'}
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                      {(u.profile_applications ?? []).slice(0, 3).map(pa => (
                        <span key={pa.application_id} style={{
                          fontSize: '0.7rem', padding: '0.15rem 0.45rem',
                          background: 'rgba(139,92,246,0.12)', color: '#8b5cf6',
                          border: '1px solid rgba(139,92,246,0.25)', borderRadius: '9999px', fontWeight: 600,
                        }}>
                          {pa.applications?.app_code ?? '—'}
                        </span>
                      ))}
                      {(u.profile_applications ?? []).length > 3 && (
                        <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>
                          +{(u.profile_applications ?? []).length - 3}
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    {u.must_change_password
                      ? <span className="badge badge-pending">Belum ganti PW</span>
                      : <span className="badge badge-approved">Aktif</span>}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.375rem' }}>
                      <button
                        onClick={() => { setEditTarget(u); setModalMode('edit') }}
                        className="btn btn-secondary"
                        style={{ padding: '0.375rem 0.625rem', fontSize: '0.75rem' }}
                        title="Edit user"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => handleDelete(u.id)}
                        disabled={deletingId === u.id}
                        className="btn btn-danger"
                        style={{ padding: '0.375rem 0.625rem', fontSize: '0.75rem' }}
                        title="Hapus user"
                      >
                        {deletingId === u.id
                          ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
                          : <Trash2 size={13} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {modalMode && (
          <UserModal
            mode={modalMode}
            user={editTarget}
            projects={projects}
            clusters={clusters}
            applications={applications}
            onClose={() => setModalMode(null)}
          />
        )}
      </AnimatePresence>
    </>
  )
}
