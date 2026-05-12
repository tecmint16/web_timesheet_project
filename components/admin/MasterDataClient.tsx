'use client'

import { Fragment } from 'react'

import { useState, useActionState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  upsertProject, deleteProject,
  upsertCluster, deleteCluster,
  upsertApplication, deleteApplication,
} from '@/app/actions/admin'
import { Plus, Pencil, Trash2, Loader2, AlertTriangle, FolderOpen, Layers, LayoutGrid } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────
type ProjectRow  = { id: string; project_code: string; project_name: string }
type ClusterRow  = { id: string; project_id: string; cluster_name: string; projects?: { project_code: string; project_name: string } }
type AppRow      = { id: string; cluster_id: string; app_code: string; app_name: string; clusters?: { cluster_name: string; project_id: string; projects?: { project_code: string } } }

interface Props {
  projects: ProjectRow[]
  clusters: ClusterRow[]
  applications: AppRow[]
}

const initialState = { error: undefined as string | undefined, success: false }

// ─── Inline Form Row (for small CRUD forms inside table) ──
function InlineForm({ fields, action, onClose, defaultValues = {} }: {
  fields: { name: string; label: string; type?: string; options?: { value: string; label: string }[] }[]
  action: any
  onClose: () => void
  defaultValues?: Record<string, string>
}) {
  const [state, formAction, isPending] = useActionState(action, initialState)
  useEffect(() => { if ((state as any).success) onClose() }, [(state as any).success])

  return (
    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
      style={{ padding: '1rem', background: 'var(--muted-bg)', borderRadius: '0.75rem', border: '1px solid var(--border-color)', marginBottom: '0.75rem' }}>
      {(state as any).error && (
        <div className="alert-danger" style={{ marginBottom: '0.75rem', display: 'flex', gap: '0.5rem', fontSize: '0.8rem' }}>
          <AlertTriangle size={14} /> {(state as any).error}
        </div>
      )}
      <form action={formAction} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        {defaultValues.id && <input type="hidden" name="id" value={defaultValues.id} />}
        {fields.map(f => (
          <div key={f.name} style={{ flex: '1 1 160px' }}>
            <label className="label" style={{ fontSize: '0.72rem' }}>{f.label}</label>
            {f.options ? (
              <select name={f.name} defaultValue={defaultValues[f.name] ?? ''} className="input-glass" style={{ padding: '0.45rem 0.75rem', fontSize: '0.85rem' }}>
                <option value="">— Pilih —</option>
                {f.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            ) : (
              <input name={f.name} type={f.type ?? 'text'} defaultValue={defaultValues[f.name] ?? ''}
                className="input-glass" style={{ padding: '0.45rem 0.75rem', fontSize: '0.85rem' }} />
            )}
          </div>
        ))}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button type="submit" disabled={isPending} className="btn btn-primary" style={{ padding: '0.45rem 0.875rem', fontSize: '0.8rem' }}>
            {isPending ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : 'Simpan'}
          </button>
          <button type="button" onClick={onClose} className="btn btn-secondary" style={{ padding: '0.45rem 0.75rem', fontSize: '0.8rem' }}>Batal</button>
        </div>
      </form>
    </motion.div>
  )
}

// ─── Projects Tab ─────────────────────────────────────────
function ProjectsTab({ projects }: { projects: ProjectRow[] }) {
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus proyek ini? Semua cluster dan aplikasi terkait juga akan terhapus.')) return
    setDeleting(id)
    await deleteProject(id)
    setDeleting(null)
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.75rem' }}>
        <button onClick={() => { setShowForm(!showForm); setEditId(null) }} className="btn btn-primary" style={{ fontSize: '0.85rem' }}>
          <Plus size={15} /> Tambah Proyek
        </button>
      </div>

      <AnimatePresence>
        {showForm && (
          <InlineForm
            fields={[
              { name: 'project_code', label: 'Kode Proyek' },
              { name: 'project_name', label: 'Nama Proyek' },
            ]}
            action={upsertProject}
            onClose={() => setShowForm(false)}
          />
        )}
      </AnimatePresence>

      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="table-glass">
          <thead><tr><th>Kode</th><th>Nama Proyek</th><th style={{ width: '100px' }}>Aksi</th></tr></thead>
          <tbody>
            {projects.length === 0 && (
              <tr><td colSpan={3} style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted)' }}>Belum ada proyek.</td></tr>
            )}
            {projects.map(p => (
              <Fragment key={p.id}>
                <tr>
                  <td style={{ fontFamily: 'monospace', fontWeight: 700, color: '#3b82f6' }}>{p.project_code}</td>
                  <td style={{ fontWeight: 600 }}>{p.project_name}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.375rem' }}>
                      <button onClick={() => setEditId(editId === p.id ? null : p.id)} className="btn btn-secondary" style={{ padding: '0.3rem 0.55rem' }} title="Edit"><Pencil size={13} /></button>
                      <button onClick={() => handleDelete(p.id)} disabled={deleting === p.id} className="btn btn-danger" style={{ padding: '0.3rem 0.55rem' }} title="Hapus">
                        {deleting === p.id ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Trash2 size={13} />}
                      </button>
                    </div>
                  </td>
                </tr>
                {editId === p.id && (
                  <tr>
                    <td colSpan={3} style={{ padding: '0.5rem 1rem' }}>
                      <InlineForm
                        fields={[
                          { name: 'project_code', label: 'Kode Proyek' },
                          { name: 'project_name', label: 'Nama Proyek' },
                        ]}
                        action={upsertProject}
                        onClose={() => setEditId(null)}
                        defaultValues={{ id: p.id, project_code: p.project_code, project_name: p.project_name }}
                      />
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Clusters Tab ─────────────────────────────────────────
function ClustersTab({ clusters, projects }: { clusters: ClusterRow[]; projects: ProjectRow[] }) {
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  const projectOptions = projects.map(p => ({ value: p.id, label: `${p.project_code} — ${p.project_name}` }))

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus cluster ini? Semua aplikasi terkait juga akan terhapus.')) return
    setDeleting(id)
    await deleteCluster(id)
    setDeleting(null)
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.75rem' }}>
        <button onClick={() => { setShowForm(!showForm); setEditId(null) }} className="btn btn-primary" style={{ fontSize: '0.85rem' }}>
          <Plus size={15} /> Tambah Cluster
        </button>
      </div>
      <AnimatePresence>
        {showForm && (
          <InlineForm
            fields={[
              { name: 'project_id', label: 'Proyek Induk', options: projectOptions },
              { name: 'cluster_name', label: 'Nama Cluster' },
            ]}
            action={upsertCluster}
            onClose={() => setShowForm(false)}
          />
        )}
      </AnimatePresence>
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="table-glass">
          <thead><tr><th>Proyek</th><th>Nama Cluster</th><th style={{ width: '100px' }}>Aksi</th></tr></thead>
          <tbody>
            {clusters.length === 0 && (
              <tr><td colSpan={3} style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted)' }}>Belum ada cluster.</td></tr>
            )}
            {clusters.map(c => (
              <Fragment key={c.id}>
                <tr>
                  <td style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
                    <span style={{ fontWeight: 700, color: '#3b82f6', fontFamily: 'monospace' }}>{c.projects?.project_code}</span>
                    <span style={{ marginLeft: '0.5rem' }}>{c.projects?.project_name}</span>
                  </td>
                  <td style={{ fontWeight: 600 }}>{c.cluster_name}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.375rem' }}>
                      <button onClick={() => setEditId(editId === c.id ? null : c.id)} className="btn btn-secondary" style={{ padding: '0.3rem 0.55rem' }}><Pencil size={13} /></button>
                      <button onClick={() => handleDelete(c.id)} disabled={deleting === c.id} className="btn btn-danger" style={{ padding: '0.3rem 0.55rem' }}>
                        {deleting === c.id ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Trash2 size={13} />}
                      </button>
                    </div>
                  </td>
                </tr>
                {editId === c.id && (
                  <tr>
                    <td colSpan={3} style={{ padding: '0.5rem 1rem' }}>
                      <InlineForm
                        fields={[
                          { name: 'project_id', label: 'Proyek Induk', options: projectOptions },
                          { name: 'cluster_name', label: 'Nama Cluster' },
                        ]}
                        action={upsertCluster}
                        onClose={() => setEditId(null)}
                        defaultValues={{ id: c.id, project_id: c.project_id, cluster_name: c.cluster_name }}
                      />
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Applications Tab ─────────────────────────────────────
function ApplicationsTab({ applications, clusters }: { applications: AppRow[]; clusters: ClusterRow[] }) {
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  const clusterOptions = clusters.map(c => ({ value: c.id, label: `[${c.projects?.project_code}] ${c.cluster_name}` }))

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus aplikasi ini?')) return
    setDeleting(id)
    await deleteApplication(id)
    setDeleting(null)
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.75rem' }}>
        <button onClick={() => { setShowForm(!showForm); setEditId(null) }} className="btn btn-primary" style={{ fontSize: '0.85rem' }}>
          <Plus size={15} /> Tambah Aplikasi
        </button>
      </div>
      <AnimatePresence>
        {showForm && (
          <InlineForm
            fields={[
              { name: 'cluster_id', label: 'Cluster Induk', options: clusterOptions },
              { name: 'app_code', label: 'Kode Aplikasi' },
              { name: 'app_name', label: 'Nama Aplikasi' },
            ]}
            action={upsertApplication}
            onClose={() => setShowForm(false)}
          />
        )}
      </AnimatePresence>
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="table-glass">
          <thead><tr><th>Cluster</th><th>Kode App</th><th>Nama Aplikasi</th><th style={{ width: '100px' }}>Aksi</th></tr></thead>
          <tbody>
            {applications.length === 0 && (
              <tr><td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted)' }}>Belum ada aplikasi.</td></tr>
            )}
            {applications.map(a => (
              <Fragment key={a.id}>
                <tr>
                  <td style={{ fontSize: '0.8rem' }}>
                    <span style={{ color: '#3b82f6', fontWeight: 700, fontFamily: 'monospace', marginRight: '0.35rem' }}>{a.clusters?.projects?.project_code}</span>
                    <span style={{ color: 'var(--muted)' }}>{a.clusters?.cluster_name}</span>
                  </td>
                  <td style={{ fontFamily: 'monospace', fontWeight: 700, color: '#8b5cf6' }}>{a.app_code}</td>
                  <td style={{ fontWeight: 600 }}>{a.app_name}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.375rem' }}>
                      <button onClick={() => setEditId(editId === a.id ? null : a.id)} className="btn btn-secondary" style={{ padding: '0.3rem 0.55rem' }}><Pencil size={13} /></button>
                      <button onClick={() => handleDelete(a.id)} disabled={deleting === a.id} className="btn btn-danger" style={{ padding: '0.3rem 0.55rem' }}>
                        {deleting === a.id ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Trash2 size={13} />}
                      </button>
                    </div>
                  </td>
                </tr>
                {editId === a.id && (
                  <tr>
                    <td colSpan={4} style={{ padding: '0.5rem 1rem' }}>
                      <InlineForm
                        fields={[
                          { name: 'cluster_id', label: 'Cluster Induk', options: clusterOptions },
                          { name: 'app_code', label: 'Kode Aplikasi' },
                          { name: 'app_name', label: 'Nama Aplikasi' },
                        ]}
                        action={upsertApplication}
                        onClose={() => setEditId(null)}
                        defaultValues={{ id: a.id, cluster_id: a.cluster_id, app_code: a.app_code, app_name: a.app_name }}
                      />
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Main Export ──────────────────────────────────────────
const TABS = [
  { key: 'projects', label: 'Proyek', icon: FolderOpen },
  { key: 'clusters', label: 'Cluster', icon: Layers },
  { key: 'apps',    label: 'Aplikasi', icon: LayoutGrid },
]

export default function MasterDataClient({ projects, clusters, applications }: Props) {
  const [activeTab, setActiveTab] = useState('projects')

  return (
    <div>
      {/* Tab bar */}
      <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1.25rem', background: 'var(--muted-bg)', padding: '0.3rem', borderRadius: '0.875rem', width: 'fit-content', border: '1px solid var(--border-color)' }}>
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.5rem 1rem', borderRadius: '0.625rem', fontSize: '0.875rem',
              fontWeight: activeTab === key ? 700 : 500, border: 'none', cursor: 'pointer',
              transition: 'all 0.2s ease',
              background: activeTab === key ? 'var(--surface-alt)' : 'transparent',
              color: activeTab === key ? 'var(--fg)' : 'var(--muted)',
              boxShadow: activeTab === key ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
            }}
          >
            <Icon size={16} />
            {label}
            <span style={{
              fontSize: '0.7rem', fontWeight: 700,
              background: activeTab === key ? 'rgba(59,130,246,0.15)' : 'transparent',
              color: activeTab === key ? '#3b82f6' : 'var(--muted)',
              padding: '0.1rem 0.4rem', borderRadius: '9999px',
            }}>
              {key === 'projects' ? projects.length : key === 'clusters' ? clusters.length : applications.length}
            </span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} transition={{ duration: 0.18 }}>
          {activeTab === 'projects' && <ProjectsTab projects={projects} />}
          {activeTab === 'clusters' && <ClustersTab clusters={clusters} projects={projects} />}
          {activeTab === 'apps'     && <ApplicationsTab applications={applications} clusters={clusters} />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
