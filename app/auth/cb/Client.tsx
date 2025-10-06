// app/auth/cb/Client.tsx
"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function Client() {
  const router = useRouter();
  const params = useSearchParams();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const removeHash = () => {
      if (typeof window !== "undefined" && window.location.hash) {
        const { protocol, host, pathname, search } = window.location;
        const clean = `${protocol}//${host}${pathname}${search}`;
        window.history.replaceState(null, "", clean);
      }
    };

    const setSsrCookies = async (
      access_token: string,
      refresh_token: string,
    ) => {
      await fetch("/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ access_token, refresh_token }),
        credentials: "include",
      });
    };

    const postLoginHousekeeping = async () => {
      // Create default team/site if none exist
      await fetch("/api/bootstrap", { method: "POST", credentials: "include" });
      // Accept any pending team invites for this email
      await fetch("/api/accept-invites", {
        method: "POST",
        credentials: "include",
      });
    };

    (async () => {
      try {
        // ---- Case A: Magic link (hash fragment tokens) ----
        const hash = typeof window !== "undefined" ? window.location.hash : "";
        if (hash && hash.includes("access_token=")) {
          const sp = new URLSearchParams(hash.replace(/^#/, ""));
          const access_token = sp.get("access_token") ?? undefined;
          const refresh_token = sp.get("refresh_token") ?? undefined;

          if (access_token && refresh_token) {
            // Client session
            await supabase.auth.setSession({ access_token, refresh_token });
            // Server cookies for SSR
            await setSsrCookies(access_token, refresh_token);
            // Post-login tasks
            await postLoginHousekeeping();
            // Clean URL + go
            removeHash();
            router.replace("/dashboard");
            return;
          }
        }

        // ---- Case B: OAuth/PKCE ?code= ----
        const errorDesc = params.get("error_description");
        if (errorDesc) {
          router.replace(`/login?error=${encodeURIComponent(errorDesc)}`);
          return;
        }

        const code = params.get("code");
        if (code) {
          const href =
            typeof window !== "undefined" ? window.location.href : "";
          const { data, error } =
            await supabase.auth.exchangeCodeForSession(href);
          if (error) {
            router.replace(`/login?error=${encodeURIComponent(error.message)}`);
            return;
          }

          const at = data.session?.access_token;
          const rt = data.session?.refresh_token;
          if (at && rt) {
            await setSsrCookies(at, rt);
            await postLoginHousekeeping();
          }

          router.replace("/dashboard");
          return;
        }

        // Nothing we recognize → back to login
        router.replace("/login?error=Missing+auth+params");
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Auth error";
        router.replace(`/login?error=${encodeURIComponent(msg)}`);
      }
    })();
  }, [router, params]);

  return (
    <p style={{ padding: 20, fontFamily: "system-ui" }}>Signing you in…</p>
  );
}
