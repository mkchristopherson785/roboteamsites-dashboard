import LoginClient from './Client'

// (If you want to force dynamic, you can add these here—on the server page only)
// export const dynamic = 'force-dynamic'
// export const revalidate = 0

export default function Page() {
  return <LoginClient />
}