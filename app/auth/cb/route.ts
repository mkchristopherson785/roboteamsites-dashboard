// app/auth/cb/route.ts
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const errorDesc = url.searchParams.get('error_description')

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => cookieStore.get(name)?.value,
        set: (name: string, value: string, options: CookieOptions) => {
          try { cookieStore.set(name, value, options) } catch {}
        },
        remove: (name: string, options: CookieOptions) => {
          try { cookieStore.set(name, '', { ...options, maxAge: 0 }) } catch {}
        },
      },
    }
  )

  if (errorDesc) {
    return NextResponse.redirect(`${url.origin}/login?error=${encodeURIComponent(errorDesc)}`)
  }

  if (code) {
    // Exchange the code for a session. This sets the auth cookies via the cookie helpers above.
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      return NextResponse.redirect(`${url.origin}/login?error=${encodeURIComponent(error.message)}`)
    }
  }

  // All good: go to the dashboard (now the server will see the cookies).
  return NextResponse.redirect(`${url.origin}/dashboard`)
}