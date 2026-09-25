import Link from "next/link";
import { redirect } from "next/navigation";
import { PlusIcon, RefreshCwIcon, TrashIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";
import { getMe, getMembers, getWeekData, getWeeks } from "@/lib/data";
import type { Profile } from "@/lib/types";
import { createNextWeek, deleteWeek, refreshScores, renameWeek } from "@/app/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ConfirmButton } from "@/components/confirm-button";
import { GamesTab } from "./games-tab";
import { PeopleTab } from "./people-tab";
import { PickFixer } from "./pick-fixer";

const TABS = [
  { key: "games", label: "games" },
  { key: "fix", label: "fix picks" },
  { key: "people", label: "people" },
  { key: "week", label: "week settings" },
] as const;
type Tab = (typeof TABS)[number]["key"];

export default async function AdminPage(props: PageProps<"/admin">) {
  const me = await getMe();
  if (!me?.is_admin) redirect("/");

  const sp = await props.searchParams;
  const tab: Tab = TABS.some((t) => t.key === sp.tab) ? (sp.tab as Tab) : "games";
  const weeks = await getWeeks();
  const week = weeks.find((w) => String(w.id) === sp.week) ?? weeks[0];

  const supabase = await createClient();
  const [{ data: people }, weekData, members] = await Promise.all([
    supabase.from("profiles").select("*").eq("is_bot", false).order("created_at"),
    week ? getWeekData(week.id) : null,
    getMembers(),
  ]);
  const waiting = ((people ?? []) as Profile[]).filter((p) => !p.approved).length;

  const href = (over: Record<string, string | number | undefined>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ week: week?.id, tab, ...over })) if (v !== undefined) p.set(k, String(v));
    return `/admin?${p}`;
  };

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <h1 className="font-heading text-2xl font-semibold tracking-tight">admin</h1>

      {/* week chips, oldest to newest, plus a one-tap new week */}
      <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1">
        {[...weeks].reverse().map((w) => (
          <Button key={w.id} asChild size="sm" variant={w.id === week?.id ? "default" : "outline"} className="shrink-0">
            <Link href={href({ week: w.id })}>{w.label}</Link>
          </Button>
        ))}
        <form action={createNextWeek} className="shrink-0">
          <Button type="submit" size="sm" variant="ghost">
            <PlusIcon /> new week
          </Button>
        </form>
      </div>

      {/* section tabs */}
      <nav className="flex gap-1 border-b">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={href({ tab: t.key })}
            className={cn(
              "-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm transition-colors",
              tab === t.key ? "border-foreground font-medium" : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
            {t.key === "people" && waiting > 0 && <Badge className="h-4 bg-live/15 px-1.5 text-live">{waiting}</Badge>}
          </Link>
        ))}
      </nav>

      {!week && tab !== "people" ? (
        <p className="text-sm text-muted-foreground">no weeks yet. hit &quot;new week&quot; to start one.</p>
      ) : tab === "games" && week && weekData ? (
        <GamesTab weekId={week.id} label={week.label} games={weekData.games} sp={sp} href={href} />
      ) : tab === "fix" && week && weekData ? (
        weekData.games.length ? (
          <Card>
            <CardHeader>
              <CardTitle>fix picks for {week.label}</CardTitle>
              <CardDescription>set anyone&apos;s picks, even after kickoff. changes here show with an asterisk.</CardDescription>
            </CardHeader>
            <CardContent>
              <PickFixer
                weekId={week.id}
                games={weekData.games}
                picks={weekData.picks}
                adjustments={weekData.adjustments}
                members={members}
              />
            </CardContent>
          </Card>
        ) : (
          <p className="text-sm text-muted-foreground">add some games to {week.label} first.</p>
        )
      ) : tab === "people" ? (
        <PeopleTab people={(people ?? []) as Profile[]} meId={me.id} />
      ) : tab === "week" && week ? (
        <Card className="max-w-xl">
          <CardHeader>
            <CardTitle>{week.label} settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <form action={renameWeek.bind(null, week.id)} className="flex gap-2">
              <Input name="label" defaultValue={week.label} aria-label="week name" />
              <Button type="submit" variant="outline">
                rename
              </Button>
            </form>
            <form action={refreshScores} className="space-y-1">
              <Button type="submit" variant="outline">
                <RefreshCwIcon /> refresh scores from espn
              </Button>
              <p className="text-xs text-muted-foreground">scores update on their own; this just forces it now.</p>
            </form>
            <form action={deleteWeek.bind(null, week.id)}>
              <ConfirmButton message={`delete ${week.label} and everyone's picks for it? can't undo this.`}>
                <TrashIcon /> delete {week.label}
              </ConfirmButton>
            </form>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
