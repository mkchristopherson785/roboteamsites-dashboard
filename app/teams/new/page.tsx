// app/teams/new/page.tsx
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import AdminLayout, { AButton, ButtonLink, SubmitButton } from "@/components/AdminLayout";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export default async function NewTeamPage({
  searchParams,
}: {
  searchParams?: { error?: string };
}) {
  async function createTeam(formData: FormData): Promise<void> {
    "use server";

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

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();
    if (userErr || !user) redirect("/login");

    const raw = (formData.get("name") as string | null) ?? "";
    const name = raw.trim();
    if (!name) redirect("/teams/new?error=Team%20name%20is%20required");

    // 1) create team with owner=user.id
    const { data: team, error: tErr } = await supabase
      .from("teams")
      .insert({ name, owner: user.id })
      .select("id")
      .single();

    if (tErr || !team) {
      redirect(
        "/teams/new?error=" +
          encodeURIComponent(tErr?.message ?? "Failed to create team"),
      );
    }

    // ✅ Narrow before use
    const teamId = team?.id;
    if (!teamId) {
      redirect(
        "/teams/new?error=" + encodeURIComponent("Team created but missing id"),
      );
    }

    // 2) add membership as owner (ignore conflict if already exists)
    const { error: mErr } = await supabase
      .from("team_members")
      .upsert(
        { team_id: teamId, user_id: user.id, role: "owner" },
        { onConflict: "team_id,user_id", ignoreDuplicates: true },
      );

    if (mErr) {
      // Not fatal — inform user but allow progress
      redirect(
        "/teams/new?error=" +
          encodeURIComponent(
            "Team created, but adding owner failed: " + mErr.message,
          ),
      );
    }

    // Success
    redirect("/dashboard");
  }

  return (
    <AdminLayout
      title="Edit Site"
      subtitle={
        <span style={{ color: "#475569" }}>
          Site ID: <code>{siteId}</code>
        </span>
      }
      rightActions={
        <Link
          href="/dashboard"
          style={{ padding: "8px 12px", border: "1px solid #e2e8f0", borderRadius: 8, textDecoration: "none" }}
        >
          Back to dashboard
        </Link>
      }
    >
      {/* keep your status banners & form exactly as-is here */}
    </AdminLayout>
  );
  
  return (
    <main
      style={{ maxWidth: 520, margin: "3rem auto", fontFamily: "system-ui" }}
    >
      <h1 style={{ marginBottom: 8 }}>Create a Team</h1>
      <p style={{ marginTop: 0, color: "#555" }}>
        You’ll be the owner. You can invite members later.
      </p>

      {!!searchParams?.error && (
        <p
          style={{
            background: "#fee",
            border: "1px solid #fbb",
            color: "#900",
            padding: "8px 10px",
            borderRadius: 8,
          }}
        >
          {decodeURIComponent(searchParams.error)}
        </p>
      )}

      <form
        action={createTeam}
        style={{ display: "grid", gap: 12, marginTop: 16 }}
      >
        <label style={{ display: "grid", gap: 6 }}>
          <span>Team name</span>
          <input
            name="name"
            type="text"
            required
            placeholder="e.g., Robo Rhinos"
            style={{
              padding: 10,
              fontSize: 16,
              border: "1px solid #ddd",
              borderRadius: 8,
            }}
          />
        </label>
        <button
          type="submit"
          style={{
            padding: "10px 12px",
            fontSize: 16,
            border: "1px solid #0b6",
            background: "#0b6",
            color: "#fff",
            borderRadius: 8,
          }}
        >
          Create Team
        </button>
      </form>
    </main>
  );
}
