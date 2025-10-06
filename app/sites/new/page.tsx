// app/sites/new/page.tsx
import AdminLayout, { ButtonLink, SubmitButton } from "@/components/AdminLayout";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

type Team = { id: string; name: string };

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

// ---- Helpers ----
function errTo(path: string, msg: string) {
  const p = new URLSearchParams({ error: msg });
  redirect(`${path}?${p.toString()}`);
}
const SUBDOMAIN_RE = /^[a-z0-9-]{3,40}$/;
const RESERVED = new Set([
  "www","app","admin","api","assets","static","vercel","docs","help","support",
  "login","dashboard","cdn","img","images","app1","dev","test","staging","prod",
]);
const normalizeSubdomain = (s: string) => s.trim().toLowerCase();

export default async function NewSitePage({
  searchParams,
}: {
  searchParams?: { error?: string };
}) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
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

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Only teams the user can see (RLS enforces membership)
  const { data: teamsRaw, error: teamsErr } = await supabase
    .from("teams")
    .select("id,name")
    .order("name", { ascending: true });

  if (teamsErr) errTo("/sites/new", teamsErr.message);
  const teams: Team[] = teamsRaw ?? [];

  // ---- Server Action ----
  async function createSite(formData: FormData): Promise<void> {
    "use server";

    const cookieStore = await cookies();
    const supabase = createServerClient(
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

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const name = (formData.get("name") as string | null)?.trim() ?? "";
    let subdomain = (formData.get("subdomain") as string | null) ?? "";
    const team_id = (formData.get("team_id") as string | null) ?? "";

    if (!name || !subdomain || !team_id) {
      errTo("/sites/new", "All fields are required");
    }

    subdomain = normalizeSubdomain(subdomain);

    // Validate subdomain
    if (!SUBDOMAIN_RE.test(subdomain)) {
      errTo("/sites/new", "Subdomain must be 3–40 chars, lowercase letters, numbers, or hyphens");
    }
    if (RESERVED.has(subdomain)) {
      errTo("/sites/new", "That subdomain is reserved. Please choose a different one.");
    }
    if (subdomain.startsWith("-") || subdomain.endsWith("-")) {
      errTo("/sites/new", "Subdomain cannot start or end with a hyphen");
    }

    // Ensure user can access the chosen team
    const { data: teamCheck, error: tErr } = await supabase
      .from("teams")
      .select("id")
      .eq("id", team_id)
      .limit(1);

    if (tErr) errTo("/sites/new", `Could not verify team: ${tErr.message}`);
    if (!teamCheck || teamCheck.length === 0) {
      errTo("/sites/new", "You do not have access to the selected team");
    }

    // Unique subdomain (case-insensitive)
    const { data: dupe, error: dErr } = await supabase
      .from("sites")
      .select("id")
      .ilike("subdomain", subdomain)
      .limit(1);

    if (dErr) errTo("/sites/new", `Could not check subdomain: ${dErr.message}`);
    if (dupe && dupe.length > 0) {
      errTo("/sites/new", "That subdomain is already taken");
    }

    // Create site
    const { data: site, error } = await supabase
      .from("sites")
      .insert({ name, subdomain, team_id })
      .select("id")
      .single();

    if (error || !site?.id) {
      errTo("/sites/new", error?.message ?? "Failed to create site");
    }
    const siteId = site.id;

    // Seed default content
    const seed = {
      team: { name, number: "", school: "", city: "", state: "" },
      links: [],
      theme: {
        background: "#f5f7f6",
        card: "#ffffff",
        text: "#18241d",
        headline: "#0b1f16",
        footerText: "#c9e6da",
        accent: "#0f8a5f",
        headerBg: "#ffffff",
        headerText: "#0b1f16",
        buttonText: "#ffffff",
        underlineLinks: true,
      },
      sponsors: { platinum: [], gold: [], silver: [], bronze: [] },
    } as const;

    const { error: seedErr } = await supabase
      .from("site_content")
      .insert({ site_id: siteId, data: seed });

    if (seedErr) {
      errTo("/sites/new", `Site created, but seeding content failed: ${seedErr.message}`);
    }

    // Go straight to the editor
    redirect(`/sites/${siteId}/edit`);
  }

  return (
    <AdminLayout
      title="Create a Site"
      rightActions={
        <Link href="/dashboard" style={{ padding: "8px 12px", border: "1px solid #e2e8f0", borderRadius: 8, textDecoration: "none" }}>
          Back to dashboard
        </Link>
      }
    >
      {!!searchParams?.error && (
        <p role="alert" style={{ background: "#fee", border: "1px solid #fbb", color: "#900", padding: "8px 10px", borderRadius: 8, marginTop: 12 }}>
          {decodeURIComponent(searchParams.error)}
        </p>
      )}
    
      <form action={createSite} style={{ display: "grid", gap: 12, marginTop: 12 }}>
          <label style={{ display: "grid", gap: 6 }}>
          <span>Site Name</span>
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

        <label style={{ display: "grid", gap: 6 }}>
          <span>Subdomain</span>
          <input
            name="subdomain"
            required
            pattern="[a-z0-9-]+"
            placeholder="e.g. roboraptors"
            style={{
              padding: 10,
              border: "1px solid #cbd5e1",
              borderRadius: 8,
              fontSize: 16,
            }}
          />
          <small style={{ color: "#64748b" }}>
            Lowercase, 3–40 chars. Avoid reserved words like “www”, “admin”, “api”, “login”.
          </small>
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span>Team</span>
          <select
            name="team_id"
            required
            defaultValue={teams.length === 1 ? teams[0].id : ""}
            style={{
              padding: 10,
              border: "1px solid #cbd5e1",
              borderRadius: 8,
              fontSize: 16,
              background: "#fff",
            }}
          >
            {teams.length !== 1 && <option value="">Select a team…</option>}
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>

        <div style={{ display: "flex", gap: 12 }}>
          <SubmitButton type="submit" variant="primary">Create Site</SubmitButton>
          <ButtonLink href="/dashboard">Cancel</ButtonLink>
        </div>
      </form>
    </AdminLayout>
  );
}