// app/sites/[id]/route.ts
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { buildPublicHtml, type SiteData } from '@/lib/buildPublicHtml'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type RouteParams = { id: string }

type SiteRow = {
  id: string
  name: string
  subdomain: string
  team_id: string
  vercel_url: string | null
}

type SiteContentRow = {
  id: string
  site_id: string
  data: unknown
  updated_at: string
}

// ---------- tiny runtime guards ----------
const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null

const prop = (o: unknown, k: string): unknown =>
  isObj(o) ? (o as Record<string, unknown>)[k] : undefined

const str = (v: unknown, fallback = ''): string =>
  typeof v === 'string' ? v : fallback

const num = (v: unknown, fallback: number): number =>
  typeof v === 'number' && Number.isFinite(v) ? v : fallback

const arr = <T>(v: unknown, map: (x: unknown) => T): T[] =>
  Array.isArray(v) ? v.map(map) : []

const link = (v: unknown) => ({
  label: str(prop(v, 'label'), ''),
  href: str(prop(v, 'href'), ''),
  external: Boolean(prop(v, 'external')),
})

const member = (v: unknown) => ({
  name: str(prop(v, 'name'), ''),
  role: str(prop(v, 'role'), ''),
  img: str(prop(v, 'img'), ''),
})

const sponsor = (v: unknown) => ({
  name: str(prop(v, 'name'), ''),
  tier: str(prop(v, 'tier'), ''),
  logo: str(prop(v, 'logo'), ''),
})

const card = (v: unknown) => ({
  title: str(prop(v, 'title'), ''),
  text: str(prop(v, 'text'), ''),
  img: str(prop(v, 'img'), ''),
})

function coerceSiteData(raw: unknown, siteFallbackName: string): SiteData {
  const o = isObj(raw) ? raw : {}

  const teamObj = isObj(prop(o, 'team')) ? (prop(o, 'team') as Record<string, unknown>) : {}
  const themeObj = isObj(prop(o, 'theme')) ? (prop(o, 'theme') as Record<string, unknown>) : {}
  const sponsorsObj = isObj(prop(o, 'sponsors')) ? (prop(o, 'sponsors') as Record<string, unknown>) : {}
  const calObj = isObj(prop(o, 'calendar')) ? (prop(o, 'calendar') as Record<string, unknown>) : {}

  const nowYear = new Date().getFullYear()

  return {
    team: {
      name: str(prop(teamObj, 'name'), siteFallbackName),
      number: str(prop(teamObj, 'number')),
      school: str(prop(teamObj, 'school')),
      city: str(prop(teamObj, 'city')),
      state: str(prop(teamObj, 'state')),
      founding: num(prop(teamObj, 'founding'), nowYear),
      contactEmail: str(prop(teamObj, 'contactEmail')),
      logoSrc: str(prop(teamObj, 'logoSrc')),
      favSrc: str(prop(teamObj, 'favSrc')),
      heroSrc: str(prop(teamObj, 'heroSrc')),
    },
    links: arr(prop(o, 'links'), link).filter(l => l.label && l.href),
    members: arr(prop(o, 'members'), member).filter(m => m.name),
    sponsors: {
      platinum: arr(prop(sponsorsObj, 'platinum'), sponsor),
      gold:     arr(prop(sponsorsObj, 'gold'), sponsor),
      silver:   arr(prop(sponsorsObj, 'silver'), sponsor),
      bronze:   arr(prop(sponsorsObj, 'bronze'), sponsor),
    },
    outreach:  arr(prop(o, 'outreach'), card),
    resources: arr(prop(o, 'resources'), card),
    bullets:   arr(prop(o, 'bullets'), b => str(b)).filter(Boolean),
    showTierHeadings: Boolean(prop(o, 'showTierHeadings') ?? true),
    calendar: {
      ics:  str(prop(calObj, 'ics')),
      gcal: str(prop(calObj, 'gcal')),
      tz:   str(prop(calObj, 'tz')),
    },
    theme: {
      background:    str(prop(themeObj, 'background'), '#f5f7f6'),
      card:          str(prop(themeObj, 'card'), '#ffffff'),
      text:          str(prop(themeObj, 'text'), '#18241d'),
      headline:      str(prop(themeObj, 'headline'), '#0b1f16'),
      footerText:    str(prop(themeObj, 'footerText'), '#c9e6da'),
      accent:        str(prop(themeObj, 'accent'), '#0f8a5f'),
      headerBg:      str(prop(themeObj, 'headerBg'), '#ffffff'),
      headerText:    str(prop(themeObj, 'headerText'), '#0b1f16'),
      buttonText:    str(prop(themeObj, 'buttonText'), '#ffffff'),
      underlineLinks: Boolean(prop(themeObj, 'underlineLinks') ?? true),
    },
  }
}

// Next 15: params is a Promise
export async function GET(_req: Request, ctx: { params: Promise<RouteParams> }) {
  const { id } = await ctx.params

  const { data: site, error: siteErr } = await supabaseAdmin
    .from('sites')
    .select('id,name,subdomain,team_id,vercel_url')
    .eq('id', id)
    .single<SiteRow>()

  if (siteErr || !site) {
    return NextResponse.json({ error: 'Site not found' }, { status: 404 })
  }

  const { data: content } = await supabaseAdmin
    .from('site_content')
    .select('id,site_id,data,updated_at')
    .eq('site_id', site.id)
    .maybeSingle<SiteContentRow>()

  const input: SiteData = coerceSiteData(content?.data, site.name)
  const html = buildPublicHtml(input)

  return new NextResponse(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}