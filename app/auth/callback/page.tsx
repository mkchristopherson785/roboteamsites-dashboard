import ClientCallback from './Client'

// These exports MUST be on a server component (this file)
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

export default function Page() {
  // No Suspense required since we’re not using useSearchParams anymore
  return <ClientCallback />
}