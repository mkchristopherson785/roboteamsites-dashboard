// app/auth/cb/route.ts
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const errorDesc = url.searchParams.get('error_description')
  const code = url.searchParams.get('code') // OAuth (PKCE) flow
  const token_hash = url.searchParams.get('token_hash') // Magic link/OTP flow
  const type = url.searchParams.get('type') // e.g. 'magiclink', 'recovery', 'invite', etc.

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

  try {
    if (code) {
      // OAuth flow
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      if (error) throw error
    } else if (token_hash && type) {
      // Magic link / OTP flow (e.g., type=magiclink)
      const { error } = await supabase.auth.verifyOtp({ type: type as any, token_hash })
      if (error) throw error
    } else {
      // No recognizable params → send to login
      return NextResponse.redirect(`${url.origin}/login?error=Missing+auth+params`)
    }
  } catch (e: any) {
    return NextResponse.redirect(`${url.origin}/login?error=${encodeURIComponent(e?.message ?? 'Auth error')}`)
  }

  // Success → cookies are set server-side, route to dashboard
  return NextResponse.redirect(`${url.origin}/dashboard`)
}