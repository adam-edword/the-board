import { redirect } from "next/navigation";
import { CalendarPlusIcon, RefreshCwIcon, TrashIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getMe, getMembers, getWeekData, getWeeks } from "@/lib/data";
import type { Profile } from "@/lib/types";
import { deleteWeek, refreshScores, renameWeek, startNewSeason } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ConfirmButton } from "@/components/confirm-button";
import { AdminShell } from "./admin-shell";
import { ADMIN_TABS, type AdminTab } from "./admin-tabs";
import { GamesTab } from "./games-tab";
import { PeopleTab } from "./people-tab";
import { PickFixer } from "./pick-fixer";


export default async function AdminPage(props: PageProps<"/admin">) {
  const me = await getMe();
  if (!me?.is_admin) redirect("/");

  const sp = await props.searchParams;
  const tab: AdminTab = ADMIN_TABS.some((t) => t.key === sp.tab) ? (sp.tab as AdminTab) : "games";
  const weeks = await getWeeks();
  const week = weeks.find((w) => String(w.id) === sp.week) ?? weeks[0];

  const supabase = await createClient();
  const [{ data: people }, weekData, members] = await Promise.all([
    supabase.from("profiles").select("*").eq("is_bot", false).order("created_at"),
    week ? getWeekData(week.id) : null,
    getMembers(),
  ]);
  const waiting = ((people ?? []) as Profile[]).filter((p) => !p.approved).length;

  // newest season first, each linking to its latest week
  const seasons = [...new Set(weeks.map((w) => w.season))].map((y) => ({
    season: y,
    firstWeekId: weeks.find((w) => w.season === y)!.id,
  }));
  const currentSeason = seasons[0]?.season ?? new Date().getFullYear();

  const noWeeks = <p className="text-sm text-muted-foreground">no weeks yet. hit &quot;new week&quot; to start one.</p>;

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <h1 className="font-heading text-2xl font-semibold tracking-tight">admin</h1>

      <AdminShell
        weeks={week ? weeks.filter((w) => w.season === week.season) : weeks}
        seasons={seasons}
        season={week?.season ?? null}
        weekId={week?.id ?? null}
        initialTab={tab}
        waiting={waiting}
        panels={{
          games: week && weekData ? <GamesTab weekId={week.id} label={week.label} games={weekData.games} /> : noWeeks,
          fix:
            week && weekData ? (
              weekData.games.length ? (
                <Card>
                  <CardHeader>
                    <CardTitle>fix picks for {week.label}</CardTitle>
                    <CardDescription>
                      set anyone&apos;s picks, even after kickoff. changes here show with an asterisk.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <PickFixer
                      key={week.id}
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
            ) : (
              noWeeks
            ),
          people: <PeopleTab people={(people ?? []) as Profile[]} meId={me.id} />,
          week: week ? (
            <Card className="max-w-xl">
              <CardHeader>
                <CardTitle>{week.label} settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <form action={renameWeek.bind(null, week.id)} className="flex gap-2">
                  <Input key={week.id} name="label" defaultValue={week.label} aria-label="week name" />
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
          ) : (
            noWeeks
          ),
          season: (
            <Card className="max-w-xl">
              <CardHeader>
                <CardTitle>season</CardTitle>
                <CardDescription>
                  when {currentSeason} is over, start {currentSeason + 1}. {currentSeason} stays viewable in standings
                  with its champion, and the new season starts fresh at week 0.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form action={startNewSeason}>
                  <ConfirmButton
                    variant="outline"
                    message={`wrap up ${currentSeason} and start the ${currentSeason + 1} season? standings reset for the new season (${currentSeason} is kept as an archive).`}
                  >
                    <CalendarPlusIcon /> start {currentSeason + 1} season
                  </ConfirmButton>
                </form>
              </CardContent>
            </Card>
          ),
        }}
      />
    </div>
  );
}
