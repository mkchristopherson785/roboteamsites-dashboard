// app/teams/[id]/page.tsx
import { cookies } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import Link from 'next/link'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

type Team = { id: string; name: string; owner: string }
type MemberRow = {
  user_id: string
  role: string
  // Supabase might return an object OR an array for the join depending on FK setup
  users?: { email: string | null } | { email: string | null }[] | null
}
type Member = { user_id: string; role: string; email: string | null }
type Site = { id: string; name: string; subdomain: string }

async function getServerSupabase() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (n: string) => cookieStore.get(n)?.value,
        set: (n: string, v: string, o: CookieOptions) => { try { cookieStore.set(n, v, o) } catch {} },
        remove: (n: string, o: CookieOptions) => { try { cookieStore.set(n, '', { ...o, maxAge: 0 }) } catch {} },
      },
    }
  )
}

export default async function TeamDetailPage({ params }: { params: { id: string } }) {
  const supabase = await getServerSupabase()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: team, error: tErr } = await supabase
    .from('teams')
    .select('id,name,owner')
    .eq('id', params.id)
    .single<Team>()

  if (tErr || !team) notFound()

  // Join members -> users(email). Might be an array if FK isn’t declared.
  const { data: membersRaw } = await supabase
    .from('team_members')
    .select('user_id, role, users ( email )')
    .eq('team_id', team.id)

  const members: Member[] = (membersRaw ?? []).map((m: MemberRow) => {
    let email: string | null = null
    if (Array.isArray(m.users)) {
      email = m.users[0]?.email ?? null
    } else if (m.users && typeof m.users === 'object') {
      email = m.users.email ?? null
    }
    return { user_id: m.user_id, role: m.role, email }
  })

  const { data: sitesRaw } = await supabase
    .from('sites')
    .select('id,name,subdomain')
    .eq('team_id', team.id)
  const sites: Site[] = sitesRaw ?? []

  return (
    <main style={{ maxWidth: 900, margin: '2.5rem auto', fontFamily: 'system-ui', lineHeight: 1.45 }}>
      <header style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div>
          <h1 style={{ margin: 0 }}>{team.name}</h1>
          <p style={{ margin:'6px 0 0', color:'#64748b' }}>
            Team ID: <code>{team.id}</code>
          </p>
        </div>
        <Link href={`/teams/${team.id}/invite`} style={{ textDecoration:'none', border:'1px solid #e2e8f0', padding:'8px 12px', borderRadius:8 }}>
          Invite members →
        </Link>
      </header>

      <section style={{ marginTop:24 }}>
        <h2 style={{ margin:'0 0 8px' }}>Members</h2>
        {members.length === 0 ? (
          <p style={{ color:'#555' }}>No members yet.</p>
        ) : (
          <ul style={{ listStyle:'none', padding:0, margin:0, display:'grid', gap:10 }}>
            {members.map(m => (
              <li key={m.user_id} style={{ border:'1px solid #e6e6e6', borderRadius:12, padding:12 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div>
                    <div style={{ fontWeight:600 }}>{m.email ?? m.user_id}</div>
                    <div style={{ fontSize:12, color:'#666' }}>Role: {m.role}</div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section style={{ marginTop:32 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <h2 style={{ margin:'0 0 8px' }}>Sites</h2>
          <Link href="/sites/new" style={{ textDecoration:'none', fontWeight:600 }}>
            + New Site
          </Link>
        </div>
        {sites.length === 0 ? (
          <p style={{ color:'#555' }}>No sites for this team yet.</p>
        ) : (
          <ul style={{ listStyle:'none', padding:0, margin:0, display:'grid', gap:10 }}>
            {sites.map(s => (
              <li key={s.id} style={{ border:'1px solid #e6e6e6', borderRadius:12, padding:12 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div>
                    <div style={{ fontWeight:700 }}>{s.name}</div>
                    <div style={{ fontSize:12, color:'#666' }}>
                      Subdomain: <code>{s.subdomain}</code>
                    </div>
                  </div>
                  <Link href={`/sites/${s.id}`} style={{ textDecoration:'none' }}>
                    Manage →
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div style={{ marginTop:24 }}>
        <Link href="/dashboard" style={{ textDecoration:'none', border:'1px solid #e2e8f0', padding:'8px 12px', borderRadius:8 }}>
          ← Back to dashboard
        </Link>
      </div>
    </main>
  )
}