// app/auth/cb/Client.tsx (Client Component)
'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function Client() {
  const router = useRouter()
  const params = useSearchParams()

  useEffect(() => {
    (async () => {
      try {
        // ---- Case A: Magic link (hash fragment tokens) ----
        const hash = typeof window !== 'undefined' ? window.location.hash : ''
        if (hash && hash.includes('access_token=')) {
          const sp = new URLSearchParams(hash.replace(/^#/, ''))
          const access_token = sp.get('access_token') ?? undefined
          const refresh_token = sp.get('refresh_token') ?? undefined

          if (access_token && refresh_token) {
            // Make supabase-js aware (client session)
            await supabase.auth.setSession({ access_token, refresh_token })

            // Ask server to set httpOnly cookies (SSR session)
            await fetch('/auth/session', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ access_token, refresh_token }),
            })

            router.replace('/dashboard')
            return
          }
        }

        // ---- Case B: OAuth/PKCE ?code= ----
        const errorDesc = params.get('error_description')
        if (errorDesc) {
          router.replace(`/login?error=${encodeURIComponent(errorDesc)}`)
          return
        }

        const code = params.get('code')
        if (code) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(window.location.href)
          if (error) {
            router.replace(`/login?error=${encodeURIComponent(error.message)}`)
            return
          }

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

        // Nothing we recognize → back to login
        router.replace('/login?error=Missing+auth+params')
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Auth error'
        router.replace(`/login?error=${encodeURIComponent(msg)}`)
      }
    })()
  }, [router, params])

  return <p style={{padding:20,fontFamily:'system-ui'}}>Signing you in…</p>
}