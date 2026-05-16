'use client'

import { Fragment, useActionState, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  upsertProject, deleteProject,
  upsertCluster, deleteCluster,
  upsertApplication, deleteApplication,
} from '@/app/actions/admin'
import { Plus, Pencil, Trash2, Loader2, AlertTriangle, FolderOpen, Layers, LayoutGrid } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────
type ProjectRow = { id: string; project_code: string; project_name: string }
type ClusterRow = { id: string; project_id: string; cluster_name: string; projects?: { project_code: string; project_name: string } }
type AppRow     = { id: string; cluster_id: string; app_code: string; app_name: string; clusters?: { cluster_name: string; project_id: string; projects?: { project_code: string } } }

interface Props {
  projects: ProjectRow[]
  clusters: ClusterRow[]
  applications: AppRow[]
}

const s0 = { error: undefined as string | undefined, success: false }

// ─── Shared form row styles ────────────────────────────────
const formWrap: React.CSSProperties = {
  padding: '1rem', background: 'var(--muted-bg)',
  borderRadius: '0.75rem', border: '1px solid var(--border-color)', marginBottom: '0.75rem',
}
const formRow: React.CSSProperties = { display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }
const fieldWrap: React.CSSProperties = { flex: '1 1 160px' }
const btnSm: React.CSSProperties    = { padding: '0.3rem 0.55rem' }
const iSm: React.CSSProperties      = { padding: '0.45rem 0.75rem', fontSize: '0.85rem' }

function FieldInput({ name, label, defaultValue = '' }: { name: string; label: string; defaultValue?: string }) {
  return (
    <div style={fieldWrap}>
      <label className="label" style={{ fontSize: '0.72rem' }}>{label}</label>
      <input name={name} defaultValue={defaultValue} className="input-glass" style={iSm} />
    </div>
  )
}
function FieldSelect({ name, label, options, defaultValue = '' }: { name: string; label: string; options: { value: string; label: string }[]; defaultValue?: string }) {
  return (
    <div style={fieldWrap}>
      <label className="label" style={{ fontSize: '0.72rem' }}>{label}</label>
      <select name={name} defaultValue={defaultValue} className="input-glass" style={iSm}>
        <option value="">— Pilih —</option>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}
function FormButtons({ isPending, onClose }: { isPending: boolean; onClose: () => void }) {
  return (
    <div style={{ display: 'flex', gap: '0.5rem' }}>
      <button type="submit" disabled={isPending} className="btn btn-primary" style={{ padding: '0.45rem 0.875rem', fontSize: '0.8rem' }}>
        {isPending ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : 'Simpan'}
      </button>
      <button type="button" onClick={onClose} className="btn btn-secondary" style={{ padding: '0.45rem 0.75rem', fontSize: '0.8rem' }}>Batal</button>
    </div>
  )
}
function ErrorBanner({ msg }: { msg?: string }) {
  if (!msg) return null
  return (
    <div className="alert-danger" style={{ marginBottom: '0.75rem', display: 'flex', gap: '0.5rem', fontSize: '0.8rem' }}>
      <AlertTriangle size={14} /> {msg}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// PROJECT FORMS — directly bound to upsertProject
// ═══════════════════════════════════════════════════════════
function AddProjectForm({ onClose }: { onClose: () => void }) {
  const [state, action, isPending] = useActionState(upsertProject, s0)
  useEffect(() => { if (state.success) onClose() }, [state.success])
  return (
    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} style={formWrap}>
      <ErrorBanner msg={state.error} />
      <form action={action} style={formRow}>
        <FieldInput name="project_code" label="Kode Proyek" />
        <FieldInput name="project_name" label="Nama Proyek" />
        <FormButtons isPending={isPending} onClose={onClose} />
      </form>
    </motion.div>
  )
}
function EditProjectForm({ project, onClose }: { project: ProjectRow; onClose: () => void }) {
  const [state, action, isPending] = useActionState(upsertProject, s0)
  useEffect(() => { if (state.success) onClose() }, [state.success])
  return (
    <td colSpan={3} style={{ padding: '0.5rem 1rem' }}>
      <div style={formWrap}>
        <ErrorBanner msg={state.error} />
        <form action={action} style={formRow}>
          <input type="hidden" name="id" value={project.id} />
          <FieldInput name="project_code" label="Kode Proyek" defaultValue={project.project_code} />
          <FieldInput name="project_name" label="Nama Proyek" defaultValue={project.project_name} />
          <FormButtons isPending={isPending} onClose={onClose} />
        </form>
      </div>
    </td>
  )
}

// ═══════════════════════════════════════════════════════════
// CLUSTER FORMS — directly bound to upsertCluster
// ═══════════════════════════════════════════════════════════
function AddClusterForm({ projects, onClose }: { projects: ProjectRow[]; onClose: () => void }) {
  const [state, action, isPending] = useActionState(upsertCluster, s0)
  useEffect(() => { if (state.success) onClose() }, [state.success])
  const opts = projects.map(p => ({ value: p.id, label: `${p.project_code} — ${p.project_name}` }))
  return (
    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} style={formWrap}>
      <ErrorBanner msg={state.error} />
      <form action={action} style={formRow}>
        <FieldSelect name="project_id" label="Proyek Induk" options={opts} />
        <FieldInput  name="cluster_name" label="Nama Cluster" />
        <FormButtons isPending={isPending} onClose={onClose} />
      </form>
    </motion.div>
  )
}
function EditClusterForm({ cluster, projects, onClose }: { cluster: ClusterRow; projects: ProjectRow[]; onClose: () => void }) {
  const [state, action, isPending] = useActionState(upsertCluster, s0)
  useEffect(() => { if (state.success) onClose() }, [state.success])
  const opts = projects.map(p => ({ value: p.id, label: `${p.project_code} — ${p.project_name}` }))
  return (
    <td colSpan={3} style={{ padding: '0.5rem 1rem' }}>
      <div style={formWrap}>
        <ErrorBanner msg={state.error} />
        <form action={action} style={formRow}>
          <input type="hidden" name="id" value={cluster.id} />
          <FieldSelect name="project_id" label="Proyek Induk" options={opts} defaultValue={cluster.project_id} />
          <FieldInput  name="cluster_name" label="Nama Cluster" defaultValue={cluster.cluster_name} />
          <FormButtons isPending={isPending} onClose={onClose} />
        </form>
      </div>
    </td>
  )
}

// ═══════════════════════════════════════════════════════════
// APPLICATION FORMS — directly bound to upsertApplication
// ═══════════════════════════════════════════════════════════
function AddApplicationForm({ clusters, onClose }: { clusters: ClusterRow[]; onClose: () => void }) {
  const [state, action, isPending] = useActionState(upsertApplication, s0)
  useEffect(() => { if (state.success) onClose() }, [state.success])
  const opts = clusters.map(c => ({ value: c.id, label: `[${c.projects?.project_code ?? '?'}] ${c.cluster_name}` }))
  return (
    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} style={formWrap}>
      <ErrorBanner msg={state.error} />
      <form action={action} style={formRow}>
        <FieldSelect name="cluster_id" label="Cluster Induk" options={opts} />
        <FieldInput  name="app_code"   label="Kode Aplikasi" />
        <FieldInput  name="app_name"   label="Nama Aplikasi" />
        <FormButtons isPending={isPending} onClose={onClose} />
      </form>
    </motion.div>
  )
}
function EditApplicationForm({ app, clusters, onClose }: { app: AppRow; clusters: ClusterRow[]; onClose: () => void }) {
  const [state, action, isPending] = useActionState(upsertApplication, s0)
  useEffect(() => { if (state.success) onClose() }, [state.success])
  const opts = clusters.map(c => ({ value: c.id, label: `[${c.projects?.project_code ?? '?'}] ${c.cluster_name}` }))
  return (
    <td colSpan={4} style={{ padding: '0.5rem 1rem' }}>
      <div style={formWrap}>
        <ErrorBanner msg={state.error} />
        <form action={action} style={formRow}>
          <input type="hidden" name="id" value={app.id} />
          <FieldSelect name="cluster_id" label="Cluster Induk" options={opts} defaultValue={app.cluster_id} />
          <FieldInput  name="app_code"   label="Kode Aplikasi" defaultValue={app.app_code} />
          <FieldInput  name="app_name"   label="Nama Aplikasi" defaultValue={app.app_name} />
          <FormButtons isPending={isPending} onClose={onClose} />
        </form>
      </div>
    </td>
  )
}

// ═══════════════════════════════════════════════════════════
// TABS
// ═══════════════════════════════════════════════════════════

function ProjectsTab({ projects }: { projects: ProjectRow[] }) {
  const [showAdd, setShowAdd] = useState(false)
  const [editId, setEditId]   = useState<string | null>(null)
  const [deleting, setDel]    = useState<string | null>(null)

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus proyek? Semua cluster & aplikasi terkait ikut terhapus.')) return
    setDel(id); await deleteProject(id); setDel(null)
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.75rem' }}>
        <button onClick={() => { setShowAdd(!showAdd); setEditId(null) }} className="btn btn-primary" style={{ fontSize: '0.85rem' }}>
          <Plus size={15} /> Tambah Proyek
        </button>
      </div>
      <AnimatePresence>
        {showAdd && <AddProjectForm key="add-project" onClose={() => setShowAdd(false)} />}
      </AnimatePresence>
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="table-glass">
          <thead><tr><th>Kode</th><th>Nama Proyek</th><th style={{ width: 100 }}>Aksi</th></tr></thead>
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
                      <button onClick={() => setEditId(editId === p.id ? null : p.id)} className="btn btn-secondary" style={btnSm}><Pencil size={13} /></button>
                      <button onClick={() => handleDelete(p.id)} disabled={deleting === p.id} className="btn btn-danger" style={btnSm}>
                        {deleting === p.id ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Trash2 size={13} />}
                      </button>
                    </div>
                  </td>
                </tr>
                {editId === p.id && (
                  <tr><EditProjectForm key={`edit-${p.id}`} project={p} onClose={() => setEditId(null)} /></tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ClustersTab({ clusters, projects }: { clusters: ClusterRow[]; projects: ProjectRow[] }) {
  const [showAdd, setShowAdd] = useState(false)
  const [editId, setEditId]   = useState<string | null>(null)
  const [deleting, setDel]    = useState<string | null>(null)

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus cluster? Semua aplikasi terkait ikut terhapus.')) return
    setDel(id); await deleteCluster(id); setDel(null)
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.75rem' }}>
        <button onClick={() => { setShowAdd(!showAdd); setEditId(null) }} className="btn btn-primary" style={{ fontSize: '0.85rem' }}>
          <Plus size={15} /> Tambah Cluster
        </button>
      </div>
      <AnimatePresence>
        {showAdd && <AddClusterForm key="add-cluster" projects={projects} onClose={() => setShowAdd(false)} />}
      </AnimatePresence>
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="table-glass">
          <thead><tr><th>Proyek</th><th>Nama Cluster</th><th style={{ width: 100 }}>Aksi</th></tr></thead>
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
                      <button onClick={() => setEditId(editId === c.id ? null : c.id)} className="btn btn-secondary" style={btnSm}><Pencil size={13} /></button>
                      <button onClick={() => handleDelete(c.id)} disabled={deleting === c.id} className="btn btn-danger" style={btnSm}>
                        {deleting === c.id ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Trash2 size={13} />}
                      </button>
                    </div>
                  </td>
                </tr>
                {editId === c.id && (
                  <tr><EditClusterForm key={`edit-${c.id}`} cluster={c} projects={projects} onClose={() => setEditId(null)} /></tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ApplicationsTab({ applications, clusters }: { applications: AppRow[]; clusters: ClusterRow[] }) {
  const [showAdd, setShowAdd] = useState(false)
  const [editId, setEditId]   = useState<string | null>(null)
  const [deleting, setDel]    = useState<string | null>(null)

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus aplikasi ini?')) return
    setDel(id); await deleteApplication(id); setDel(null)
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.75rem' }}>
        <button onClick={() => { setShowAdd(!showAdd); setEditId(null) }} className="btn btn-primary" style={{ fontSize: '0.85rem' }}>
          <Plus size={15} /> Tambah Aplikasi
        </button>
      </div>
      <AnimatePresence>
        {showAdd && <AddApplicationForm key="add-app" clusters={clusters} onClose={() => setShowAdd(false)} />}
      </AnimatePresence>
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="table-glass">
          <thead><tr><th>Cluster</th><th>Kode App</th><th>Nama Aplikasi</th><th style={{ width: 100 }}>Aksi</th></tr></thead>
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
                      <button onClick={() => setEditId(editId === a.id ? null : a.id)} className="btn btn-secondary" style={btnSm}><Pencil size={13} /></button>
                      <button onClick={() => handleDelete(a.id)} disabled={deleting === a.id} className="btn btn-danger" style={btnSm}>
                        {deleting === a.id ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Trash2 size={13} />}
                      </button>
                    </div>
                  </td>
                </tr>
                {editId === a.id && (
                  <tr><EditApplicationForm key={`edit-${a.id}`} app={a} clusters={clusters} onClose={() => setEditId(null)} /></tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// MAIN EXPORT
// ═══════════════════════════════════════════════════════════
const TABS = [
  { key: 'projects', label: 'Proyek',   icon: FolderOpen },
  { key: 'clusters', label: 'Cluster',  icon: Layers },
  { key: 'apps',     label: 'Aplikasi', icon: LayoutGrid },
]

export default function MasterDataClient({ projects, clusters, applications }: Props) {
  const [activeTab, setActiveTab] = useState('projects')

  return (
    <div>
      <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1.25rem', background: 'var(--muted-bg)', padding: '0.3rem', borderRadius: '0.875rem', width: 'fit-content', border: '1px solid var(--border-color)' }}>
        {TABS.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setActiveTab(key)} style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.5rem 1rem', borderRadius: '0.625rem', fontSize: '0.875rem',
            fontWeight: activeTab === key ? 700 : 500, border: 'none', cursor: 'pointer',
            transition: 'all 0.2s ease',
            background: activeTab === key ? 'var(--surface-alt)' : 'transparent',
            color: activeTab === key ? 'var(--fg)' : 'var(--muted)',
            boxShadow: activeTab === key ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
          }}>
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
