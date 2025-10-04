'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

// Prevent static prerendering/caching shenanigans on this page
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default function AuthCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    (async () => {
      // Read params without useSearchParams()
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

      // Success → send to home or dashboard
      router.replace('/')
    })()
  }, [router])

  return <p style={{ padding: 20, fontFamily: 'system-ui' }}>Signing you in…</p>
}