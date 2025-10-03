'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function AuthCallback() {
  const router = useRouter()
  const params = useSearchParams()

  useEffect(() => {
    (async () => {
      const errorDesc = params.get('error_description')
      // Supabase sends ?code=... on success
      const code = params.get('code')

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

      // success → send them somewhere (home or dashboard)
      router.replace('/')
    })()
  }, [router, params])

  return <p style={{padding:20,fontFamily:'system-ui'}}>Signing you in…</p>
}