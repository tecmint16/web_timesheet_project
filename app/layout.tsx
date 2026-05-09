import type { Metadata } from 'next'
import { ThemeProvider } from 'next-themes'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'The Fluid Enterprise — Sistem Manajemen Timesheet & Cuti',
    template: '%s | The Fluid Enterprise',
  },
  description:
    'Sistem manajemen absensi, timesheet harian, dan pengajuan cuti hibrida untuk perusahaan modern.',
  keywords: ['timesheet', 'absensi', 'cuti', 'manajemen SDM', 'HR system'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange={false}
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
