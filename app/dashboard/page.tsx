import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

type Team = { id: string; name: string; created_at: string }
type Site = { id: string; name: string; subdomain: string; team_id: string; vercel_url: string | null }

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

export default async function DashboardPage() {
  // Create a Supabase server client with cookie handling
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => cookieStore.get(name)?.value,
        set: (name: string, value: string, options: CookieOptions) =>
          cookieStore.set(name, value, options),
        remove: (name: string, options: CookieOptions) =>
          cookieStore.set(name, '', { ...options, maxAge: 0 }),
      },
    }
  )

  // Require authentication
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch teams and sites (Row Level Security applies)
  const { data: teams = [] } = await supabase
    .from('teams')
    .select('id,name,created_at')
    .order('created_at', { ascending: false }) as { data: Team[] | null }

  const { data: sites = [] } = await supabase
    .from('sites')
    .select('id,name,subdomain,team_id,vercel_url')
    .order('created_at', { ascending: false }) as { data: Site[] | null }

  return (
    <main style={{ maxWidth: 900, margin: '3rem auto', fontFamily: 'system-ui', lineHeight: 1.4 }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0 }}>Dashboard</h1>
