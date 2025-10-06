// app/login/Client.tsx
"use client";

import { FormEvent, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function LoginClient() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);

    // Use current origin so links work on preview & prod
    const origin =
      typeof window !== "undefined"
        ? window.location.origin
        : process.env.NEXT_PUBLIC_SITE_URL;

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${origin}/auth/cb` },
    });

    setLoading(false);
    setMsg(error ? error.message : "Check your email for the sign-in link.");
  }

  return (
    <main
      style={{ maxWidth: 420, margin: "4rem auto", fontFamily: "system-ui" }}
    >
      <h1 style={{ marginBottom: 12 }}>Sign in</h1>
      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
        <input
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{
            padding: 10,
            fontSize: 16,
            border: "1px solid #ddd",
            borderRadius: 8,
          }}
        />
        <button
          disabled={loading}
          style={{
            padding: "10px 12px",
            fontSize: 16,
            border: "1px solid #0b6",
            background: "#0b6",
            color: "#fff",
            borderRadius: 8,
            cursor: "pointer",
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? "Sending…" : "Send magic link"}
        </button>
      </form>

      {msg && (
        <p
          style={{
            marginTop: 12,
            color: msg.startsWith("Check your email") ? "#064" : "#900",
          }}
        >
          {msg}
        </p>
      )}

      {/* Optional: link to dashboard if already logged in */}
      <p style={{ marginTop: 20, fontSize: 14, color: "#666" }}>
        Already signed in? <a href="/dashboard">Go to dashboard</a>
      </p>
    </main>
  );
}
