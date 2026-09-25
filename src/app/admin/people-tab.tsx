import type { Profile } from "@/lib/types";
import { setMember } from "@/app/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// ------------------------------------------------------------ people tab

export function PeopleTab({ people, meId }: { people: Profile[]; meId: string }) {
  const sorted = [...people].sort((a, b) => Number(a.approved) - Number(b.approved));
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
              <span className="min-w-40 flex-1">
                {p.name}
                <span className="block text-xs text-muted-foreground">{p.email}</span>
              </span>
              {!p.approved && <Badge className="bg-live/15 text-live">waiting</Badge>}
              {p.is_admin && <Badge variant="secondary">admin</Badge>}
              {p.id !== meId && (
                <>
                  <form action={setMember.bind(null, p.id, !p.approved, p.approved ? false : p.is_admin)}>
                    <Button type="submit" size="sm" variant={p.approved ? "ghost" : "default"} className={p.approved ? "text-destructive" : ""}>
                      {p.approved ? "remove" : "approve"}
                    </Button>
                  </form>
                  {p.approved && (
                    <form action={setMember.bind(null, p.id, true, !p.is_admin)}>
                      <Button type="submit" size="sm" variant="outline">
                        {p.is_admin ? "unmake admin" : "make admin"}
                      </Button>
                    </form>
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
