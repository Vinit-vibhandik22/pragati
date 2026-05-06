import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
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

  // 1. Allow public landing page, login, and auth-related paths
  if (
    request.nextUrl.pathname === '/' || 
    request.nextUrl.pathname.startsWith('/api') ||
    request.nextUrl.pathname.startsWith('/login') ||
    request.nextUrl.pathname.startsWith('/auth') // For supabase auth callback if needed
  ) {
    return supabaseResponse
  }

  const { data: { user } } = await supabase.auth.getUser()
  const isDemoSession = request.cookies.get('pragati_demo_session')?.value === 'true'

  // Protected paths logic
  if (!user && !isDemoSession) {
    const url = request.nextUrl.clone()
    if (request.nextUrl.pathname.startsWith('/farmer')) {
      url.pathname = '/login/farmer'
    } else {
      url.pathname = '/login/official'
    }
    return NextResponse.redirect(url)
  }

  // If we have a user, ensure they are in the right portal
  if (user && !request.nextUrl.pathname.startsWith('/api')) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const role = profile?.role
    const path = request.nextUrl.pathname

    // Role-based path guarding
    if (role === 'farmer' && !path.startsWith('/farmer')) {
      return NextResponse.redirect(new URL('/farmer/dashboard/profile', request.url))
    }
    if (role === 'krushi_sahayak' && !path.startsWith('/ks')) {
      return NextResponse.redirect(new URL('/ks/dashboard', request.url))
    }
    if (role === 'talathi' && !path.startsWith('/talathi')) {
      return NextResponse.redirect(new URL('/talathi/dashboard', request.url))
    }
    if (role === 'gram_sevak' && !path.startsWith('/gs')) {
      return NextResponse.redirect(new URL('/gs/dashboard', request.url))
    }
    if (role === 'tao' && !path.startsWith('/tao')) {
      return NextResponse.redirect(new URL('/tao/dashboard', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
