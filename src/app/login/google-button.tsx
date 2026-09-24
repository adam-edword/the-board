"use client";

import Script from "next/script";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// google's own sign-in button. google hands us an id token directly, so the
// sign-in popup says "theboard.eddtv.org" instead of the supabase project url.

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    google?: any;
  }
}

async function sha256(text: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

export function GoogleButton({ supabaseUrl, supabaseKey, clientId }: {
  supabaseUrl: string;
  supabaseKey: string;
  clientId: string;
}) {
  const router = useRouter();
  const slot = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setup = useCallback(async () => {
    const google = window.google;
    if (!google || !slot.current) return;

    // google gets the hashed nonce, supabase checks it against the raw one
    const nonce = crypto.randomUUID();
    const hashed = await sha256(nonce);

    google.accounts.id.initialize({
      client_id: clientId,
      nonce: hashed,
      callback: async ({ credential }: { credential: string }) => {
        setError(null);
        const { error } = await createClient(supabaseUrl, supabaseKey).auth.signInWithIdToken({
          provider: "google",
          token: credential,
          nonce,
        });
        if (error) {
          setError("sign in didn't work, try again");
          return;
        }
        router.replace("/");
        router.refresh();
      },
    });

    google.accounts.id.renderButton(slot.current, {
      type: "standard",
      theme: "filled_black",
      size: "large",
      shape: "pill",
      text: "signin_with",
      width: Math.min(320, slot.current.offsetWidth || 320),
    });
  }, [clientId, supabaseUrl, supabaseKey, router]);

  useEffect(() => {
    if (loaded) setup();
  }, [loaded, setup]);

  return (
    <>
      <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" onReady={() => setLoaded(true)} />
      <div ref={slot} className="flex min-h-11 w-full justify-center" />
      {error && <p className="text-sm text-destructive">{error}</p>}
    </>
  );
}
