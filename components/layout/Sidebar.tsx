'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Clock, CalendarDays, History,
  ChevronLeft, ChevronRight, LogOut, Settings,
  ShieldCheck, BarChart3, CheckSquare, Database, FileEdit, Users,
} from 'lucide-react'
import { logout } from '@/app/actions/auth'
import type { Profile } from '@/types/database.types'

interface NavItem {
  href: string
  label: string
  icon: React.ReactNode
}

const userNavItems: NavItem[] = [
  { href: '/dashboard',  label: 'Dashboard',  icon: <LayoutDashboard size={18} /> },
  { href: '/timesheet',  label: 'Timesheet',   icon: <Clock size={18} /> },
  { href: '/leave',      label: 'Pengajuan Cuti', icon: <CalendarDays size={18} /> },
  { href: '/history',    label: 'Riwayat',     icon: <History size={18} /> },
]

const adminNavItems: NavItem[] = [
  { href: '/admin/dashboard',    label: 'Monitoring',      icon: <BarChart3 size={18} /> },
  { href: '/admin/users',        label: 'Manajemen User',  icon: <Users size={18} /> },
  { href: '/admin/leave-verify', label: 'Verifikasi Cuti', icon: <CheckSquare size={18} /> },
  { href: '/admin/master-data',  label: 'Master Data',     icon: <Database size={18} /> },
  { href: '/admin/pdf-editor',   label: 'PDF Editor',      icon: <FileEdit size={18} /> },
]

interface SidebarProps {
  profile: Profile
}

export function Sidebar({ profile }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()
  const isAdmin = ['admin', 'Admin'].includes(profile.role)
  const navItems = isAdmin ? adminNavItems : userNavItems

  return (
    <motion.aside
      animate={{ width: collapsed ? 64 : 240 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="sidebar-glass"
      style={{
        height: '100vh',
        position: 'fixed',
        left: 0, top: 0,
        display: 'flex',
        flexDirection: 'column',
        zIndex: 40,
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      {/* Logo */}
      <div style={{
        padding: '1.25rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        borderBottom: '1px solid var(--border-color)',
        minHeight: '64px',
        flexShrink: 0,
      }}>
        <div style={{
          width: '36px', height: '36px', flexShrink: 0,
          borderRadius: '10px',
          background: 'var(--gradient-brand)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(99,102,241,0.35)',
        }}>
          <Clock size={18} color="white" />
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}
            >
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--fg)', lineHeight: 1.2 }}>
                Fluid Enterprise
              </div>
              <div style={{ fontSize: '0.65rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {isAdmin ? 'Admin Portal' : 'Employee Portal'}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Nav items */}
      <nav style={{ flex: 1, padding: '0.75rem', overflow: 'hidden auto', display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {!collapsed && (
          <div style={{
            fontSize: '0.65rem', fontWeight: 700, color: 'var(--muted)',
            textTransform: 'uppercase', letterSpacing: '0.08em',
            padding: '0.5rem 0.875rem 0.375rem',
          }}>
            {isAdmin ? 'Admin' : 'Menu'}
          </div>
        )}
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-link ${active ? 'active' : ''}`}
              style={{ justifyContent: collapsed ? 'center' : undefined }}
              title={collapsed ? item.label : undefined}
            >
              <span style={{ flexShrink: 0 }}>{item.icon}</span>
              <AnimatePresence>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    style={{ whiteSpace: 'nowrap', overflow: 'hidden' }}
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
          )
        })}

        {/* Switch portal link */}
        {!collapsed && (
          <div style={{ marginTop: 'auto', paddingTop: '1rem' }}>
            <div style={{ height: '1px', background: 'var(--border-color)', margin: '0.75rem 0' }} />
            {isAdmin && (
              <Link href="/dashboard" className="nav-link" style={{ fontSize: '0.8rem' }}>
                <Settings size={16} />
                <span>User Portal</span>
              </Link>
            )}
            {!isAdmin && (
              <div className="nav-link" style={{ opacity: 0.5, cursor: 'default', fontSize: '0.8rem' }}>
                <ShieldCheck size={16} />
                <span>Role: Karyawan</span>
              </div>
            )}
          </div>
        )}
      </nav>

      {/* User + Logout */}
      <div style={{
        borderTop: '1px solid var(--border-color)',
        padding: '0.75rem',
        flexShrink: 0,
      }}>
        {!collapsed && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.625rem',
            padding: '0.5rem 0.625rem', marginBottom: '0.5rem',
          }}>
            <div style={{
              width: '32px', height: '32px', flexShrink: 0,
              borderRadius: '50%',
              background: 'var(--gradient-brand)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.8rem', fontWeight: 700, color: 'white',
            }}>
              {profile.full_name?.charAt(0).toUpperCase() ?? 'U'}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {profile.full_name ?? 'User'}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>
                {profile.npp ?? profile.role}
              </div>
            </div>
          </div>
        )}
        <form action={logout}>
          <motion.button
            type="submit"
            className="nav-link"
            style={{
              width: '100%', justifyContent: collapsed ? 'center' : undefined,
              color: '#ef4444', cursor: 'pointer',
              background: 'rgba(239,68,68,0.08)',
            }}
            whileHover={{ background: 'rgba(239,68,68,0.15)' }}
            title={collapsed ? 'Keluar' : undefined}
          >
            <LogOut size={16} />
            <AnimatePresence>
              {!collapsed && (
                <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  Keluar
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        </form>
      </div>

      {/* Collapse toggle */}
      <motion.button
        onClick={() => setCollapsed(!collapsed)}
        style={{
          position: 'absolute', right: '-12px', top: '72px',
          width: '24px', height: '24px', borderRadius: '50%',
          background: 'var(--surface-alt)',
          border: '1px solid var(--border-color)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', zIndex: 50,
          color: 'var(--muted)',
        }}
        whileHover={{ scale: 1.1, color: '#3b82f6' }}
        whileTap={{ scale: 0.9 }}
        aria-label="Toggle sidebar"
        id="sidebar-toggle-btn"
      >
        {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </motion.button>
    </motion.aside>
  )
}
