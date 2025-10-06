// app/site/[subdomain]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin' // uses SERVICE_ROLE
import { buildPublicHtml, type SiteData } from '@/lib/buildPublicHtml'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ subdomain: string }> }
) {
  const { subdomain } = await context.params

  const { data: site, error: sErr } = await supabaseAdmin
    .from('sites')
    .select('id,name,subdomain')
    .eq('subdomain', subdomain)
    .single()

  if (sErr || !site) {
    return NextResponse.json({ error: 'Site not found' }, { status: 404 })
  }

  const { data: content } = await supabaseAdmin
    .from('site_content')
    .select('data')
    .eq('site_id', site.id)
    .maybeSingle()

  const data: SiteData = {
    team: {
      name: site.name,
      ...(content?.data?.team ?? {}),
    },
    links: content?.data?.links ?? [],
    members: content?.data?.members ?? [],
    sponsors: content?.data?.sponsors ?? { platinum: [], gold: [], silver: [], bronze: [] },
    outreach: content?.data?.outreach ?? [],
    resources: content?.data?.resources ?? [],
    bullets: content?.data?.bullets ?? [],
    showTierHeadings: content?.data?.showTierHeadings ?? true,
    calendar: content?.data?.calendar ?? {},
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
      ...(content?.data?.theme ?? {}),
    },
  }

  const html = buildPublicHtml(data)
  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}