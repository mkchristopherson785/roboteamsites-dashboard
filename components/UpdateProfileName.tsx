// components/UpdateProfileName.tsx
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

type Props = {
  /** Where to go after save (defaults to /dashboard?saved=1) */
  redirectTo?: string;
};

export default async function UpdateProfileName({ redirectTo = "/dashboard?saved=1" }: Props) {
  // SSR Supabase client
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

  // Require auth
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Load current value
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle<{ full_name: string | null }>();

  // Server action to save
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

    const full_name = (formData.get("full_name") as string | null)?.trim() ?? "";
    await supabase.from("profiles").upsert({ id: user.id, full_name });

    redirect(redirectTo);
  }

  return (
    <form action={save} style={{ display: "grid", gap: 8, maxWidth: 420 }}>
      <label style={{ display: "grid", gap: 6 }}>
        <span style={{ fontWeight: 600 }}>Your display name</span>
        <input
          name="full_name"
          defaultValue={profile?.full_name ?? ""}
          placeholder="e.g. Alex Johnson"
          style={{
            padding: 10,
            border: "1px solid #cbd5e1",
            borderRadius: 8,
            fontSize: 16,
          }}
        />
      </label>
      <button
        type="submit"
        style={{
          padding: "8px 12px",
          border: "1px solid #0b6",
          background: "#0b6",
          color: "#fff",
          borderRadius: 8,
          cursor: "pointer",
          fontWeight: 600,
        }}
      >
        Save name
      </button>
    </form>
  );
}