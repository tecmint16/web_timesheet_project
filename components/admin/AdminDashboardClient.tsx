'use client'

import { useTransition } from 'react'
import { motion } from 'framer-motion'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import {
  Users, Clock, CheckSquare, Database, Loader2, AlertTriangle,
} from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { updateLeaveStatus } from '@/app/actions/admin'
import { useState } from 'react'

const CHART_COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#84cc16']

interface AdminDashboardClientProps {
  stats: { totalUsers: number; pendingLeave: number; totalProjects: number }
  shiftChartData: { name: string; value: number }[]
  appChartData: { name: string; value: number }[]
  recentLeave: Array<{
    id: string; leave_type: string; status: string; total_days: number;
    start_date: string; end_date: string; created_at: string;
    profiles: { full_name: string; npp: string } | null
  }>
}

export function AdminDashboardClient({
  stats, shiftChartData, appChartData, recentLeave,
}: AdminDashboardClientProps) {
  const [actionError, setActionError] = useState<string | null>(null)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleLeaveAction = (id: string, status: 'Approved' | 'Rejected') => {
    setProcessingId(id)
    setActionError(null)
    startTransition(async () => {
      const result = await updateLeaveStatus(id, status)
      if (result.error) setActionError(result.error)
      setProcessingId(null)
    })
  }

  const statCards = [
    { label: 'Total Karyawan Aktif', value: stats.totalUsers, icon: <Users size={22} />, color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
    { label: 'Cuti Menunggu Persetujuan', value: stats.pendingLeave, icon: <CheckSquare size={22} />, color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
    { label: 'Proyek Aktif', value: stats.totalProjects, icon: <Database size={22} />, color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '1200px' }}>
      <div>
        <h1 className="page-title">Monitoring Dashboard</h1>
        <p className="text-muted" style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>
          Data 30 hari terakhir. Diperbarui setiap kali halaman dimuat.
        </p>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        {statCards.map(s => (
          <div key={s.label} className="glass-card" style={{ padding: '1.25rem' }}>
            <div style={{
              width: '44px', height: '44px', borderRadius: '12px',
              background: s.bg, color: s.color,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: '0.875rem',
            }}>{s.icon}</div>
            <div className="stat-number" style={{ color: s.color }}>{s.value}</div>
            <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--fg)', marginTop: '0.375rem' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
        {/* Bar chart — Shift distribution */}
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <h2 className="section-title" style={{ marginBottom: '1.25rem' }}>
            Distribusi Shifting Pegawai (30 Hari)
          </h2>
          {shiftChartData.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted)', fontSize: '0.875rem' }}>
              Belum ada data timesheet.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={shiftChartData} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--muted)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--muted)' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    background: 'var(--surface)', border: '1px solid var(--border-color)',
                    borderRadius: '8px', fontSize: '13px', color: 'var(--fg)',
                  }}
                  cursor={{ fill: 'rgba(99,102,241,0.08)' }}
                />
                <Bar dataKey="value" name="Entri" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                  {shiftChartData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Pie chart — App allocation */}
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <h2 className="section-title" style={{ marginBottom: '1.25rem' }}>
            Alokasi Waktu per Aplikasi (30 Hari)
          </h2>
          {appChartData.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted)', fontSize: '0.875rem' }}>
              Belum ada data proyek.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={appChartData}
                  dataKey="value"
                  nameKey="name"
                  cx="40%"
                  cy="50%"
                  outerRadius={85}
                  innerRadius={40}
                  paddingAngle={2}
                >
                  {appChartData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: 'var(--surface)', border: '1px solid var(--border-color)',
                    borderRadius: '8px', fontSize: '13px', color: 'var(--fg)',
                  }}
                />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: '12px', color: 'var(--muted)' }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Recent leave queue */}
      <div className="glass-card" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <h2 className="section-title">Antrian Cuti Terbaru</h2>
          <a href="/admin/leave-verify" style={{ fontSize: '0.8rem', color: '#3b82f6', fontWeight: 600, textDecoration: 'none' }}>
            Lihat semua →
          </a>
        </div>

        {actionError && (
          <div className="alert-danger" style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem' }}>
            <AlertTriangle size={16} /> {actionError}
          </div>
        )}

        {recentLeave.length === 0 ? (
          <p className="text-muted" style={{ textAlign: 'center', padding: '2rem' }}>Tidak ada antrian cuti.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table-glass">
              <thead>
                <tr>
                  <th>Karyawan</th>
                  <th>NPP</th>
                  <th>Jenis Cuti</th>
                  <th>Periode</th>
                  <th>Hari</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {recentLeave.map(lr => {
                  const isPendingRow = lr.status === 'Pending_Approval'
                  return (
                    <tr key={lr.id}>
                      <td style={{ fontWeight: 600 }}>{lr.profiles?.full_name ?? '—'}</td>
                      <td style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>{lr.profiles?.npp ?? '—'}</td>
                      <td>{lr.leave_type}</td>
                      <td style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                        {formatDate(lr.start_date, { day: '2-digit', month: 'short' })} —{' '}
                        {formatDate(lr.end_date, { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td style={{ fontWeight: 700 }}>{lr.total_days}</td>
                      <td>
                        <span className={`badge ${
                          lr.status === 'Approved' ? 'badge-approved'
                          : lr.status === 'Rejected' ? 'badge-rejected'
                          : lr.status === 'Pending_Approval' ? 'badge-pending'
                          : 'badge-draft'
                        }`}>
                          {lr.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td>
                        {isPendingRow && (
                          <div style={{ display: 'flex', gap: '0.375rem' }}>
                            <button
                              onClick={() => handleLeaveAction(lr.id, 'Approved')}
                              disabled={processingId === lr.id}
                              className="btn btn-success"
                              style={{ padding: '0.3rem 0.625rem', fontSize: '0.75rem' }}
                            >
                              {processingId === lr.id
                                ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
                                : '✓ Setuju'}
                            </button>
                            <button
                              onClick={() => handleLeaveAction(lr.id, 'Rejected')}
                              disabled={processingId === lr.id}
                              className="btn btn-danger"
                              style={{ padding: '0.3rem 0.625rem', fontSize: '0.75rem' }}
                            >
                              ✗ Tolak
                            </button>
                          </div>
                        )}
                        {!isPendingRow && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
