// app/auth/cb/page.tsx (Server Component)
import { Suspense } from 'react'
import Client from './Client'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

export default function Page() {
  return (
    <Suspense fallback={<p style={{padding:20,fontFamily:'system-ui'}}>Preparing sign-in…</p>}>
      <Client />
    </Suspense>
  )
}