// app/auth/cb/route.ts
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

type OtpType = 'magiclink' | 'recovery' | 'invite' | 'email_change'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const errorDesc = url.searchParams.get('error_description')
  const code = url.searchParams.get('code') // OAuth (PKCE) flow
  const token_hash = url.searchParams.get('token_hash') // Magic link/OTP flow
  const typeParam = url.searchParams.get('type') as OtpType | null

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => cookieStore.get(name)?.value,
        set: (name: string, value: string, options: CookieOptions) => {
          try { cookieStore.set(name, value, options) } catch { /* noop */ }
        },
        remove: (name: string, options: CookieOptions) => {
          try { cookieStore.set(name, '', { ...options, maxAge: 0 }) } catch { /* noop */ }
        },
      },
    }
  )

  if (errorDesc) {
    return NextResponse.redirect(
      `${url.origin}/login?error=${encodeURIComponent(errorDesc)}`
    )
  }

  try {
    if (code) {
      // OAuth (e.g., Google) → exchange code for session and set cookies
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      if (error) throw error
    } else if (token_hash && typeParam) {
      // Magic link / OTP route
      const { error } = await supabase.auth.verifyOtp({
        type: typeParam,
        token_hash,
      })
      if (error) throw error
    } else {
      // No recognizable params
      return NextResponse.redirect(
        `${url.origin}/login?error=Missing+auth+params`
      )
    }
  } catch (e: unknown) {
    const msg =
      e instanceof Error ? e.message : typeof e === 'string' ? e : 'Auth error'
    return NextResponse.redirect(
      `${url.origin}/login?error=${encodeURIComponent(msg)}`
    )
  }

  // Success → cookies are set server-side, route to dashboard
  return NextResponse.redirect(`${url.origin}/dashboard`)
}