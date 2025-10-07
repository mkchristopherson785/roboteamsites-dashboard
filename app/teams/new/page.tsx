// app/teams/new/page.tsx
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import AdminLayout from "@/components/AdminLayout";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

async function getServerSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (n: string) => cookieStore.get(n)?.value,
        set: (n: string, v: string, o: CookieOptions) => {
          try { cookieStore.set(n, v, o); } catch {}
        },
        remove: (n: string, o: CookieOptions) => {
          try { cookieStore.set(n, "", { ...o, maxAge: 0 }); } catch {}
        },
      },
    }
  );
}

export default async function NewTeamPage({
  searchParams,
}: { searchParams?: { error?: string } }) {
  const supabase = await getServerSupabase();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  async function createTeam(formData: FormData) {
    "use server";

    const supabase = await getServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const name = (formData.get("name") as string | null)?.trim() ?? "";
    if (!name) {
      redirect(`/teams/new?${new URLSearchParams({ error: "Team name is required" }).toString()}`);
    }

    // Insert team; adjust columns to match your schema.
    const { data, error } = await supabase
      .from("teams")
      .insert({ name }) // add owner: user.id if your schema needs it
      .select("id")
      .single();

    if (error || !data?.id) {
      redirect(`/teams/new?${new URLSearchParams({ error: error?.message ?? "Failed to create team" }).toString()}`);
    }

    redirect(`/teams/${data.id}`);
  }

  return (
    <AdminLayout
      title="Create a Team"
      subtitle={<span style={{ color: "#475569" }}>Add a new team to manage members and sites.</span>}
      rightActions={
        <Link
          href="/dashboard"
          style={{
            textDecoration: "none",
            border: "1px solid #e2e8f0",
            padding: "8px 12px",
            borderRadius: 8,
          }}
        >
          Back to dashboard
        </Link>
      }
    >
      {!!searchParams?.error && (
        <p
          role="alert"
          style={{
            background: "#fef2f2",
            border: "1px solid #fca5a5",
            color: "#991b1b",
            padding: "8px 10px",
            borderRadius: 8,
            marginTop: 12,
          }}
        >
          {decodeURIComponent(searchParams.error)}
        </p>
      )}

      <form action={createTeam} style={{ display: "grid", gap: 12, marginTop: 12, maxWidth: 520 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span>Team name</span>
          <input
            name="name"
            required
            placeholder="e.g. RoboRaptors"
            style={{
              padding: 10,
              border: "1px solid #cbd5e1",
              borderRadius: 8,
              fontSize: 16,
            }}
          />
        </label>

        <div style={{ display: "flex", gap: 12 }}>
          <button
            type="submit"
            style={{
              padding: "10px 14px",
              border: "1px solid #0b6",
              background: "#0b6",
              color: "#fff",
              borderRadius: 8,
              cursor: "pointer",
            }}
          >
            Create Team
          </button>
          <Link
            href="/dashboard"
            style={{
              padding: "10px 14px",
              border: "1px solid #e2e8f0",
              borderRadius: 8,
              textDecoration: "none",
            }}
          >
            Cancel
          </Link>
        </div>
      </form>
    </AdminLayout>
  );
}