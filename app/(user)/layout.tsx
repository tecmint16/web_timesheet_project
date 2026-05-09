import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/Sidebar'
import { Navbar } from '@/components/layout/Navbar'
import type { Profile } from '@/types/database.types'

// Title map per route
const ROUTE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/timesheet': 'Input Timesheet',
  '/leave': 'Pengajuan Cuti',
  '/history': 'Riwayat',
}

function getTitle(pathname: string): string {
  return ROUTE_TITLES[pathname] ?? 'Portal Karyawan'
}

export default async function UserLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profileRaw } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profileRaw) redirect('/login')
  const profile = profileRaw as Profile

  // Block admin from user portal (they have /admin)
  // But allow admin to view user portal too if needed

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar profile={profile as Profile} />

      {/* Main content — offset by sidebar width (240px default) */}
      <div style={{
        flex: 1,
        marginLeft: '240px',
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
        transition: 'margin-left 0.3s ease',
      }}>
        <Navbar profile={profile as Profile} title="Portal Karyawan" />
        <main style={{ flex: 1, padding: '1.5rem' }}>
          {children}
        </main>
      </div>
    </div>
  )
}
