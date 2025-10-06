// app/api/sites/[id]/export/route.ts
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { buildPublicHtml, type SiteData } from '@/lib/buildPublicHtml'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const siteId = params.id

  const { data: site, error: sErr } = await supabaseAdmin
    .from('sites')
    .select('id,name,subdomain,team_id,vercel_url')
    .eq('id', siteId)
    .single()

  if (sErr || !site) {
    return NextResponse.json({ error: 'Site not found' }, { status: 404 })
  }

  const { data: content, error: cErr } = await supabaseAdmin
    .from('site_content')
    .select('data')
    .eq('site_id', site.id)
    .maybeSingle()

  if (cErr) {
    return NextResponse.json({ error: 'Content load error' }, { status: 500 })
  }

  const data = (content?.data || {}) as Partial<SiteData>
  data.team = { name: site.name, ...(data.team || {}) }
  data.theme = {
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
    ...(data.theme || {}),
  }
  data.links ??= []
  data.members ??= []
  data.sponsors ??= { platinum: [], gold: [], silver: [], bronze: [] }
  data.outreach ??= []
  data.resources ??= []
  data.bullets ??= []
  data.showTierHeadings ??= true

  const html = buildPublicHtml(data as SiteData)

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': `attachment; filename="index.html"`,
    },
  })
}