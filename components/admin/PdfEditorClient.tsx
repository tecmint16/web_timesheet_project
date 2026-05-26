'use client'

import { useActionState, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { uploadPdfTemplate, savePdfFieldMappings, deletePdfTemplate, setActiveTemplate } from '@/app/actions/pdf-templates'
import {
  Upload, Plus, Trash2, Save, CheckCircle, AlertTriangle,
  Loader2, FileText, ChevronDown, ChevronUp, Star
} from 'lucide-react'

// ─── Types ─────────────────────────────────────────────────
type FieldCoord = { x: number; y: number; size: number }
type FieldMappings = Record<string, FieldCoord>
type PdfTemplate = {
  id: string; template_name: string; file_path: string | null
  field_mappings: FieldMappings; is_active: boolean; updated_at: string
}

const PRESET_FIELDS = [
  { key: 'full_name',     label: 'Nama Lengkap' },
  { key: 'npp',           label: 'NPP / No. Pegawai' },
  { key: 'leave_type',    label: 'Jenis Cuti' },
  { key: 'total_days',    label: 'Total Hari' },
  { key: 'start_date',    label: 'Tanggal Mulai' },
  { key: 'end_date',      label: 'Tanggal Selesai' },
  { key: 'address_phone', label: 'Alamat & Telepon' },
  { key: 'description',   label: 'Keterangan' },
  { key: 'created_at',    label: 'Tanggal Pengajuan' },
]

const DEFAULT_MAPPINGS: FieldMappings = {
  full_name:     { x: 60,  y: 680, size: 11 },
  npp:           { x: 320, y: 680, size: 11 },
  leave_type:    { x: 60,  y: 640, size: 11 },
  total_days:    { x: 320, y: 640, size: 11 },
  start_date:    { x: 60,  y: 600, size: 11 },
  end_date:      { x: 320, y: 600, size: 11 },
  address_phone: { x: 60,  y: 560, size: 11 },
  description:   { x: 60,  y: 520, size: 10 },
  created_at:    { x: 380, y: 780, size: 9  },
}

// ─── Upload Form ────────────────────────────────────────────
const uploadInitial = { error: undefined as string | undefined, success: false, id: undefined as string | undefined }

function UploadForm({ onSuccess }: { onSuccess: () => void }) {
  const [state, action, isPending] = useActionState(uploadPdfTemplate, uploadInitial)
  const [fileName, setFileName] = useState('')
  useEffect(() => { if (state.success) onSuccess() }, [state.success])

  return (
    <div className="glass-card" style={{ padding: '1.5rem' }}>
      <h3 style={{ fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Upload size={18} color="#3b82f6" /> Upload Template PDF Baru
      </h3>
      {state.error && (
        <div className="alert-danger" style={{ marginBottom: '0.75rem', display: 'flex', gap: '0.5rem', fontSize: '0.85rem' }}>
          <AlertTriangle size={14} /> {state.error}
        </div>
      )}
      <form action={action} style={{ display: 'flex', flexWrap: 'wrap', gap: '0.875rem', alignItems: 'flex-end' }}>
        <div style={{ flex: '1 1 200px' }}>
          <label className="label">Nama Template *</label>
          <input name="template_name" required className="input-glass" placeholder="Cth: Form Cuti HRD v2" />
        </div>
        <div style={{ flex: '1 1 200px' }}>
          <label className="label">File PDF (opsional)</label>
          <label style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.55rem 0.875rem', borderRadius: '0.625rem', cursor: 'pointer',
            border: '1.5px dashed var(--border-color)', background: 'var(--muted-bg)',
            fontSize: '0.85rem', color: fileName ? 'var(--fg)' : 'var(--muted)',
            transition: 'border-color 0.2s',
          }}>
            <FileText size={15} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {fileName || 'Pilih file .pdf'}
            </span>
            <input
              name="pdf_file" type="file" accept="application/pdf"
              style={{ display: 'none' }}
              onChange={e => setFileName(e.target.files?.[0]?.name ?? '')}
            />
          </label>
        </div>
        <button type="submit" disabled={isPending} className="btn btn-primary">
          {isPending ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={15} />}
          {isPending ? 'Mengupload...' : 'Tambah Template'}
        </button>
      </form>
    </div>
  )
}

// ─── Field Mapper ───────────────────────────────────────────
function FieldMapper({ template, onSaved }: { template: PdfTemplate; onSaved: () => void }) {
  const [mappings, setMappings] = useState<FieldMappings>({ ...DEFAULT_MAPPINGS, ...template.field_mappings })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const update = (key: string, field: keyof FieldCoord, val: number) => {
    setMappings(prev => ({ ...prev, [key]: { ...prev[key], [field]: val } }))
    setSaved(false)
  }

  const handleSave = async () => {
    setSaving(true); setError('')
    const res = await savePdfFieldMappings(template.id, mappings)
    setSaving(false)
    if (res.error) { setError(res.error); return }
    setSaved(true)
    setTimeout(() => { setSaved(false); onSaved() }, 1500)
  }

  return (
    <div style={{ padding: '1.25rem', borderTop: '1px solid var(--border-color)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.875rem' }}>
        <p style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Koordinat Field (pt — referensi pojok kiri-bawah)
        </p>
        {error && <p style={{ fontSize: '0.8rem', color: '#ef4444' }}>{error}</p>}
        <button onClick={handleSave} disabled={saving} className="btn btn-primary" style={{ fontSize: '0.82rem', padding: '0.4rem 0.875rem' }}>
          {saving ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
            : saved ? <CheckCircle size={13} color="#10b981" />
            : <Save size={13} />}
          {saving ? 'Menyimpan...' : saved ? 'Tersimpan!' : 'Simpan Koordinat'}
        </button>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table className="table-glass">
          <thead>
            <tr>
              <th>Variabel</th>
              <th>Label</th>
              <th>X (pt)</th>
              <th>Y (pt)</th>
              <th>Font Size</th>
            </tr>
          </thead>
          <tbody>
            {PRESET_FIELDS.map(f => (
              <tr key={f.key}>
                <td><code style={{ fontSize: '0.78rem', background: 'var(--muted-bg)', padding: '2px 6px', borderRadius: '4px' }}>{`{{${f.key}}}`}</code></td>
                <td style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>{f.label}</td>
                {(['x', 'y', 'size'] as const).map(coord => (
                  <td key={coord}>
                    <input
                      type="number"
                      value={mappings[f.key]?.[coord] ?? 0}
                      onChange={e => update(f.key, coord, Number(e.target.value))}
                      className="input-glass"
                      style={{ width: '70px', padding: '0.35rem 0.5rem', fontSize: '0.82rem', fontFamily: 'monospace', textAlign: 'right' }}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Template Card ──────────────────────────────────────────
function TemplateCard({ template, onDelete, onSetActive, onSaved }: {
  template: PdfTemplate
  onDelete: (id: string) => void
  onSetActive: (id: string) => void
  onSaved: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [activating, setActivating] = useState(false)

  const handleDelete = async () => {
    if (!confirm(`Hapus template "${template.template_name}"?`)) return
    setDeleting(true)
    await deletePdfTemplate(template.id)
    onDelete(template.id)
    setDeleting(false)
  }

  const handleSetActive = async () => {
    setActivating(true)
    await setActiveTemplate(template.id)
    onSetActive(template.id)
    setActivating(false)
  }

  return (
    <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem 1.25rem', cursor: 'pointer' }}
        onClick={() => setExpanded(!expanded)}>
        <div style={{ width: 36, height: 36, borderRadius: '8px', background: template.is_active ? 'rgba(16,185,129,0.15)' : 'var(--muted-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <FileText size={18} color={template.is_active ? '#10b981' : 'var(--muted)'} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{template.template_name}</span>
            {template.is_active && (
              <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: '9999px', background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' }}>
                ✓ Aktif
              </span>
            )}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.125rem' }}>
            {template.file_path ? `📎 ${template.file_path}` : '📋 Tanpa file PDF'}
            {' · '}Updated: {new Date(template.updated_at).toLocaleDateString('id-ID')}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.375rem', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
          {!template.is_active && (
            <button onClick={handleSetActive} disabled={activating} className="btn btn-secondary"
              style={{ padding: '0.3rem 0.55rem', fontSize: '0.75rem' }} title="Jadikan aktif">
              {activating ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Star size={13} />}
            </button>
          )}
          <button onClick={handleDelete} disabled={deleting} className="btn btn-danger"
            style={{ padding: '0.3rem 0.55rem' }} title="Hapus">
            {deleting ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Trash2 size={13} />}
          </button>
          {expanded ? <ChevronUp size={16} style={{ color: 'var(--muted)' }} /> : <ChevronDown size={16} style={{ color: 'var(--muted)' }} />}
        </div>
      </div>

      {/* Expandable field mapper */}
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
            style={{ overflow: 'hidden' }}>
            <FieldMapper template={template} onSaved={onSaved} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Main Export ────────────────────────────────────────────
export default function PdfEditorClient({ templates: initialTemplates }: { templates: PdfTemplate[] }) {
  const [templates, setTemplates] = useState(initialTemplates)
  const [showUpload, setShowUpload] = useState(false)

  const handleUploaded = () => {
    setShowUpload(false)
    // Refresh by navigating — or we can optimistically add a placeholder
    window.location.reload()
  }

  const handleDelete = (id: string) => setTemplates(prev => prev.filter(t => t.id !== id))
  const handleSetActive = (id: string) => setTemplates(prev => prev.map(t => ({ ...t, is_active: t.id === id })))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Upload toggle */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={() => setShowUpload(!showUpload)} className="btn btn-primary">
          <Upload size={15} /> {showUpload ? 'Tutup Form Upload' : 'Upload Template Baru'}
        </button>
      </div>

      <AnimatePresence>
        {showUpload && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <UploadForm onSuccess={handleUploaded} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Template list */}
      {templates.length === 0 ? (
        <div className="glass-card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--muted)' }}>
          <FileText size={40} style={{ opacity: 0.3, margin: '0 auto 1rem' }} />
          <p style={{ fontWeight: 600 }}>Belum ada template PDF.</p>
          <p style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>Klik "Upload Template Baru" untuk menambahkan.</p>
        </div>
      ) : (
        templates.map(tpl => (
          <TemplateCard
            key={tpl.id}
            template={tpl}
            onDelete={handleDelete}
            onSetActive={handleSetActive}
            onSaved={() => {}}
          />
        ))
      )}
    </div>
  )
}
