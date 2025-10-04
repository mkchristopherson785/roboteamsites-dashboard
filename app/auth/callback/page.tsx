'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

// prevent prerendering/caching on this page
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default function AuthCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    (async () => {
      const url = new URL(window.location.href)
      const errorDesc = url.searchParams.get('error_description')
      const code = url.searchParams.get('code')

      if (errorDesc) {
        console.error('Supabase auth error:', errorDesc)
        alert(`Login error: ${errorDesc}`)
        router.replace('/login')
        return
      }

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(window.location.href)
        if (error) {
          console.error('Exchange error:', error)
          alert(`Login failed: ${error.message}`)
          router.replace('/login')
          return
        }
      }

      router.replace('/') // success → home or dashboard
    })()
  }, [router])

  return <p style={{ padding: 20, fontFamily: 'system-ui' }}>Signing you in…</p>
}