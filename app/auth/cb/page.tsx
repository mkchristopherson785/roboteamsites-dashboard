import ClientCallback from './Client'

// server-only directives live on the server page
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

export default function Page() {
  return <ClientCallback />
}