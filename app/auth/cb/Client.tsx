'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function ClientCallback() {
  const router = useRouter()
  useEffect(() => {
    (async () => {
      const url = new URL(window.location.href)
      const err = url.searchParams.get('error_description')
      const code = url.searchParams.get('code')
      if (err) { alert(`Login error: ${err}`); router.replace('/login'); return }
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(window.location.href)
        if (error) { alert(`Login failed: ${error.message}`); router.replace('/login'); return }
      }
      router.replace('/')
    })()
  }, [router])
  return <p style={{ padding: 20, fontFamily: 'system-ui' }}>Signing you in…</p>
}