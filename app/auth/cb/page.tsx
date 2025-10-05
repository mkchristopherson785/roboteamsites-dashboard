// app/auth/cb/page.tsx
'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function AuthCallbackPage() {
  const router = useRouter()
  const params = useSearchParams()

  useEffect(() => {
    (async () => {
      try {
        // 1) Try to read tokens from the hash fragment (magic link flow)
        const hash = typeof window !== 'undefined' ? window.location.hash : ''
        const search = new URLSearchParams(hash.replace(/^#/, ''))
        const access_token = search.get('access_token')
        const refresh_token = search.get('refresh_token')

        if (access_token && refresh_token) {
          // Optional: set client-side session so supabase-js is aware
          await supabase.auth.setSession({ access_token, refresh_token })

          // Tell the server to set httpOnly cookies (for SSR)
          await fetch('/auth/session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ access_token, refresh_token }),
          })

          router.replace('/dashboard')
          return
        }

        // 2) Otherwise, handle OAuth/PKCE code in the querystring
        const code = params.get('code')
        const errorDesc = params.get('error_description')
        if (errorDesc) {
          router.replace(`/login?error=${encodeURIComponent(errorDesc)}`)
          return
        }

        if (code) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(window.location.href)
          if (error) throw error

          const at = data.session?.access_token
          const rt = data.session?.refresh_token
          if (at && rt) {
            await fetch('/auth/session', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ access_token: at, refresh_token: rt }),
            })
          }

          router.replace('/dashboard')
          return
        }

        // 3) No recognizable params
        router.replace('/login?error=Missing+auth+params')
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Auth error'
        router.replace(`/login?error=${encodeURIComponent(msg)}`)
      }
    })()
  }, [router, params])

  return <p style={{padding:20,fontFamily:'system-ui'}}>Signing you in…</p>
}