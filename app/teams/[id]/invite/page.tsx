// app/teams/[id]/invite/page.tsx
import Link from "next/link";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

type Search = { error?: string; ok?: string };
type TeamRow = { id: string; name: string; owner: string };

function errTo(teamId: string, msg: string) {
  redirect(`/teams/${teamId}/invite?error=${encodeURIComponent(msg)}`);
}
function okTo(teamId: string, msg: string) {
  redirect(`/teams/${teamId}/invite?ok=${encodeURIComponent(msg)}`);
}

function assertEnv(
  name:
    | "NEXT_PUBLIC_SUPABASE_URL"
    | "NEXT_PUBLIC_SUPABASE_ANON_KEY"
    | "NEXT_PUBLIC_SITE_URL"
) {
  const v = process.env[name];
  if (!v) {
    throw new Error(
      `${name} is not set. Add it in Vercel → Project → Settings → Environment Variables.`
    );
  }
  return v;
}

async function getServerSupabase() {
  const cookieStore = await cookies();
  const url = assertEnv("NEXT_PUBLIC_SUPABASE_URL");
  const key = assertEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

  return createServerClient(url, key, {
    cookies: {
      get: (n: string) => cookieStore.get(n)?.value,
      set: (n: string, v: string, o: CookieOptions) => {
        try {
          cookieStore.set(n, v, o);
        } catch {}
      },
      remove: (n: string, o: CookieOptions) => {
        try {
          cookieStore.set(n, "", { ...o, maxAge: 0 });
        } catch {}
      },
    },
  });
}

export default async function InvitePage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: Search;
}) {
  const teamId = params.id;

  // SSR Supabase (user session), created at request time
  const supabase = await getServerSupabase();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Verify current user owns this team (RLS still protects writes)
  const { data: team, error: teamErr } = await supabase
    .from("teams")
    .select("id,name,owner")
    .eq("id", teamId)
    .single<TeamRow>();

  if (teamErr || !team) notFound();
  if (team.owner !== user.id) redirect("/dashboard"); // not owner → bounce

  // ---- server action (runs only on server) ----
  async function inviteAction(formData: FormData) {
    "use server";

    const email =
      (formData.get("email") as string | null)?.trim().toLowerCase() ?? "";
    const role = (formData.get("role") as string | null)?.trim() ?? "member";
    if (!email) errTo(teamId, "Email is required");
    if (!["owner", "coach", "member"].includes(role)) errTo(teamId, "Invalid role");

    // Recreate SSR client inside the action (for auth check)
    const supabase = await getServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    // 1) (Optional) record a pending invite with the *user* client (RLS requires owner)
    //    If this fails, we’ll continue with the flow but surface the error.
    const { error: invErr } = await supabase
      .from("pending_invites")
      .insert({ team_id: teamId, email, role, invited_by: user.id });
    if (invErr) {
      // Non-fatal: comment this out if you prefer silent ignore
      // errTo(teamId, `Could not create invite record: ${invErr.message}`);
    }

    // 2) Try to send Supabase invite email using the ADMIN client (SERVICE_ROLE)
    const { supabaseAdmin } = await import("@/lib/supabaseAdmin");
    const redirectTo = `${assertEnv("NEXT_PUBLIC_SITE_URL")}/auth/cb`;

    const inviteRes = await supabaseAdmin.auth.admin.inviteUserByEmail(email, { redirectTo });
    const mailErr = inviteRes.error;

    // Helper: add a userId to the team (admin insert, but you can switch to user client if RLS should enforce).
    async function addUserIdToTeam(userId: string) {
      const { error: memberErr } = await supabaseAdmin
        .from("team_members")
        .insert({ team_id: teamId, user_id: userId, role });
      // Ignore duplicates
      if (memberErr && !/duplicate key|unique constraint/i.test(memberErr.message)) {
        errTo(teamId, `Could not add to team: ${memberErr.message}`);
      }
    }

    if (mailErr) {
      // 3) If invite fails because the user already exists, add them right away
      const isAlreadyRegistered = /already been registered|already registered|user exists/i.test(
        mailErr.message || ""
      );

      if (!isAlreadyRegistered) {
        errTo(teamId, `Invite email failed: ${mailErr.message}`);
      }

      // Look up user by email (admin)
      // Prefer getUserByEmail if your SDK supports it
      // @ts-ignore – older SDKs may not have the type declared
      if (supabaseAdmin.auth.admin.getUserByEmail) {
        // @ts-ignore
        const { data, error } = await supabaseAdmin.auth.admin.getUserByEmail(email);
        if (error || !data?.user?.id) {
          errTo(teamId, `User exists but lookup failed: ${error?.message ?? "unknown error"}`);
        }
        await addUserIdToTeam(data.user.id);
      } else {
        // Fallback: listUsers and find by email
        const { data: list, error: listErr } = await supabaseAdmin.auth.admin.listUsers();
        if (listErr) errTo(teamId, `User exists but lookup failed: ${listErr.message}`);
        const existingId =
          list?.users?.find((u: any) => u.email?.toLowerCase() === email)?.id ?? null;
        if (!existingId) errTo(teamId, "User exists but could not be found by email");
        await addUserIdToTeam(existingId);
      }

      okTo(teamId, `User already registered — added to team as ${role}`);
      return;
    }

    // 4) Invite email sent successfully → also add them immediately (optional)
    const invitedId = inviteRes.data?.user?.id;
    if (invitedId) {
      await addUserIdToTeam(invitedId);
    }

    okTo(teamId, `Invite sent to ${email}${invitedId ? " and added to the team." : "."}`);
  }

  return (
    <main style={{ maxWidth: 520, margin: "3rem auto", fontFamily: "system-ui" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
        }}
      >
        <h1 style={{ margin: 0 }}>Invite to {team?.name ?? "team"}</h1>
        <Link
          href={`/teams/${teamId}`}
          style={{
            textDecoration: "none",
            border: "1px solid #e2e8f0",
            padding: "8px 12px",
            borderRadius: 8,
          }}
        >
          ← Back to team
        </Link>
      </div>

      {searchParams?.error && (
        <p
          role="alert"
          style={{
            background: "#fee",
            border: "1px solid #fbb",
            color: "#900",
            padding: "8px 10px",
            borderRadius: 8,
            marginTop: 12,
          }}
        >
          {decodeURIComponent(searchParams.error)}
        </p>
      )}
      {searchParams?.ok && (
        <p
          style={{
            background: "#eefbe7",
            border: "1px solid #b8efad",
            color: "#155724",
            padding: "8px 10px",
            borderRadius: 8,
            marginTop: 12,
          }}
        >
          {decodeURIComponent(searchParams.ok)}
        </p>
      )}

      <form action={inviteAction} style={{ display: "grid", gap: 12, marginTop: 16 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span>Email</span>
          <input
            name="email"
            type="email"
            required
            placeholder="name@example.com"
            style={{ padding: 10, fontSize: 16, border: "1px solid #ddd", borderRadius: 8 }}
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span>Role</span>
          <select
            name="role"
            defaultValue="member"
            style={{ padding: 10, border: "1px solid #ddd", borderRadius: 8 }}
          >
            <option value="member">Member</option>
            <option value="coach">Coach</option>
            <option value="owner">Owner</option>
          </select>
        </label>

        <button
          style={{
            padding: "10px 12px",
            fontSize: 16,
            border: "1px solid #0b6",
            background: "#0b6",
            color: "#fff",
            borderRadius: 8,
            cursor: "pointer",
          }}
        >
          Send invite
        </button>
      </form>
    </main>
  );
}