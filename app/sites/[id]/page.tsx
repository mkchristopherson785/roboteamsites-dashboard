// app/sites/[id]/page.tsx
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { buildPublicHtml } from '@/lib/buildPublicHtml'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function SitePage({ params }: { params: { id: string } }) {
  const { id } = params

  // Fetch site data from Supabase
  const { data: site, error } = await supabaseAdmin
    .from('sites')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !site) notFound()

  // The content JSON stored in your Supabase row (parsed)
  const content = site.content ? JSON.parse(site.content) : null

  if (!content) notFound()

  // Build the HTML string from your builder
  const html = buildPublicHtml(content)

  // Return as HTML
  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  }) as any
}