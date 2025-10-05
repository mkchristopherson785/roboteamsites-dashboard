// app/teams/new/page.tsx
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

export default async function NewTeamPage() {
  async function createTeam(formData: FormData) {
    'use server'
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get: (name: string) => cookieStore.get(name)?.value,
          set: (name: string, value: string, options: CookieOptions) => {
            try { cookieStore.set(name, value, options) } catch {}
          },
          remove: (name: string, options: CookieOptions) => {
            try { cookieStore.set(name, '', { ...options, maxAge: 0 }) } catch {}
          },
        },
      }
    )

    const { data: { user }, error: userErr } = await supabase.auth.getUser()
    if (userErr || !user) redirect('/login')

    const name = (formData.get('name') as string)?.trim()
    if (!name) return { ok: false, message: 'Team name is required.' }

    // 1) create team with owner=user.id
    const { data: team, error: tErr } = await supabase
      .from('teams')
      .insert({ name, owner: user.id })
      .select('id')
      .single()

    if (tErr || !team) {
      return { ok: false, message: tErr?.message ?? 'Failed to create team.' }
    }

    // 2) add membership as owner
    const { error: mErr } = await supabase
      .from('team_members')
      .insert({ team_id: team.id, user_id: user.id, role: 'owner' })

    if (mErr) {
      // not fatal for redirect, but helpful if you want to show message
      return { ok: false, message: mErr.message }
    }

    redirect('/dashboard')
  }

  return (
    <main style={{maxWidth:520, margin:'3rem auto', fontFamily:'system-ui'}}>
      <h1 style={{marginBottom:8}}>Create a Team</h1>
      <p style={{marginTop:0, color:'#555'}}>You’ll be the owner. You can invite members later.</p>

      <form action={createTeam} style={{display:'grid', gap:12, marginTop:16}}>
        <label style={{display:'grid', gap:6}}>
          <span>Team name</span>
          <input
            name="name"
            type="text"
            required
            placeholder="e.g., Robo Rhinos"
            style={{padding:10, fontSize:16, border:'1px solid #ddd', borderRadius:8}}
          />
        </label>
        <button
          type="submit"
          style={{padding:'10px 12px', fontSize:16, border:'1px solid #0b6', background:'#0b6', color:'#fff', borderRadius:8}}
        >
          Create Team
        </button>
      </form>
    </main>
  )
}