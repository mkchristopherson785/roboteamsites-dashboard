// app/dashboard/page.tsx
import Link from "next/link";
import DeleteSiteButton from "@/components/DeleteSiteButton";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

type Team = { id: string; name: string; created_at: string };
type Site = {
  id: string;
  name: string;
  subdomain: string;
  team_id: string;
  vercel_url: string | null;
  created_at?: string;
};

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export default async function DashboardPage() {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => cookieStore.get(name)?.value,
        set: (name: string, value: string, options: CookieOptions) => {
          try { cookieStore.set(name, value, options); } catch {}
        },
        remove: (name: string, options: CookieOptions) => {
          try { cookieStore.set(name, "", { ...options, maxAge: 0 }); } catch {}
        },
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: teamsRaw } = await supabase
    .from("teams")
    .select("id,name,created_at");
  const teams: Team[] = teamsRaw ?? [];

  const { data: sitesRaw } = await supabase
    .from("sites")
    .select("id,name,subdomain,team_id,vercel_url,created_at");
  const sites: Site[] = sitesRaw ?? [];

  const isEmpty = teams.length === 0 && sites.length === 0;
  const publicHost = process.env.NEXT_PUBLIC_PUBLIC_HOST;

  return (
    <main
      style={{
        maxWidth: "min(90%, 1000px)",
        margin: "3rem auto",
        padding: "0 2rem",
        fontFamily: "system-ui",
        lineHeight: 1.5,
        wordWrap: "break-word",
        overflowWrap: "break-word",
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 24,
        }}
      >
        <div>
          <h1 style={{ margin: 0 }}>Dashboard</h1>
          <p style={{ color: "#888", margin: 0 }}>build: v13</p>
          <p style={{ margin: "6px 0 0" }}>
            Signed in as <b>{user.email}</b>
          </p>
        </div>
        <Link
          href="/auth/signout"
          style={{
            padding: "8px 12px",
            border: "1px solid #ddd",
            borderRadius: 8,
            textDecoration: "none",
          }}
        >
          Sign out
        </Link>
      </header>

      {isEmpty && (
        <section
          style={{
            marginTop: 8,
            border: "1px dashed #cbd5e1",
            borderRadius: 12,
            padding: 16,
            background: "#f8fafc",
          }}
        >
          <h3 style={{ marginTop: 0 }}>Get started</h3>
          <p style={{ marginTop: 8, color: "#334155" }}>
            It looks like you don’t have any teams or sites yet. You can create
            them manually, or let us create a starter team and site for you.
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link
              href="/teams/new"
              style={{
                padding: "8px 12px",
                border: "1px solid #ddd",
                borderRadius: 8,
                textDecoration: "none",
              }}
            >
              + New Team
            </Link>
            <Link
              href="/sites/new"
              style={{
                padding: "8px 12px",
                border: "1px solid #ddd",
                borderRadius: 8,
                textDecoration: "none",
              }}
            >
              + New Site
            </Link>
            <form action="/api/bootstrap" method="post">
              <button
                type="submit"
                style={{
                  padding: "8px 12px",
                  border: "1px solid #0b6",
                  background: "#0b6",
                  color: "#fff",
                  borderRadius: 8,
                  cursor: "pointer",
                }}
              >
                Create starter team & site
              </button>
            </form>
          </div>
        </section>
      )}

      {/* Teams Section */}
      <section style={{ marginTop: 24 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <h2 style={{ margin: "0 0 8px" }}>Your Teams</h2>
          <Link href="/teams/new" style={{ fontWeight: 600, textDecoration: "none" }}>
            + New Team
          </Link>
        </div>
        {teams.length === 0 ? (
          <p style={{ color: "#555" }}>
            You’re not in any teams yet. Create one to get started.
          </p>
        ) : (
          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: 0,
              display: "grid",
              gap: 12,
            }}
          >
            {teams.map((t) => (
              <li
                key={t.id}
                style={{
                  border: "1px solid #e6e6e6",
                  borderRadius: 12,
                  padding: 12,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700 }}>{t.name}</div>
                    <div style={{ fontSize: 12, color: "#666" }}>
                      Team ID: {t.id}
                    </div>
                  </div>
                  <Link
                    href={`/teams/${t.id}`}
                    style={{
                      background: "#0ea5e9",
                      color: "#fff",
                      padding: "6px 12px",
                      borderRadius: 6,
                      textDecoration: "none",
                      fontSize: 14,
                    }}
                  >
                    Open
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Sites Section */}
      <section style={{ marginTop: 36 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <h2 style={{ margin: "0 0 8px" }}>Your Sites</h2>
          <Link href="/sites/new" style={{ fontWeight: 600, textDecoration: "none" }}>
            + New Site
          </Link>
        </div>
        {sites.length === 0 ? (
          <p style={{ color: "#555" }}>
            No sites yet. Create one and publish with one click.
          </p>
        ) : (
          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: 0,
              display: "grid",
              gap: 12,
            }}
          >
            {sites.map((s) => {
              const subdomainUrl = publicHost ? `https://${s.subdomain}.${publicHost}` : null;
              return (
                <li
                  key={s.id}
                  style={{
                    border: "1px solid #e6e6e6",
                    borderRadius: 12,
                    padding: 12,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: 12,
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700 }}>{s.name}</div>
                      <div style={{ fontSize: 12, color: "#666" }}>
                        Subdomain: <code>{s.subdomain}</code> · Team:{" "}
                        <code>{s.team_id}</code>
                      </div>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                        flexWrap: "wrap",
                        justifyContent: "flex-end",
                      }}
                    >
                      <a
                        href={`/sites/${s.id}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          padding: "6px 12px",
                          background: "#f1f5f9",
                          border: "1px solid #cbd5e1",
                          borderRadius: 6,
                          textDecoration: "none",
                          color: "#0f172a",
                          fontSize: 14,
                        }}
                      >
                        View Public
                      </a>

                      {subdomainUrl && (
                        <a
                          href={subdomainUrl}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            padding: "6px 12px",
                            background: "#f1f5f9",
                            border: "1px solid #cbd5e1",
                            borderRadius: 6,
                            textDecoration: "none",
                            color: "#0f172a",
                            fontSize: 14,
                          }}
                        >
                          Visit
                        </a>
                      )}

                      <Link
                        href={`/sites/${s.id}/edit`}
                        style={{
                          padding: "6px 12px",
                          background: "#0b6",
                          border: "1px solid #0b6",
                          borderRadius: 6,
                          textDecoration: "none",
                          color: "#fff",
                          fontSize: 14,
                        }}
                      >
                        Manage
                      </Link>

                      <DeleteSiteButton siteId={s.id} siteName={s.name} />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}