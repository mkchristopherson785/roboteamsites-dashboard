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

// ---------- tiny runtime guards (no `any`) ----------
const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null

const str = (v: unknown, fallback = ''): string =>
  typeof v === 'string' ? v : fallback

const num = (v: unknown, fallback: number): number =>
  typeof v === 'number' && Number.isFinite(v) ? v : fallback

const arr = <T>(v: unknown, map: (x: unknown) => T): T[] =>
  Array.isArray(v) ? v.map(map) : []

const link = (v: unknown) => ({
  label: str(isObj(v)?.label, ''),
  href: str(isObj(v)?.href, ''),
  external: Boolean(isObj(v)?.external),
})

const member = (v: unknown) => ({
  name: str(isObj(v)?.name, ''),
  role: str(isObj(v)?.role, ''),
  img: str(isObj(v)?.img, ''),
})

const sponsor = (v: unknown) => ({
  name: str(isObj(v)?.name, ''),
  tier: str(isObj(v)?.tier, ''),
  logo: str(isObj(v)?.logo, ''),
})

const card = (v: unknown) => ({
  title: str(isObj(v)?.title, ''),
  text: str(isObj(v)?.text, ''),
  img: str(isObj(v)?.img, ''),
})

function coerceSiteData(raw: unknown, siteFallbackName: string): SiteData {
  const o = isObj(raw) ? raw : {}

  const teamObj = isObj(o.team) ? o.team : {}
  const themeObj = isObj(o.theme) ? o.theme : {}

  const sponsorsObj = isObj(o.sponsors) ? o.sponsors : {}

  const nowYear = new Date().getFullYear()

  return {
    team: {
      name: str(teamObj.name, siteFallbackName),
      number: str(teamObj.number),
      school: str(teamObj.school),
      city: str(teamObj.city),
      state: str(teamObj.state),
      founding: num(teamObj.founding, nowYear),
      contactEmail: str(teamObj.contactEmail),
      logoSrc: str(teamObj.logoSrc),
      favSrc: str(teamObj.favSrc),
      heroSrc: str(teamObj.heroSrc),
    },
    links: arr(o.links, link).filter(l => l.label && l.href),
    members: arr(o.members, member).filter(m => m.name),
    sponsors: {
      platinum: arr((sponsorsObj as Record<string, unknown>).platinum, sponsor),
      gold:     arr((sponsorsObj as Record<string, unknown>).gold, sponsor),
      silver:   arr((sponsorsObj as Record<string, unknown>).silver, sponsor),
      bronze:   arr((sponsorsObj as Record<string, unknown>).bronze, sponsor),
    },
    outreach:  arr(o.outreach, card),
    resources: arr(o.resources, card),
    bullets:   arr(o.bullets, b => str(b)).filter(Boolean),
    showTierHeadings: Boolean(o.showTierHeadings ?? true),
    calendar: {
      ics:  str(isObj(o.calendar)?.ics),
      gcal: str(isObj(o.calendar)?.gcal),
      tz:   str(isObj(o.calendar)?.tz),
    },
    theme: {
      background:  str(themeObj.background, '#f5f7f6'),
      card:        str(themeObj.card, '#ffffff'),
      text:        str(themeObj.text, '#18241d'),
      headline:    str(themeObj.headline, '#0b1f16'),
      footerText:  str(themeObj.footerText, '#c9e6da'),
      accent:      str(themeObj.accent, '#0f8a5f'),
      headerBg:    str(themeObj.headerBg, '#ffffff'),
      headerText:  str(themeObj.headerText, '#0b1f16'),
      buttonText:  str(themeObj.buttonText, '#ffffff'),
      underlineLinks: Boolean(themeObj.underlineLinks ?? true),
    },
  }
}

// ---------- GET (Next 15: params is a Promise) ----------
export async function GET(_req: Request, ctx: { params: Promise<RouteParams> }) {
  const { id } = await ctx.params

  // Read the site
  const { data: site, error: siteErr } = await supabaseAdmin
    .from('sites')
    .select('id,name,subdomain,team_id,vercel_url')
    .eq('id', id)
    .single<SiteRow>()

  if (siteErr || !site) {
    return NextResponse.json({ error: 'Site not found' }, { status: 404 })
  }

  // Read content (may be empty)
  const { data: content } = await supabaseAdmin
    .from('site_content')
    .select('id,site_id,data,updated_at')
    .eq('site_id', site.id)
    .maybeSingle<SiteContentRow>()

  // Coerce unknown JSON into typed SiteData (no `any`)
  const input: SiteData = coerceSiteData(content?.data, site.name)

  const html = buildPublicHtml(input)
  return new NextResponse(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}