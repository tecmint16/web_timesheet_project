import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { formatDate, formatTime, calcWorkHours } from '@/lib/utils'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Riwayat' }

export default async function HistoryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  type TimesheetRow = {
    id: string; log_date: string; shift_type: string; time_in: string; time_out: string;
    status: string; is_locked: boolean;
    master_projects: { project_name: string; project_code: string } | null
  }
  type LeaveRow = {
    id: string; leave_type: string; status: string; total_days: number;
    start_date: string; end_date: string; created_at: string;
    signed_scan_url: string | null
  }

  const { data: timesheetsRaw } = await supabase
    .from('timesheets')
    .select('*, master_projects(project_name, project_code)')
    .eq('profile_id', user.id)
    .order('log_date', { ascending: false })
    .limit(100)

  const timesheets = (timesheetsRaw ?? []) as TimesheetRow[]

  const { data: leaveRequestsRaw } = await supabase
    .from('leave_requests')
    .select('*')
    .eq('profile_id', user.id)
    .order('created_at', { ascending: false })

  const leaveRequests = (leaveRequestsRaw ?? []) as LeaveRow[]

  // Group timesheets by month
  const grouped: Record<string, TimesheetRow[]> = {}
  for (const ts of timesheets) {
    const month = ts.log_date.substring(0, 7) // YYYY-MM
    if (!grouped[month]) grouped[month] = []
    grouped[month]!.push(ts)
  }

  const statusConfig: Record<string, string> = {
    Draft: 'badge badge-draft',
    Pending_Approval: 'badge badge-pending',
    Approved: 'badge badge-approved',
    Rejected: 'badge badge-rejected',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '1100px' }}>
      <div>
        <h1 className="page-title">Riwayat</h1>
        <p className="text-muted" style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>
          Rekap seluruh timesheet dan cuti Anda.
        </p>
      </div>

      {/* Timesheet history */}
      <div className="glass-card" style={{ padding: '1.5rem' }}>
        <h2 className="section-title" style={{ marginBottom: '1.25rem' }}>Riwayat Timesheet</h2>
        {Object.keys(grouped).length === 0 ? (
          <p className="text-muted" style={{ textAlign: 'center', padding: '2rem' }}>Belum ada data timesheet.</p>
        ) : (
          Object.entries(grouped)
            .sort((a, b) => b[0].localeCompare(a[0]))
            .map(([month, entries]) => {
              const totalHours = (entries ?? []).reduce((acc, e) => {
                return acc + calcWorkHours(e.time_in, e.time_out)
              }, 0)
              const [yr, mn] = month.split('-')
              const monthLabel = new Date(`${yr}-${mn}-01`).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })

              return (
                <div key={month} style={{ marginBottom: '1.5rem' }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    marginBottom: '0.75rem',
                  }}>
                    <h3 style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--fg)' }}>{monthLabel}</h3>
                    <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: 'var(--muted)' }}>
                      <span>{entries?.length} hari</span>
                      <span style={{ fontWeight: 700, color: '#3b82f6' }}>{totalHours.toFixed(1)} jam</span>
                    </div>
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table className="table-glass">
                      <thead>
                        <tr>
                          <th>Tanggal</th>
                          <th>Shift</th>
                          <th>Masuk</th>
                          <th>Pulang</th>
                          <th>Jam Kerja</th>
                          <th>Status</th>
                          <th>Proyek</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(entries ?? []).map(e => {
                          const hours = calcWorkHours(e.time_in, e.time_out)
                          const short = hours < 8
                          return (
                            <tr key={e.id}>
                              <td style={{ whiteSpace: 'nowrap', fontWeight: 600 }}>
                                {formatDate(e.log_date, { day: '2-digit', month: 'short' })}
                              </td>
                              <td style={{ fontSize: '0.8rem' }}>{e.shift_type}</td>
                              <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{formatTime(e.time_in)}</td>
                              <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{formatTime(e.time_out)}</td>
                              <td>
                                <span style={{
                                  fontWeight: 700, fontSize: '0.875rem',
                                  color: short ? '#ef4444' : '#10b981',
                                }}>
                                  {hours.toFixed(1)}j{short && ' ⚠'}
                                </span>
                              </td>
                              <td>
                                <span className={`badge ${e.status === 'Hadir' ? 'badge-approved' : 'badge-pending'}`}>
                                  {e.status}
                                </span>
                              </td>
                              <td style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
                                {(e as any).master_projects?.project_code ?? '—'}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            })
        )}
      </div>

      {/* Leave history */}
      <div className="glass-card" style={{ padding: '1.5rem' }}>
        <h2 className="section-title" style={{ marginBottom: '1.25rem' }}>Riwayat Cuti</h2>
        {!leaveRequests || leaveRequests.length === 0 ? (
          <p className="text-muted" style={{ textAlign: 'center', padding: '2rem' }}>Belum ada pengajuan cuti.</p>
        ) : (
          <table className="table-glass">
            <thead>
              <tr>
                <th>Jenis Cuti</th>
                <th>Mulai</th>
                <th>Selesai</th>
                <th>Hari</th>
                <th>Status</th>
                <th>Scan TTD</th>
                <th>Diajukan</th>
              </tr>
            </thead>
            <tbody>
              {leaveRequests.map(lr => (
                <tr key={lr.id}>
                  <td style={{ fontWeight: 600 }}>{lr.leave_type}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{formatDate(lr.start_date, { day: '2-digit', month: 'short' })}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{formatDate(lr.end_date, { day: '2-digit', month: 'short' })}</td>
                  <td style={{ fontWeight: 700 }}>{lr.total_days}</td>
                  <td><span className={statusConfig[lr.status] ?? 'badge badge-draft'}>{lr.status.replace('_', ' ')}</span></td>
                  <td>
                    {lr.signed_scan_url
                      ? <a href={lr.signed_scan_url} target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6', fontSize: '0.8rem' }}>Lihat ↗</a>
                      : <span style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>Belum upload</span>}
                  </td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{formatDate(lr.created_at, { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
