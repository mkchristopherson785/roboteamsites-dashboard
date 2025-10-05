'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function AuthCbClient() {
  const router = useRouter()
  const params = useSearchParams()

  useEffect(() => {
    (async () => {
      const errorDesc = params.get('error_description')
      const code = params.get('code')

      if (errorDesc) {
        alert(`Login error: ${errorDesc}`)
        router.replace('/login')
        return
      }

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(window.location.href)
        if (error) {
          alert(`Login failed: ${error.message}`)
          router.replace('/login')
          return
        }
      }

      router.replace('/dashboard') // ← go straight to dashboard
    })()
  }, [router, params])

  return <p style={{padding:20,fontFamily:'system-ui'}}>Signing you in…</p>
}