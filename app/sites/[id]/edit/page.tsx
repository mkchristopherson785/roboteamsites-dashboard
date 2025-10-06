// app/sites/[id]/edit/page.tsx
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import AdminLayout, { AButton, ButtonLink, SubmitButton } from "@/components/AdminLayout";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

type SiteRow = {
  id: string;
  name: string;
  subdomain: string;
  team_id: string;
  vercel_url: string | null;
};

type LinkItem = { label: string; href: string; external?: boolean };
type Sponsors = {
  platinum: string[];
  gold: string[];
  silver: string[];
  bronze: string[];
};
type Theme = {
  background: string;
  card: string;
  text: string;
  headline: string;
  footerText: string;
  accent: string;
  headerBg: string;
  headerText: string;
  buttonText: string;
  underlineLinks: boolean;
};
type TeamBlock = {
  name: string;
  number: string;
  school: string;
  city: string;
  state: string;
};
type SiteData = {
  team: TeamBlock;
  links: LinkItem[];
  theme: Theme;
  sponsors: Sponsors;
};

type SiteContentRow = {
  id: string;
  site_id: string;
  data: SiteData;
  updated_at: string;
};

function decode<T>(v: FormDataEntryValue | null, fallback: T): T {
  try {
    if (typeof v !== "string" || v.trim() === "") return fallback;
    return JSON.parse(v) as T;
  } catch {
    return fallback;
  }
}

function stringify(v: unknown) {
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return "";
  }
}

export default async function EditSitePage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: { saved?: string; error?: string };
}) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
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
    }
  );

  // Require auth
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Load the site (RLS enforces membership via sites.team_id)
  const { data: site, error: sErr } = await supabase
    .from("sites")
    .select("id,name,subdomain,team_id,vercel_url")
    .eq("id", params.id)
    .single<SiteRow>();

  if (sErr || !site) notFound();

  const siteId = site.id;

  // Load or create (virtually) content row
  const { data: content } = await supabase
    .from("site_content")
    .select("id,site_id,data,updated_at")
    .eq("site_id", siteId)
    .maybeSingle<SiteContentRow>();

  const data: SiteData = content?.data ?? {
    team: { name: site.name, number: "", school: "", city: "", state: "" },
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
  };

  // ---------- Server Action: Save ----------
  async function save(formData: FormData) {
    "use server";

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
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
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const siteName = (formData.get("site_name") as string | null)?.trim() ?? "";
    const subdomain =
      (formData.get("site_subdomain") as string | null)?.trim().toLowerCase() ??
      "";

    if (!siteName || !subdomain) {
      redirect(
        `/sites/${params.id}/edit?error=${encodeURIComponent(
          "Site name and subdomain are required"
        )}`
      );
    }

    const team = decode<TeamBlock>(formData.get("team_json"), data.team);
    const theme = decode<Theme>(formData.get("theme_json"), data.theme);
    const links = decode<LinkItem[]>(formData.get("links_json"), data.links);
    const sponsors = decode<Sponsors>(
      formData.get("sponsors_json"),
      data.sponsors
    );

    const { error: siteErr } = await supabase
      .from("sites")
      .update({ name: siteName, subdomain })
      .eq("id", siteId);

    if (siteErr) {
      redirect(
        `/sites/${params.id}/edit?error=${encodeURIComponent(siteErr.message)}`
      );
    }

    if (content?.id) {
      const { error: upErr } = await supabase
        .from("site_content")
        .update({ data: { team, theme, links, sponsors } as SiteData })
        .eq("id", content.id);
      if (upErr) {
        redirect(
          `/sites/${params.id}/edit?error=${encodeURIComponent(upErr.message)}`
        );
      }
    } else {
      const { error: insErr } = await supabase
        .from("site_content")
        .insert({
          site_id: siteId,
          data: { team, theme, links, sponsors } as SiteData,
        });
      if (insErr) {
        redirect(
          `/sites/${params.id}/edit?error=${encodeURIComponent(insErr.message)}`
        );
      }
    }

    redirect(`/sites/${params.id}/edit?saved=1`);
  }

  const liveUrl =
    site.vercel_url ??
    (process.env.NEXT_PUBLIC_PUBLIC_HOST
      ? `https://${site.subdomain}.${process.env.NEXT_PUBLIC_PUBLIC_HOST}`
      : "");

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
      style={{
        maxWidth: 1000,
        margin: "2.5rem auto",
        fontFamily: "system-ui",
        lineHeight: 1.45,
      }}
    >
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 16,
        }}
      >
        <div>
          <h1 style={{ margin: 0 }}>Edit Site</h1>
          <p style={{ margin: "6px 0 0", color: "#475569" }}>
            Site ID: <code>{siteId}</code>{" "}
            {liveUrl && (
              <>
                · Public:{" "}
                <Link href={`/sites/${siteId}`} target="_blank">
                  View public page
                </Link>
                {site.subdomain && (
                  <>
                    {" "}|{" "}
                    <Link href={`/site/${site.subdomain}`} target="_blank">
                      View by subdomain
                    </Link>
                  </>
                )}
                {" "}|{" "}
                {/* API download can be a normal <a> since it's not a Next page */}
                <a href={`/api/sites/${siteId}/export`} target="_blank" rel="noreferrer">
                  Download static HTML
                </a>
              </>
            )}
          </p>
        </div>
        <Link
          href="/dashboard"
          style={{
            textDecoration: "none",
            border: "1px solid #e2e8f0",
            padding: "8px 12px",
            borderRadius: 8,
          }}
        >
          ← Back to dashboard
        </Link>
      </header>

      {!!searchParams?.saved && (
        <p
          role="status"
          style={{
            marginTop: 12,
            padding: "8px 10px",
            borderRadius: 8,
            background: "#ecfdf5",
            border: "1px solid #10b981",
            color: "#065f46",
          }}
        >
          Changes saved.
        </p>
      )}
      {!!searchParams?.error && (
        <p
          role="alert"
          style={{
            marginTop: 12,
            padding: "8px 10px",
            borderRadius: 8,
            background: "#fef2f2",
            border: "1px solid #fca5a5",
            color: "#991b1b",
          }}
        >
          {decodeURIComponent(searchParams.error)}
        </p>
      )}

      <form action={save} style={{ marginTop: 18, display: "grid", gap: 18 }}>
        {/* Basic site settings */}
        <section
          style={{
            border: "1px solid #e2e8f0",
            borderRadius: 12,
            padding: 16,
            background: "#fff",
          }}
        >
          <h2 style={{ marginTop: 0 }}>Site</h2>
          <div style={{ display: "grid", gap: 12, maxWidth: 520 }}>
            <label style={{ display: "grid", gap: 6 }}>
              <span>Site name</span>
              <input
                name="site_name"
                defaultValue={site.name}
                required
                style={{
                  padding: 10,
                  border: "1px solid #cbd5e1",
                  borderRadius: 8,
                }}
              />
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              <span>Subdomain</span>
              <input
                name="site_subdomain"
                defaultValue={site.subdomain}
                required
                pattern="[a-z0-9-]+"
                style={{
                  padding: 10,
                  border: "1px solid #cbd5e1",
                  borderRadius: 8,
                }}
              />
              <small style={{ color: "#64748b" }}>
                lowercase letters, numbers, hyphens
              </small>
            </label>
          </div>
        </section>

        {/* Team block */}
        <section
          style={{
            border: "1px solid #e2e8f0",
            borderRadius: 12,
            padding: 16,
            background: "#fff",
          }}
        >
          <h2 style={{ marginTop: 0 }}>Team</h2>
          <p style={{ marginTop: 0, color: "#64748b" }}>
            Quick form (we’ll render this on the public page).
          </p>
          <div style={{ display: "grid", gap: 10, maxWidth: 600 }}>
            <label style={{ display: "grid", gap: 6 }}>
              <span>Team JSON</span>
              <textarea
                name="team_json"
                rows={8}
                defaultValue={stringify(data.team)}
                style={{
                  fontFamily: "ui-monospace, Menlo, monospace",
                  padding: 10,
                  border: "1px solid #cbd5e1",
                  borderRadius: 8,
                }}
              />
            </label>
          </div>
        </section>

        {/* Theme */}
        <section
          style={{
            border: "1px solid #e2e8f0",
            borderRadius: 12,
            padding: 16,
            background: "#fff",
          }}
        >
          <h2 style={{ marginTop: 0 }}>Theme</h2>
          <p style={{ marginTop: 0, color: "#64748b" }}>
            Colors & toggles used by your site’s template.
          </p>
          <label style={{ display: "grid", gap: 6 }}>
            <span>Theme JSON</span>
            <textarea
              name="theme_json"
              rows={10}
              defaultValue={stringify(data.theme)}
              style={{
                fontFamily: "ui-monospace, Menlo, monospace",
                padding: 10,
                border: "1px solid #cbd5e1",
                borderRadius: 8,
              }}
            />
          </label>
        </section>

        {/* Links */}
        <section
          style={{
            border: "1px solid #e2e8f0",
            borderRadius: 12,
            padding: 16,
            background: "#fff",
          }}
        >
          <h2 style={{ marginTop: 0 }}>Quick Links</h2>
          <p style={{ marginTop: 0, color: "#64748b" }}>
            Array like:{" "}
            <code>
              [{`{ "label": "FTC", "href": "https://firstinspires.org/robotics/ftc" }`}]
            </code>
          </p>
          <label style={{ display: "grid", gap: 6 }}>
            <span>Links JSON</span>
            <textarea
              name="links_json"
              rows={8}
              defaultValue={stringify(data.links)}
              style={{
                fontFamily: "ui-monospace, Menlo, monospace",
                padding: 10,
                border: "1px solid #cbd5e1",
                borderRadius: 8,
              }}
            />
          </label>
        </section>

        {/* Sponsors */}
        <section
          style={{
            border: "1px solid #e2e8f0",
            borderRadius: 12,
            padding: 16,
            background: "#fff",
          }}
        >
          <h2 style={{ marginTop: 0 }}>Sponsors</h2>
          <p style={{ marginTop: 0, color: "#64748b" }}>
            Object with tiers:{" "}
            <code>{`{ "platinum": [], "gold": [], "silver": [], "bronze": [] }`}</code>
          </p>
          <label style={{ display: "grid", gap: 6 }}>
            <span>Sponsors JSON</span>
            <textarea
              name="sponsors_json"
              rows={10}
              defaultValue={stringify(data.sponsors)}
              style={{
                fontFamily: "ui-monospace, Menlo, monospace",
                padding: 10,
                border: "1px solid #cbd5e1",
                borderRadius: 8,
              }}
            />
          </label>
        </section>

        <div style={{ display: "flex", gap: 12 }}>
          <button
            type="submit"
            formAction={save}
            style={{
              padding: "10px 14px",
              border: "1px solid #0b6",
              background: "#0b6",
              color: "#fff",
              borderRadius: 8,
              cursor: "pointer",
            }}
          >
            Save changes
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
    </main>
  );
}