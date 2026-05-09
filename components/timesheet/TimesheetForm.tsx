'use client'

import { useState, useEffect, useActionState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Save, X, AlertTriangle, CheckCircle, Loader2, Clock
} from 'lucide-react'
import { upsertTimesheet } from '@/app/actions/timesheet'
import { calcWorkHours } from '@/lib/utils'
import type { MasterProject, Timesheet } from '@/types/database.types'

const SHIFT_OPTIONS = ['Morning', 'Evening', 'Night', 'WFH']
const STATUS_OPTIONS = ['Hadir', 'Izin', 'Sakit', 'Lembur']

interface TimesheetFormProps {
  projects: MasterProject[]
  editEntry?: Timesheet | null
  onClose?: () => void
}

const initialState = { error: undefined, success: false }

export function TimesheetForm({ projects, editEntry, onClose }: TimesheetFormProps) {
  const [timeIn, setTimeIn] = useState(editEntry?.time_in?.substring(0, 5) ?? '08:00')
  const [timeOut, setTimeOut] = useState(editEntry?.time_out?.substring(0, 5) ?? '17:00')
  const [workHours, setWorkHours] = useState(0)
  const [showReason, setShowReason] = useState(false)
  const [state, formAction, isPending] = useActionState(upsertTimesheet, initialState)

  useEffect(() => {
    const h = calcWorkHours(timeIn, timeOut)
    setWorkHours(h)
    setShowReason(h < 8 && h > 0)
  }, [timeIn, timeOut])

  useEffect(() => {
    if (state.success) {
      onClose?.()
    }
  }, [state.success, onClose])

  const today = new Date().toISOString().split('T')[0]

  return (
    <form action={formAction}>
      {editEntry?.id && <input type="hidden" name="id" value={editEntry.id} />}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.125rem' }}>

        {/* Error / Success */}
        <AnimatePresence>
          {state.error && (
            <motion.div
              className="alert-danger"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}
            >
              <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: '1px' }} />
              <span>{state.error}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Row 1: Date + Shift */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label className="label" htmlFor="ts-date">Tanggal</label>
            <input
              id="ts-date" name="log_date" type="date"
              defaultValue={editEntry?.log_date ?? today}
              max={today}
              required className="input-glass"
            />
          </div>
          <div>
            <label className="label" htmlFor="ts-shift">Shifting</label>
            <select id="ts-shift" name="shift_type" className="input-glass" defaultValue={editEntry?.shift_type ?? 'Morning'}>
              {SHIFT_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        {/* Row 2: Time In + Time Out */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label className="label" htmlFor="ts-timein">Jam Masuk</label>
            <input
              id="ts-timein" name="time_in" type="time"
              value={timeIn} onChange={e => setTimeIn(e.target.value)}
              required className="input-glass"
            />
          </div>
          <div>
            <label className="label" htmlFor="ts-timeout">Jam Pulang</label>
            <input
              id="ts-timeout" name="time_out" type="time"
              value={timeOut} onChange={e => setTimeOut(e.target.value)}
              required className="input-glass"
            />
          </div>
        </div>

        {/* Work hours indicator */}
        {workHours > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.625rem 0.875rem',
              borderRadius: '0.5rem',
              background: showReason ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.08)',
              border: `1px solid ${showReason ? 'rgba(239,68,68,0.25)' : 'rgba(16,185,129,0.25)'}`,
              fontSize: '0.875rem',
              color: showReason ? '#dc2626' : '#059669',
            }}
          >
            <Clock size={15} style={{ flexShrink: 0 }} />
            <span>
              Total jam kerja: <strong>{workHours.toFixed(1)} jam</strong>
              {showReason && ' — Kurang dari standar 8 jam'}
            </span>
          </motion.div>
        )}

        {/* Soft Warning — Alasan */}
        <AnimatePresence>
          {showReason && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              style={{ overflow: 'hidden' }}
            >
              <div className="alert-warning" style={{ marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.25rem' }}>
                  <AlertTriangle size={15} />
                  <strong>Peringatan Jam Kerja</strong>
                </div>
                Jam kerja Anda kurang dari 8 jam. Mohon isi alasan kekurangan jam di bawah ini.
              </div>
              <label className="label" htmlFor="ts-reason" style={{ color: '#d97706' }}>
                Alasan/Keterangan Kekurangan Jam <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <textarea
                id="ts-reason"
                name="short_hours_reason"
                rows={2}
                placeholder="Contoh: Izin pulang awal karena keperluan keluarga..."
                required={showReason}
                className="input-glass error"
                defaultValue={editEntry?.short_hours_reason ?? ''}
                style={{ resize: 'vertical' }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Status */}
        <div>
          <label className="label" htmlFor="ts-status">Status Kehadiran</label>
          <select id="ts-status" name="status" className="input-glass" defaultValue={editEntry?.status ?? 'Hadir'}>
            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Project */}
        <div>
          <label className="label" htmlFor="ts-project">Proyek</label>
          <select id="ts-project" name="project_id" className="input-glass" defaultValue={editEntry?.project_id ?? ''}>
            <option value="">— Pilih Proyek —</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>
                [{p.project_code}] {p.project_name} — {p.cluster_name} / {p.app_name}
              </option>
            ))}
          </select>
        </div>

        {/* Activity */}
        <div>
          <label className="label" htmlFor="ts-activity">Kegiatan / Deskripsi</label>
          <textarea
            id="ts-activity" name="activity_desc"
            rows={3}
            placeholder="Jelaskan kegiatan yang dikerjakan hari ini..."
            className="input-glass"
            defaultValue={editEntry?.activity_desc ?? ''}
            style={{ resize: 'vertical' }}
          />
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', paddingTop: '0.5rem' }}>
          {onClose && (
            <button type="button" onClick={onClose} className="btn btn-secondary">
              <X size={16} /> Batal
            </button>
          )}
          <motion.button
            type="submit"
            className="btn btn-primary"
            disabled={isPending}
            whileHover={{ scale: isPending ? 1 : 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {isPending ? (
              <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Menyimpan...</>
            ) : (
              <><Save size={16} /> {editEntry ? 'Perbarui' : 'Simpan Entri'}</>
            )}
          </motion.button>
        </div>
      </div>
    </form>
  )
}
