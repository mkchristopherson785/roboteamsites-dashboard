// app/teams/new/page.tsx
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

function errTo(path: string, msg: string) {
  const p = new URLSearchParams({ error: msg })
  redirect(`${path}?${p.toString()}`)
}

export default async function NewTeamPage({
  searchParams,
}: {
  searchParams?: { error?: string }
}) {
  async function createTeam(formData: FormData): Promise<void> {
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

    // Basic validation
    const name = (formData.get('name') as string | null)?.trim() ?? ''
    if (!name) errTo('/teams/new', 'Team name is required')

    // Optional: prevent duplicate team name for this owner
    const { data: dup, error: dupErr } = await supabase
      .from('teams')
      .select('id')
      .eq('owner', user.id)
      .ilike('name', name)
      .limit(1)

    if (dupErr) errTo('/teams/new', `Could not check duplicates: ${dupErr.message}`)
    if (dup && dup.length > 0) errTo('/teams/new', 'You already have a team with this name')

    // 1) Create team
    const { data: team, error: tErr } = await supabase
      .from('teams')
      .insert({ name, owner: user.id })
      .select('id')
      .single()

    if (tErr || !team) errTo('/teams/new', tErr?.message ?? 'Failed to create team')

    // 2) Upsert membership as owner (ignore if already there)
    const { error: mErr } = await supabase
      .from('team_members')
      .upsert(
        { team_id: team.id, user_id: user.id, role: 'owner' },
        { onConflict: 'team_id,user_id', ignoreDuplicates: true }
      )

    if (mErr) {
      // Not fatal—team exists—but we’ll surface it anyway
      errTo('/teams/new', `Team created, but adding owner failed: ${mErr.message}`)
    }

    // Done → Dashboard
    redirect('/dashboard')
  }

  return (
    <main style={{ maxWidth: 520, margin: '3rem auto', fontFamily: 'system-ui' }}>
      <h1 style={{ marginBottom: 8 }}>Create a Team</h1>
      <p style={{ marginTop: 0, color: '#555' }}>
        You’ll be the owner. You can invite members later.
      </p>

      {!!searchParams?.error && (
        <p
          role="alert"
          style={{
            background: '#fee',
            border: '1px solid #fbb',
            color: '#900',
            padding: '8px 10px',
            borderRadius: 8,
            marginTop: 12
          }}
        >
          {decodeURIComponent(searchParams.error)}
        </p>
      )}

      <form action={createTeam} style={{ display: 'grid', gap: 12, marginTop: 16 }}>
        <label style={{ display: 'grid', gap: 6 }}>
          <span>Team name</span>
          <input
            name="name"
            type="text"
            required
            placeholder="e.g., Robo Rhinos"
            autoComplete="organization"
            style={{ padding: 10, fontSize: 16, border: '1px solid #ddd', borderRadius: 8 }}
          />
        </label>

        <button
          type="submit"
          style={{
            padding: '10px 12px',
            fontSize: 16,
            border: '1px solid #0b6',
            background: '#0b6',
            color: '#fff',
            borderRadius: 8,
            cursor: 'pointer'
          }}
        >
          Create Team
        </button>
      </form>
    </main>
  )
}