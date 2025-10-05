// app/dashboard/page.tsx
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

type Team = { id: string; name: string; created_at: string }
type Site = {
  id: string
  name: string
  subdomain: string
  team_id: string
  vercel_url: string | null
}

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

export default async function DashboardPage() {
  // In Next 15, cookies() can be Promise-typed in RSC contexts → await it
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => cookieStore.get(name)?.value,
        set: (name: string, value: string, options: CookieOptions) => {
          try { cookieStore.set(name, value, options) } catch { /* noop in RSC */ }
        },
        remove: (name: string, options: CookieOptions) => {
          try { cookieStore.set(name, '', { ...options, maxAge: 0 }) } catch { /* noop */ }
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: teams = [] } = (await supabase
    .from('teams')
    .select('id,name,created_at')
    .order('created_at', { ascending: false })) as { data: Team[] | null }

  const { data: sites = [] } = (await supabase
    .from('sites')
    .select('id,name,subdomain,team_id,vercel_url,created_at')
    .order('created_at', { ascending: false })) as {
      data: (Site & { created_at: string })[] | null
    }

  return (
    <main style={{ maxWidth: 900, margin: '3rem auto', fontFamily: 'system-ui', lineHeight: 1.4 }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0 }}>Dashboard</h1>
          <p style={{ color: '#888', margin: 0 }}>build: v9</p>
          <p style={{ margin: '6px 0 0' }}>Signed in as <b>{user.email}</b></p>
        </div>
        <a href="/auth/signout" style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: 8, textDecoration: 'none' }}>
          Sign out
        </a>
      </header>

      <section style={{ marginTop: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ margin: '0 0 8px' }}>Your Teams</h2>
          <a href="/teams/new" style={{ fontWeight: 600, textDecoration: 'none' }}>+ New Team</a>
        </div>
        {teams.length === 0 ? (
          <p style={{ color: '#555' }}>You’re not in any teams yet. Create one to get started.</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 12 }}>
            {teams.map(t => (
              <li key={t.id} style={{ border: '1px solid #e6e6e6', borderRadius: 12, padding: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{t.name}</div>
                    <div style={{ fontSize: 12, color: '#666' }}>Team ID: {t.id}</div>
                  </div>
                  <a href={`/teams/${t.id}`} style={{ textDecoration: 'none' }}>Open →</a>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section style={{ marginTop: 36 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ margin: '0 0 8px' }}>Your Sites</h2>
          <a href="/sites/new" style={{ fontWeight: 600, textDecoration: 'none' }}>+ New Site</a>
        </div>
        {sites.length === 0 ? (
          <p style={{ color: '#555' }}>No sites yet. Create one and publish with one click.</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 12 }}>
            {sites.map(s => (
              <li key={s.id} style={{ border: '1px solid #e6e6e6', borderRadius: 12, padding: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{s.name}</div>
                    <div style={{ fontSize: 12, color: '#666' }}>
                      Subdomain: <code>{s.subdomain}</code> · Team: <code>{s.team_id}</code>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 12 }}>
                    {s.vercel_url && <a href={s.vercel_url} target="_blank" rel="noreferrer">View Live</a>}
                    <a href={`/sites/${s.id}`}>Manage →</a>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}
