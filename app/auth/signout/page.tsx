'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function SignOutPage() {
  const router = useRouter()
  useEffect(() => { (async () => { try{ await supabase.auth.signOut() }catch{}; router.replace('/') })() }, [router])
  return <p style={{padding:20,fontFamily:'system-ui'}}>Signing out…</p>
}