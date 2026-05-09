import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getGreeting, formatDate } from '@/lib/utils'
import { CalendarDays, Clock, CheckCircle, AlertCircle, TrendingUp } from 'lucide-react'
import type { Metadata } from 'next'
import type { Profile } from '@/types/database.types'

export const metadata: Metadata = { title: 'Dashboard' }

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profileRaw } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profileRaw) redirect('/login')
  const profile = profileRaw as Profile

  // This week's timesheets
  const today = new Date()
  const monday = new Date(today)
  monday.setDate(today.getDate() - today.getDay() + 1)
  const mondayStr = monday.toISOString().split('T')[0]
  const todayStr = today.toISOString().split('T')[0]

  const { data: weekTimesheetsRaw } = await supabase
    .from('timesheets')
    .select('time_in, time_out')
    .eq('profile_id', user.id)
    .gte('log_date', mondayStr)
    .lte('log_date', todayStr)

  const weekTimesheets = (weekTimesheetsRaw ?? []) as { time_in: string; time_out: string }[]

  // Total hours this week
  const totalHoursWeek = weekTimesheets.reduce((acc, ts) => {
    if (!ts.time_in || !ts.time_out) return acc
    const [inH, inM] = ts.time_in.split(':').map(Number)
    const [outH, outM] = ts.time_out.split(':').map(Number)
    let diff = (outH * 60 + outM) - (inH * 60 + inM)
    if (diff < 0) diff += 24 * 60
    return acc + diff / 60
  }, 0)

  // Latest leave requests
  const { data: latestLeaveRaw } = await supabase
    .from('leave_requests')
    .select('*')
    .eq('profile_id', user.id)
    .order('created_at', { ascending: false })
    .limit(3)

  const latestLeave = (latestLeaveRaw ?? []) as {
    id: string; leave_type: string; status: string; total_days: number;
    start_date: string; end_date: string
  }[]

  const greeting = getGreeting()

  const stats = [
    {
      label: 'Sisa Cuti',
      value: profile.leave_balance,
      unit: 'hari',
      icon: <CalendarDays size={22} />,
      color: '#3b82f6',
      bg: 'rgba(59,130,246,0.12)',
      desc: 'dari 12 hari/tahun',
    },
    {
      label: 'Jam Kerja Minggu Ini',
      value: totalHoursWeek.toFixed(1),
      unit: 'jam',
      icon: <Clock size={22} />,
      color: '#8b5cf6',
      bg: 'rgba(139,92,246,0.12)',
      desc: `${weekTimesheets?.length ?? 0} hari tercatat`,
    },
    {
      label: 'Entri Timesheet',
      value: weekTimesheets?.length ?? 0,
      unit: 'entry',
      icon: <TrendingUp size={22} />,
      color: '#10b981',
      bg: 'rgba(16,185,129,0.12)',
      desc: 'minggu berjalan',
    },
    {
      label: 'Pengajuan Cuti',
      value: latestLeave?.length ?? 0,
      unit: 'aktif',
      icon: <CheckCircle size={22} />,
      color: '#f59e0b',
      bg: 'rgba(245,158,11,0.12)',
      desc: 'status terbaru',
    },
  ]

  const statusLabels: Record<string, string> = {
    Draft: 'Draft',
    Pending_Approval: 'Menunggu Persetujuan',
    Approved: 'Disetujui',
    Rejected: 'Ditolak',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '1200px' }}>
      {/* Greeting header */}
      <div className="glass-card" style={{
        padding: '1.75rem',
        background: 'var(--gradient-brand)',
        border: 'none',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', right: '-30px', top: '-30px',
          width: '180px', height: '180px', borderRadius: '50%',
          background: 'rgba(255,255,255,0.08)',
        }} />
        <div style={{
          position: 'absolute', right: '40px', bottom: '-40px',
          width: '120px', height: '120px', borderRadius: '50%',
          background: 'rgba(255,255,255,0.06)',
        }} />
        <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
          {greeting}, 👋
        </p>
        <h1 style={{ color: 'white', fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
          {profile.full_name ?? 'Karyawan'}
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem', marginTop: '0.5rem' }}>
          {formatDate(new Date())} · NPP: {profile.npp ?? '-'}
        </p>
      </div>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        {stats.map((stat) => (
          <div key={stat.label} className="glass-card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div style={{
                width: '44px', height: '44px', borderRadius: '12px',
                background: stat.bg, color: stat.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {stat.icon}
              </div>
            </div>
            <div className="stat-number" style={{ color: stat.color }}>{stat.value}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.125rem' }}>{stat.unit}</div>
            <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--fg)', marginTop: '0.5rem' }}>{stat.label}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.125rem' }}>{stat.desc}</div>
          </div>
        ))}
      </div>

      {/* Recent leave requests */}
      <div className="glass-card" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <h2 className="section-title">Pengajuan Cuti Terbaru</h2>
          <a href="/leave" style={{
            fontSize: '0.8rem', color: '#3b82f6', fontWeight: 600,
            textDecoration: 'none',
          }}>Lihat semua →</a>
        </div>
        {!latestLeave || latestLeave.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '2.5rem',
            color: 'var(--muted)', fontSize: '0.875rem',
          }}>
            <CalendarDays size={36} style={{ margin: '0 auto 0.75rem', opacity: 0.4 }} />
            <p>Belum ada pengajuan cuti</p>
            <a href="/leave" style={{
              color: '#3b82f6', fontWeight: 600, fontSize: '0.875rem',
              textDecoration: 'none', marginTop: '0.5rem', display: 'inline-block',
            }}>
              + Buat pengajuan baru
            </a>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {latestLeave.map((leave) => {
              const badgeClass = {
                Draft: 'badge badge-draft',
                Pending_Approval: 'badge badge-pending',
                Approved: 'badge badge-approved',
                Rejected: 'badge badge-rejected',
              }[leave.status] ?? 'badge badge-draft'

              return (
                <div key={leave.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '0.875rem 1rem',
                  background: 'var(--muted-bg)',
                  borderRadius: '0.625rem',
                  border: '1px solid var(--border-color)',
                }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--fg)' }}>
                      Cuti {leave.leave_type} — {leave.total_days} hari
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.125rem' }}>
                      {formatDate(leave.start_date)} s/d {formatDate(leave.end_date)}
                    </div>
                  </div>
                  <span className={badgeClass}>
                    {statusLabels[leave.status] ?? leave.status}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Announcement */}
      <div className="alert-info" style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
        <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '1px' }} />
        <div>
          <strong style={{ display: 'block', marginBottom: '0.25rem' }}>Pengumuman Internal</strong>
          <span style={{ fontSize: '0.875rem' }}>
            Timesheet tidak memiliki batas waktu pengisian. Anda dapat menambah atau mengedit entri kapan saja sebelum data dikunci oleh Admin untuk rekap bulanan.
          </span>
        </div>
      </div>
    </div>
  )
}
