"use client";

import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";
import type { Profile } from "@/lib/types";
import { setMember } from "@/app/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Change = { id: string; approved: boolean; is_admin: boolean };

export function PeopleTab({ people, meId }: { people: Profile[]; meId: string }) {
  const [shown, change] = useOptimistic(people, (all: Profile[], c: Change) =>
    all.map((p) => (p.id === c.id ? { ...p, approved: c.approved, is_admin: c.is_admin } : p)),
  );
  const [, start] = useTransition();
  const sorted = [...shown].sort((a, b) => Number(a.approved) - Number(b.approved));

  function set(c: Change) {
    start(async () => {
      change(c);
      try {
        await setMember(c.id, c.approved, c.is_admin);
      } catch {
        toast.error("couldn't save that, try again");
      }
    });
  }

  return (
    <Card className="max-w-3xl">
      <CardHeader>
        <CardTitle>people</CardTitle>
        <CardDescription>anyone can sign in with google, but they can&apos;t see the board until you approve them.</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="divide-y rounded-lg border">
          {sorted.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center gap-2 px-3 py-2 text-sm">
              <span className="min-w-40 flex-1">{p.name}</span>
              {!p.approved && <Badge className="bg-live/15 text-live">waiting</Badge>}
              {p.is_admin && <Badge variant="secondary">admin</Badge>}
              {p.id !== meId && (
                <>
                  <Button
                    size="sm"
                    variant={p.approved ? "ghost" : "default"}
                    className={p.approved ? "text-destructive" : ""}
                    onClick={() => set({ id: p.id, approved: !p.approved, is_admin: p.approved ? false : p.is_admin })}
                  >
                    {p.approved ? "remove" : "approve"}
                  </Button>
                  {p.approved && (
                    <Button size="sm" variant="outline" onClick={() => set({ id: p.id, approved: true, is_admin: !p.is_admin })}>
                      {p.is_admin ? "unmake admin" : "make admin"}
                    </Button>
                  )}
                </>
              )}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
