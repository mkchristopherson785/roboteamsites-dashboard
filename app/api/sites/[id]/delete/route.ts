// app/api/sites/[id]/delete/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { supabaseAdmin } from "@/lib/supabaseAdmin"; // service role client

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params; // Next 15: params is a Promise
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (n: string) => cookieStore.get(n)?.value,
        set: (n: string, v: string, o: CookieOptions) => { try { cookieStore.set(n, v, o); } catch {} },
        remove: (n: string, o: CookieOptions) => { try { cookieStore.set(n, "", { ...o, maxAge: 0 }); } catch {} },
      },
    }
  );

  // must be signed in
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", _req.url));
  }

  // authorize: user must own the team for this site
  // (Assumes tables: sites(id, team_id), teams(id, owner))
  const { data: siteRow, error: siteErr } = await supabase
    .from("sites")
    .select("id, team_id")
    .eq("id", id)
    .maybeSingle();

  if (siteErr || !siteRow) {
    return NextResponse.json({ error: "Site not found" }, { status: 404 });
  }

  const { data: teamRow, error: teamErr } = await supabase
    .from("teams")
    .select("id, owner")
    .eq("id", siteRow.team_id)
    .maybeSingle();

  if (teamErr || !teamRow) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  if (teamRow.owner !== user.id) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  // perform deletes with service role to bypass RLS, now that we authorized
  // 1) delete dependent content rows
  const { error: delContentErr } = await supabaseAdmin
    .from("site_content")
    .delete()
    .eq("site_id", id);

  if (delContentErr) {
    return NextResponse.json({ error: delContentErr.message }, { status: 500 });
  }

  // 2) delete the site
  const { error: delSiteErr } = await supabaseAdmin
    .from("sites")
    .delete()
    .eq("id", id);

  if (delSiteErr) {
    return NextResponse.json({ error: delSiteErr.message }, { status: 500 });
  }

  // back to dashboard
  return NextResponse.redirect(new URL("/dashboard", _req.url));
}