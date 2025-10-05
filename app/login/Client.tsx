// app/login/client.tsx (unchanged except dynamic origin)
'use client'
import { FormEvent, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function LoginClient() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true); setMsg(null)
    const origin = typeof window !== 'undefined' ? window.location.origin : process.env.NEXT_PUBLIC_SITE_URL
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${origin}/auth/cb` }
    })
    setLoading(false)
    setMsg(error ? error.message : 'Check your email for the sign-in link.')
  }

  return (/* …form UI… */)
}