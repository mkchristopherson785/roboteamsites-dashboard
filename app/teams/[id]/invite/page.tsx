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
        try { cookieStore.set(n, v, o); } catch {}
      },
      remove: (n: string, o: CookieOptions) => {
        try { cookieStore.set(n, "", { ...o, maxAge: 0 }); } catch {}
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

  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: team, error: teamErr } = await supabase
    .from("teams")
    .select("id,name,owner")
    .eq("id", teamId)
    .single<TeamRow>();

  if (teamErr || !team) notFound();
  if (team.owner !== user.id) redirect("/dashboard"); // not owner → bounce

  async function inviteAction(formData: FormData) {
    "use server";

    const email = (formData.get("email") as string | null)?.trim().toLowerCase() ?? "";
    const role = (formData.get("role") as string | null)?.trim() ?? "member";
    if (!email) errTo(teamId, "Email is required");
    if (!["owner", "coach", "member"].includes(role)) errTo(teamId, "Invalid role");

    const supabase = await getServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    // Optional: record a pending invite (non-fatal if it fails)
    try {
      const { error: invErr } = await supabase
        .from("pending_invites")
        .insert({ team_id: teamId, email, role, invited_by: user.id });
      // ignore error – not critical to the flow
    } catch {
      // ignore network/transport errors too
    }

    // Send invite with admin client
    const { supabaseAdmin } = await import("@/lib/supabaseAdmin");
    const redirectTo = `${assertEnv("NEXT_PUBLIC_SITE_URL")}/auth/cb`;
    const inviteRes = await supabaseAdmin.auth.admin.inviteUserByEmail(email, { redirectTo });

    // Helper: add user to team via admin (ignore duplicates)
    async function addUserIdToTeam(userId: string) {
      const { error } = await supabaseAdmin
        .from("team_members")
        .insert({ team_id: teamId, user_id: userId, role });
      if (error && !/duplicate key|unique constraint/i.test(error.message)) {
        errTo(teamId, `Could not add to team: ${error.message}`);
      }
    }

    if (inviteRes.error) {
      // If already registered, resolve user by email and add them
      const alreadyRegistered = /already been registered|already registered|user exists/i.test(
        inviteRes.error.message || ""
      );
      if (!alreadyRegistered) {
        errTo(teamId, `Invite email failed: ${inviteRes.error.message}`);
      }

      // Lookup via listUsers
      const list = await supabaseAdmin.auth.admin.listUsers();
      if (list.error) {
        errTo(teamId, `User exists but lookup failed: ${list.error.message}`);
      }

      type AdminUser = { id: string; email?: string | null };
      const users = (list.data?.users ?? []) as unknown as AdminUser[];
      const existing = users.find(
        (u) => (u.email ?? "").toLowerCase() === email
      );
      if (!existing) {
        errTo(teamId, "User exists but could not be found by email");
      }

      await addUserIdToTeam(existing.id);
      okTo(teamId, `User already registered — added to team as ${role}`);
      return;
    }

    // Invite sent successfully → also add them now (optional)
    const invitedId = inviteRes.data?.user?.id;
    if (invitedId) {
      await addUserIdToTeam(invitedId);
      okTo(teamId, `Invite sent to ${email} and added to the team.`);
      return;
    }

    okTo(teamId, `Invite sent to ${email}.`);
  }

  return (
    <main style={{ maxWidth: 520, margin: "3rem auto", fontFamily: "system-ui" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <h1 style={{ margin: 0 }}>Invite to {team?.name ?? "team"}</h1>
        <Link
          href={`/teams/${teamId}`}
          style={{ textDecoration: "none", border: "1px solid #e2e8f0", padding: "8px 12px", borderRadius: 8 }}
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