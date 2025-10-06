// app/site/[subdomain]/route.ts
import { NextResponse } from 'next/server'
import { buildPublicHtml, type SiteData } from '@/lib/buildPublicHtml'
import { supabaseAdmin } from '@/lib/supabaseAdmin' // uses SERVICE_ROLE

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

export async function GET(
  _req: Request,
  { params }: { params: { subdomain: string } }
) {
  const sub = params.subdomain.toLowerCase()

  // Find site by subdomain
  const { data: site, error: sErr } = await supabaseAdmin
    .from('sites')
    .select('id, name, subdomain, team_id, vercel_url, created_at')
    .ilike('subdomain', sub)
    .single()

  if (sErr || !site) {
    return new NextResponse('Site not found', { status: 404 })
  }

  const { data: content, error: cErr } = await supabaseAdmin
    .from('site_content')
    .select('data')
    .eq('site_id', site.id)
    .maybeSingle()

  if (cErr) {
    return new NextResponse('Error loading content', { status: 500 })
  }

  const data = (content?.data || {}) as Partial<SiteData>

  // Map minimal fallbacks from site row into data.team/theme if missing
  data.team = {
    name: site.name,
    number: data?.team?.number || '',
    school: data?.team?.school || '',
    city: data?.team?.city || '',
    state: data?.team?.state || '',
    founding: data?.team?.founding,
    contactEmail: data?.team?.contactEmail,
    logoSrc: data?.team?.logoSrc,
    favSrc: data?.team?.favSrc,
    heroSrc: data?.team?.heroSrc,
  }

  data.theme = {
    background: data?.theme?.background || '#f5f7f6',
    card:       data?.theme?.card       || '#ffffff',
    text:       data?.theme?.text       || '#18241d',
    headline:   data?.theme?.headline   || '#0b1f16',
    footerText: data?.theme?.footerText || '#c9e6da',
    accent:     data?.theme?.accent     || '#0f8a5f',
    headerBg:   data?.theme?.headerBg   || '#ffffff',
    headerText: data?.theme?.headerText || '#0b1f16',
    buttonText: data?.theme?.buttonText || '#ffffff',
    underlineLinks: data?.theme?.underlineLinks ?? true,
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
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}