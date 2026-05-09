'use client'

import { ThemeToggle } from './ThemeToggle'
import { Bell } from 'lucide-react'
import { motion } from 'framer-motion'
import type { Profile } from '@/types/database.types'

interface NavbarProps {
  profile: Profile
  title: string
}

export function Navbar({ profile, title }: NavbarProps) {
  return (
    <motion.header
      className="navbar-glass"
      initial={{ y: -10, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
      style={{
        position: 'sticky', top: 0, zIndex: 30,
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 1.5rem',
        height: '64px',
      }}
    >
      <div>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--fg)' }}>{title}</h2>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {/* Notification bell */}
        <motion.button
          style={{
            width: '36px', height: '36px', borderRadius: '10px',
            background: 'var(--muted-bg)', border: '1px solid var(--border-color)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: 'var(--muted)', position: 'relative',
          }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          aria-label="Notifications"
          id="notifications-btn"
        >
          <Bell size={16} />
          <span style={{
            position: 'absolute', top: '6px', right: '6px',
            width: '7px', height: '7px', borderRadius: '50%',
            background: '#ef4444', border: '1.5px solid var(--bg)',
          }} />
        </motion.button>

        <ThemeToggle />

        {/* Avatar */}
        <div style={{
          width: '36px', height: '36px', borderRadius: '50%',
          background: 'var(--gradient-brand)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '0.875rem', fontWeight: 700, color: 'white',
          cursor: 'default',
          boxShadow: '0 2px 8px rgba(99,102,241,0.35)',
          flexShrink: 0,
        }}
          title={profile.full_name ?? 'User'}
        >
          {profile.full_name?.charAt(0).toUpperCase() ?? 'U'}
        </div>
      </div>
    </motion.header>
  )
}
