'use client'

import { FormEvent, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMsg(null)
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback` }
    })
    setLoading(false)
    setMsg(error ? error.message : 'Check your email for the sign-in link.')
  }

  return (
    <main style={{maxWidth:420, margin:'4rem auto', fontFamily:'system-ui'}}>
      <h1>Sign in</h1>
      <form onSubmit={onSubmit} style={{display:'grid', gap:12}}>
        <input type="email" value={email} onChange={e=>setEmail(e.target.value)} required />
        <button disabled={loading}>{loading ? 'Sending…' : 'Send magic link'}</button>
      </form>
      {msg && <p style={{marginTop:12}}>{msg}</p>}
    </main>
  )
}