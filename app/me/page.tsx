"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function Me() {
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setEmail(user?.email ?? null);
      setLoading(false);
    })();
  }, []);

  if (loading)
    return <p style={{ padding: 20, fontFamily: "system-ui" }}>Loading…</p>;
  return (
    <main style={{ padding: 20, fontFamily: "system-ui" }}>
      <h1>/me</h1>
      {email ? (
        <p>
          Signed in as <b>{email}</b>
        </p>
      ) : (
        <p>Not signed in</p>
      )}
    </main>
  );
}
