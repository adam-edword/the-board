"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

// local dev only (the login page never renders this in production): one tap
// sign-in as the users from supabase/seed.sql, no google oauth client needed
const USERS = [
  { email: "admin@local.test", label: "admin" },
  { email: "player@local.test", label: "player" },
  { email: "new@local.test", label: "new sign-up" },
];

export function DevLogin({
  supabaseUrl,
  supabaseKey,
}: {
  supabaseUrl: string;
  supabaseKey: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function signIn(email: string) {
    setError(null);
    start(async () => {
      const { error } = await createClient(
        supabaseUrl,
        supabaseKey,
      ).auth.signInWithPassword({
        email,
        password: "password",
      });
      if (error) {
        setError(
          `${error.message}. is the local supabase running with the seed users?`,
        );
        return;
      }
      router.replace("/");
      router.refresh();
    });
  }

  return (
    <div className="space-y-2 border-t border-dashed pt-3">
      <p className="text-xs text-muted-foreground">
        dev: sign in as a seed user
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        {USERS.map((u) => (
          <Button
            key={u.email}
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => signIn(u.email)}
          >
            {u.label}
          </Button>
        ))}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
