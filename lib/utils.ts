import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Merge Tailwind classes safely */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Calculate work hours between time_in and time_out strings (HH:MM) */
export function calcWorkHours(timeIn: string, timeOut: string): number {
  if (!timeIn || !timeOut) return 0
  const [inH, inM] = timeIn.split(':').map(Number)
  const [outH, outM] = timeOut.split(':').map(Number)
  const inMinutes = inH * 60 + inM
  let outMinutes = outH * 60 + outM
  // Handle overnight shifts
  if (outMinutes < inMinutes) outMinutes += 24 * 60
  return (outMinutes - inMinutes) / 60
}

/** Format date to locale Indonesian format */
export function formatDate(date: string | Date, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    ...options,
  })
}

/** Format time HH:MM from a time string */
export function formatTime(time: string): string {
  if (!time) return '-'
  return time.substring(0, 5)
}

/** Get status badge class */
export function getStatusBadgeClass(status: string): string {
  const map: Record<string, string> = {
    Draft:            'badge badge-draft',
    Pending_Approval: 'badge badge-pending',
    Approved:         'badge badge-approved',
    Rejected:         'badge badge-rejected',
  }
  return map[status] ?? 'badge badge-draft'
}

/** Calculate days between two dates */
export function calcDays(start: string, end: string): number {
  const s = new Date(start)
  const e = new Date(end)
  const diff = e.getTime() - s.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1
}

/** Truncate text */
export function truncate(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) return text
  return text.substring(0, maxLength) + '…'
}

/** Format file size */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** Get greeting based on current hour */
export function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Selamat Pagi'
  if (hour < 15) return 'Selamat Siang'
  if (hour < 18) return 'Selamat Sore'
  return 'Selamat Malam'
}
