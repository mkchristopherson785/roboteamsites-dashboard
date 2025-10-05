// app/api/accept-invites/route.ts
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

export const dynamic = 'force-dynamic'

export async function POST() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
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

  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !user.email) {
    return NextResponse.json({ ok: false, message: 'Not signed in' }, { status: 401 })
  }

  // Find pending invites for this email
  const { data: invites, error: iErr } = await supabase
    .from('pending_invites')
    .select('id, team_id, role, accepted_at')
    .eq('email', user.email)
    .is('accepted_at', null)

  if (iErr) {
    return NextResponse.json({ ok: false, message: iErr.message }, { status: 400 })
  }

  if (!invites || invites.length === 0) {
    return NextResponse.json({ ok: true, message: 'No invites' })
  }

  // Upsert memberships
  for (const inv of invites) {
    // Ignore if already a member
    const { data: existing } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('team_id', inv.team_id)
      .eq('user_id', user.id)
      .limit(1)

    if (!existing || existing.length === 0) {
      await supabase
        .from('team_members')
        .upsert(
          { team_id: inv.team_id, user_id: user.id, role: inv.role },
          { onConflict: 'team_id,user_id', ignoreDuplicates: true }
        )
    }

    // Mark invite accepted
    await supabase
      .from('pending_invites')
      .update({ accepted_at: new Date().toISOString() })
      .eq('id', inv.id)
  }

  return NextResponse.json({ ok: true, message: `Accepted ${invites.length} invite(s)` })
}