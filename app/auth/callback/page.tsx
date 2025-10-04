import { Suspense } from 'react'
import ClientCallback from './Client'

// avoid static prerendering and stale caching for the auth handshake
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default function Page() {
  return (
    <Suspense fallback={<p style={{padding:20,fontFamily:'system-ui'}}>Loading…</p>}>
      <ClientCallback />
    </Suspense>
  )
}