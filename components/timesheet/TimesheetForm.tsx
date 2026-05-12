'use client'

import { useActionState, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { upsertTimesheet } from '@/app/actions/timesheet'
import type { Profile, Project, Cluster, Application } from '@/types/database.types'
import { Clock, CalendarDays, AlertTriangle, CheckCircle, Loader2, Check } from 'lucide-react'
import { calcWorkHours } from '@/lib/utils'

type ProfileWithAssignment = Profile & {
  projects: Pick<Project, 'id' | 'project_code' | 'project_name'> | null
  clusters: Pick<Cluster, 'id' | 'cluster_name'> | null
}

interface Props {
  profile: ProfileWithAssignment
  assignedApps: Pick<Application, 'id' | 'app_code' | 'app_name'>[]
  editEntry?: any | null
  onSuccess?: () => void
}

const SHIFTS = ['Morning', 'Evening', 'Night', 'WFH']
const STATUS = ['Hadir', 'Izin', 'Sakit', 'Lembur'] as const
const initialState = { error: undefined as string | undefined, success: false }

export default function TimesheetForm({ profile, assignedApps, editEntry, onSuccess }: Props) {
  const [state, formAction, isPending] = useActionState(upsertTimesheet, initialState)

  const today = new Date().toISOString().split('T')[0]
  const [timeIn, setTimeIn]   = useState(editEntry?.time_in?.substring(0, 5) ?? '08:00')
  const [timeOut, setTimeOut] = useState(editEntry?.time_out?.substring(0, 5) ?? '17:00')
  const [selectedApps, setSelectedApps] = useState<string[]>(
    editEntry?.timesheet_applications?.map((ta: any) => ta.application_id) ?? []
  )

  const workHours = calcWorkHours(timeIn, timeOut)
  const isShortHours = workHours > 0 && workHours < 8

  const toggleApp = (id: string) =>
    setSelectedApps(prev => prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id])

  useEffect(() => {
    if (editEntry) {
      setTimeIn(editEntry.time_in?.substring(0, 5) ?? '08:00')
      setTimeOut(editEntry.time_out?.substring(0, 5) ?? '17:00')
      setSelectedApps(editEntry.timesheet_applications?.map((ta: any) => ta.application_id) ?? [])
    } else {
      setTimeIn('08:00')
      setTimeOut('17:00')
      setSelectedApps([])
    }
  }, [editEntry])

  useEffect(() => {
    if ((state as any).success) onSuccess?.()
  }, [(state as any).success])

  return (
    <form action={formAction}>
      {editEntry?.id && <input type="hidden" name="id" value={editEntry.id} />}
      {/* Pass selected app IDs */}
      {selectedApps.map(id => (
        <input key={id} type="hidden" name="application_ids[]" value={id} />
      ))}

      <div className="glass-card" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--gradient-brand)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CalendarDays size={20} color="white" />
          </div>
          <div>
            <h2 className="section-title">{editEntry ? 'Edit Entri Timesheet' : 'Input Timesheet Baru'}</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Catat kehadiran dan aktivitas harian Anda</p>
          </div>
        </div>

        {/* Feedback */}
        <AnimatePresence>
          {(state as any).error && (
            <motion.div className="alert-danger" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              style={{ display: 'flex', gap: '0.5rem' }}>
              <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: '1px' }} />
              {(state as any).error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Row 1: Date + Shift + Status */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
          <div>
            <label className="label" htmlFor="ts-date">Tanggal *</label>
            <input id="ts-date" name="log_date" type="date" defaultValue={editEntry?.log_date ?? today}
              required className="input-glass" />
          </div>
          <div>
            <label className="label" htmlFor="ts-shift">Jadwal Shift *</label>
            <select id="ts-shift" name="shift_type" defaultValue={editEntry?.shift_type ?? 'Morning'} required className="input-glass">
              {SHIFTS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="ts-status">Status *</label>
            <select id="ts-status" name="status" defaultValue={editEntry?.status ?? 'Hadir'} required className="input-glass">
              {STATUS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        {/* Row 2: Time In + Time Out + Work Hours */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', alignItems: 'end' }}>
          <div>
            <label className="label" htmlFor="ts-timein">Jam Masuk *</label>
            <input id="ts-timein" name="time_in" type="time" value={timeIn} onChange={e => setTimeIn(e.target.value)}
              required className="input-glass" />
          </div>
          <div>
            <label className="label" htmlFor="ts-timeout">Jam Pulang *</label>
            <input id="ts-timeout" name="time_out" type="time" value={timeOut} onChange={e => setTimeOut(e.target.value)}
              required className="input-glass" />
          </div>
          <div>
            <label className="label">Jam Kerja (Otomatis)</label>
            <div style={{
              padding: '0.6rem 0.875rem', borderRadius: '0.625rem',
              background: isShortHours ? 'rgba(239,68,68,0.1)' : workHours > 0 ? 'rgba(16,185,129,0.1)' : 'var(--muted-bg)',
              border: `1px solid ${isShortHours ? 'rgba(239,68,68,0.3)' : 'var(--border-color)'}`,
              display: 'flex', alignItems: 'center', gap: '0.5rem',
            }}>
              <Clock size={16} color={isShortHours ? '#ef4444' : workHours > 0 ? '#10b981' : 'var(--muted)'} />
              <span style={{ fontWeight: 700, color: isShortHours ? '#ef4444' : workHours > 0 ? '#10b981' : 'var(--muted)', fontSize: '1rem' }}>
                {workHours.toFixed(1)} jam
              </span>
            </div>
          </div>
        </div>

        {/* Short hours warning */}
        <AnimatePresence>
          {isShortHours && (
            <motion.div className="alert-warning" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: '1px' }} />
                <div>
                  <strong>Jam kerja kurang dari 8 jam!</strong>
                  <p style={{ marginTop: '0.5rem' }}>
                    <label className="label" style={{ fontSize: '0.8rem' }}>Alasan Kekurangan Jam *</label>
                    <input name="short_hours_reason" defaultValue={editEntry?.short_hours_reason ?? ''}
                      placeholder="Contoh: Izin dokter, rapat singkat, dll." required className="input-glass" style={{ marginTop: '0.25rem' }} />
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Row 3: Auto-populated Project Info (Read-only) */}
        <div style={{ padding: '0.875rem 1rem', background: 'var(--muted-bg)', borderRadius: '0.75rem', border: '1px solid var(--border-color)' }}>
          <p style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted)', marginBottom: '0.625rem' }}>
            📌 Informasi Proyek (Otomatis dari Profil)
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem' }}>
            <div>
              <span style={{ fontSize: '0.72rem', color: 'var(--muted)', display: 'block' }}>Kode Proyek</span>
              <span style={{ fontWeight: 700, fontFamily: 'monospace', color: '#3b82f6' }}>
                {profile.projects?.project_code ?? '—'}
              </span>
            </div>
            <div>
              <span style={{ fontSize: '0.72rem', color: 'var(--muted)', display: 'block' }}>Nama Proyek</span>
              <span style={{ fontWeight: 600, color: 'var(--fg)' }}>{profile.projects?.project_name ?? '—'}</span>
            </div>
            <div>
              <span style={{ fontSize: '0.72rem', color: 'var(--muted)', display: 'block' }}>Cluster</span>
              <span style={{ fontWeight: 600, color: 'var(--fg)' }}>{profile.clusters?.cluster_name ?? '—'}</span>
            </div>
          </div>
        </div>

        {/* Row 4: Multi-select Applications */}
        <div>
          <label className="label">Aplikasi yang Dikerjakan (pilih yang relevan)</label>
          {assignedApps.length === 0 ? (
            <p style={{ fontSize: '0.85rem', color: 'var(--muted)', fontStyle: 'italic', padding: '0.75rem', background: 'var(--muted-bg)', borderRadius: '0.625rem', border: '1px solid var(--border-color)' }}>
              Belum ada aplikasi yang ditugaskan. Hubungi Admin.
            </p>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.375rem' }}>
              {assignedApps.map(app => {
                const isSelected = selectedApps.includes(app.id)
                return (
                  <motion.button
                    key={app.id}
                    type="button"
                    onClick={() => toggleApp(app.id)}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    style={{
                      padding: '0.45rem 0.875rem', borderRadius: '9999px', fontSize: '0.82rem',
                      fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s ease',
                      background: isSelected ? 'rgba(59,130,246,0.15)' : 'var(--muted-bg)',
                      color: isSelected ? '#3b82f6' : 'var(--muted)',
                      border: isSelected ? '1px solid rgba(59,130,246,0.45)' : '1px solid var(--border-color)',
                      display: 'flex', alignItems: 'center', gap: '0.35rem',
                    }}
                  >
                    {isSelected && <Check size={12} />}
                    <span style={{ fontFamily: 'monospace', fontWeight: 800 }}>{app.app_code}</span>
                    <span>—</span>
                    {app.app_name}
                  </motion.button>
                )
              })}
            </div>
          )}
        </div>

        {/* Activity description */}
        <div>
          <label className="label" htmlFor="ts-activity">Kegiatan/Deskripsi Pekerjaan</label>
          <textarea
            id="ts-activity"
            name="activity_desc"
            defaultValue={editEntry?.activity_desc ?? ''}
            rows={3}
            placeholder="Contoh: Review code, deploy ke staging, meeting dengan tim..."
            className="input-glass"
            style={{ resize: 'vertical' }}
          />
        </div>

        {/* Submit */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          <motion.button
            type="submit"
            disabled={isPending}
            className="btn btn-primary"
            whileHover={{ scale: isPending ? 1 : 1.02 }}
            whileTap={{ scale: 0.98 }}
            style={{ minWidth: '140px' }}
            id="timesheet-submit"
          >
            {isPending
              ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Menyimpan...</>
              : <><CheckCircle size={15} /> {editEntry ? 'Perbarui Entri' : 'Simpan Timesheet'}</>}
          </motion.button>
        </div>
      </div>
    </form>
  )
}
