import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

export async function POST() {
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
  if (userErr || !user) {
    return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 })
  }

  // Do they already own any teams?
  const { data: ownedTeams, error: selErr } = await supabase
    .from('teams')
    .select('id,name')
    .eq('owner', user.id)
    .limit(1)

  if (selErr) {
    return NextResponse.json({ ok: false, error: selErr.message }, { status: 400 })
  }

  if (ownedTeams && ownedTeams.length > 0) {
    return NextResponse.json({ ok: true, skipped: true, reason: 'Owner already has a team' })
  }

  // Create defaults
  const emailName = (user.email ?? 'team').split('@')[0]
  const teamName = `${emailName}'s Team`
  const subdomain = emailName.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g,'-').replace(/^-|-$/g,'')

  // 1) Team
  const { data: team, error: teamErr } = await supabase
    .from('teams')
    .insert({ name: teamName, owner: user.id })
    .select('id')
    .single()

  if (teamErr || !team) {
    return NextResponse.json({ ok: false, error: teamErr?.message ?? 'Failed to create team' }, { status: 400 })
  }

  // 2) Membership as owner
  const { error: memErr } = await supabase
    .from('team_members')
    .insert({ team_id: team.id, user_id: user.id, role: 'owner' })
    .select('team_id')
    .single()

  if (memErr) {
    return NextResponse.json({ ok: false, error: `Team created but owner add failed: ${memErr.message}` }, { status: 400 })
  }

  // 3) Site
  const { data: site, error: siteErr } = await supabase
    .from('sites')
    .insert({
      team_id: team.id,
      name: `${teamName} Site`,
      subdomain,
      vercel_url: null
    })
    .select('id')
    .single()

  if (siteErr || !site) {
    return NextResponse.json({ ok: false, error: siteErr?.message ?? 'Failed to create site' }, { status: 400 })
  }

  // 4) Site content defaults
  const defaultContent = {
    team: {
      name: teamName,
      number: '',
      school: '',
      city: '',
      state: '',
      about: 'Welcome to your new FTC team site! Edit this content in the dashboard.',
    },
    links: [
      { label: 'What is FIRST Tech Challenge?', href: 'https://www.firstinspires.org/robotics/ftc', external: true },
      { label: 'Competition & Practice Calendar', href: '#calendar' },
    ],
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
    sponsors: {
      platinum: [],
      gold: [],
      silver: [],
      bronze: [],
    }
  }

  const { error: contentErr } = await supabase
    .from('site_content')
    .insert({ site_id: site.id, data: defaultContent })
    .select('id')
    .single()

  if (contentErr) {
    return NextResponse.json({ ok: false, error: `Site created but content failed: ${contentErr.message}` }, { status: 400 })
  }

  return NextResponse.json({
    ok: true,
    created: {
      team_id: team.id,
      site_id: site.id,
      subdomain,
    }
  })
}