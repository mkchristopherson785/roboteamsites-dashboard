// app/sites/new/page.tsx
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createServerClient } from '@supabase/ssr'

type Team = { id: string; name: string }

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

export default async function NewSitePage() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (n: string) => cookieStore.get(n)?.value,
        set: (n: string, v: string, o: any) => { try { cookieStore.set(n, v, o) } catch {} },
        remove: (n: string, o: any) => { try { cookieStore.set(n, '', { ...o, maxAge: 0 }) } catch {} },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Null-safe teams fetch
  const { data: teamsRaw } = await supabase
    .from('teams')
    .select('id,name')
    .order('created_at', { ascending: false })

  const teams: Team[] = teamsRaw ?? []

  async function createSite(formData: FormData) {
    'use server'
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get: (n: string) => cookieStore.get(n)?.value,
          set: (n: string, v: string, o: any) => { try { cookieStore.set(n, v, o) } catch {} },
          remove: (n: string, o: any) => { try { cookieStore.set(n, '', { ...o, maxAge: 0 }) } catch {} },
        },
      }
    )

    const name = (formData.get('name') as string | null)?.trim() ?? ''
    const subdomain = (formData.get('subdomain') as string | null)?.trim().toLowerCase() ?? ''
    const team_id = (formData.get('team_id') as string | null) ?? ''

    if (!name || !subdomain || !team_id) {
      redirect('/sites/new?error=' + encodeURIComponent('All fields are required'))
    }

    const { data: site, error } = await supabase
      .from('sites')
      .insert({ name, subdomain, team_id })
      .select('id')
      .single()

    if (error || !site) {
      redirect('/sites/new?error=' + encodeURIComponent(error?.message ?? 'Failed to create site'))
    }

    // Seed default site_content
    await supabase.from('site_content').insert({
      site_id: site.id,
      data: {
        team: { name, number: '', school: '', city: '', state: '' },
        links: [],
        theme: {
          background: '#f5f7f6',
          card: '#ffffff',
          text: '#18241d',
          headline: '#0b1f16',
          footerText: '#c9e6da',
          accent: '#0f8a5f',
          headerBg: '#ffffff',
          headerText: '#0b1f16',
          buttonText: '#ffffff',
          underlineLinks: true,
        },
        sponsors: { platinum: [], gold: [], silver: [], bronze: [] }
      }
    })

    redirect('/dashboard')
  }

  return (
    <main style={{maxWidth:560, margin:'3rem auto', fontFamily:'system-ui'}}>
      <h1>Create a Site</h1>
      <form action={createSite} style={{display:'grid', gap:12, marginTop:12}}>
        <label style={{display:'grid', gap:6}}>
          <span>Site name</span>
          <input name="name" required style={{padding:10, border:'1px solid #ddd', borderRadius:8}} />
        </label>

        <label style={{display:'grid', gap:6}}>
          <span>Subdomain (letters, numbers, hyphens)</span>
          <input
            name="subdomain"
            pattern="[a-z0-9-]+"
            required
            style={{padding:10, border:'1px solid #ddd', borderRadius:8}}
          />
        </label>

        <label style={{display:'grid', gap:6}}>
          <span>Team</span>
          <select name="team_id" required style={{padding:10, border:'1px solid #ddd', borderRadius:8}}>
            <option value="">Select a team…</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </label>

        <button
          style={{
            padding:'10px 12px',
            border:'1px solid #0b6',
            background:'#0b6',
            color:'#fff',
            borderRadius:8
          }}
        >
          Create site
        </button>
      </form>
    </main>
  )
}