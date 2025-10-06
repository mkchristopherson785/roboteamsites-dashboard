// app/auth/session/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

type Body = { access_token?: string; refresh_token?: string };

export async function POST(req: Request) {
  const { access_token, refresh_token } = (await req.json()) as Body;
  if (!access_token || !refresh_token) {
    return NextResponse.json(
      { ok: false, error: "Missing tokens" },
      { status: 400 },
    );
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => cookieStore.get(name)?.value,
        set: (name: string, value: string, options: CookieOptions) => {
          try {
            cookieStore.set(name, value, options);
          } catch {}
        },
        remove: (name: string, options: CookieOptions) => {
          try {
            cookieStore.set(name, "", { ...options, maxAge: 0 });
          } catch {}
        },
      },
    },
  );

  // This sets the server httpOnly cookies via the SSR cookie adapter
  const { error } = await supabase.auth.setSession({
    access_token,
    refresh_token,
  });
  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true });
}
