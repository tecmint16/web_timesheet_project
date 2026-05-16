import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '@/types/database.types'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  // Public routes — no auth required
  const publicRoutes = ['/login', '/auth/callback']
  if (publicRoutes.some((r) => pathname.startsWith(r))) {
    if (user && pathname === '/login') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    return supabaseResponse
  }

  // Unauthenticated — redirect to login
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // ─── IMPORTANT: Server Actions use POST + 'Next-Action' header ───────────
  // Redirecting a Server Action request breaks the JSON protocol and causes
  // "An unexpected response was received from the server" on the client.
  // Auth is already verified above (user exists). Let actions through.
  const isServerAction = request.method === 'POST' &&
    request.headers.has('next-action')

  if (isServerAction) {
    return supabaseResponse
  }
  // ─────────────────────────────────────────────────────────────────────────

  // Change-password page is accessible without further checks
  if (pathname.startsWith('/change-password')) {
    return supabaseResponse
  }

  // Check must_change_password flag — graceful fallback if column missing
  try {
    const { data: profileData } = await supabase
      .from('profiles')
      .select('role, must_change_password')
      .eq('id', user.id)
      .single()

    const profile = profileData as { role: string; must_change_password: boolean } | null

    if (profile?.must_change_password === true) {
      return NextResponse.redirect(new URL('/change-password', request.url))
    }

    // Admin routes — check role
    if (pathname.startsWith('/admin')) {
      if (!profile || !['admin', 'Admin'].includes(profile.role)) {
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
    }
  } catch {
    // If the profile query fails (e.g. column not yet migrated),
    // allow the request through — page-level guards will handle auth.
  }

  return supabaseResponse
}
