// app/sites/[id]/route.ts
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { buildPublicHtml, type SiteData } from '@/lib/buildPublicHtml'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// Next 15: params is a Promise in route handlers
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params

  // Load site row (id, name, subdomain, etc. — adjust selected columns as you like)
  const { data: site, error: siteErr } = await supabaseAdmin
    .from('sites')
    .select('id, name, subdomain, team_id')
    .eq('id', id)
    .single()

  if (siteErr || !site) {
    return NextResponse.json({ error: 'Site not found' }, { status: 404 })
  }

  // Load content row (your JSON payload that matches SiteData)
  const { data: contentRow, error: contentErr } = await supabaseAdmin
    .from('site_content')
    .select('data')
    .eq('site_id', site.id)
    .maybeSingle()

  if (contentErr) {
    return NextResponse.json({ error: contentErr.message }, { status: 500 })
  }

  // Default content if none exists yet
  const fallback: SiteData = {
    team: {
      name: site.name ?? 'FTC Team',
      number: '',
      school: '',
      city: '',
      state: '',
    },
    links: [],
    members: [],
    sponsors: { platinum: [], gold: [], silver: [], bronze: [] },
    outreach: [],
    resources: [],
    bullets: [],
    showTierHeadings: true,
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
  }

  // Coerce DB payload to SiteData safely
  const data: SiteData = (() => {
    const raw = contentRow?.data
    if (!raw || typeof raw !== 'object') return fallback
    // Shallow-merge theme and simple fields to ensure required keys exist
    const mergedTheme = { ...fallback.theme, ...(raw as any).theme }
    return {
      ...fallback,
      ...(raw as Record<string, unknown>),
      theme: mergedTheme,
    } as SiteData
  })()

  const html = buildPublicHtml(data)

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}