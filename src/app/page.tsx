import Link from "next/link";
import { redirect } from "next/navigation";
import { AutoRefresh } from "@/components/auto-refresh";
import { BoardGrid } from "@/components/board-grid";
import { WeekPicker } from "@/components/week-picker";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { firstName, isLocked } from "@/lib/format";
import { getMe, getMembers, getWeekData, getWeeks } from "@/lib/data";
import { syncScores } from "@/lib/sync";

export default async function BoardPage(props: PageProps<"/">) {
  const me = await getMe();
  if (!me) redirect("/login");
  if (!me.approved) {
    return (
      <Empty>
        you&apos;re in, but the admin still needs to approve you before you can see the board. bug them about it.
      </Empty>
    );
  }

  try {
    await syncScores();
  } catch (e) {
    console.error("score sync failed", e);
  }

  const sp = await props.searchParams;
  const weeks = await getWeeks();
  if (!weeks.length) {
    return (
      <Empty>
        no weeks set up yet.
        {me.is_admin && (
          <Button asChild className="mt-4">
            <Link href="/admin">add some games</Link>
          </Button>
        )}
      </Empty>
    );
  }

  const week = weeks.find((w) => String(w.id) === sp.week) ?? weeks[0];
  const [{ games, picks, picked, adjustments }, members] = await Promise.all([getWeekData(week.id), getMembers()]);

  const mine = new Map(picks.filter((p) => p.user_id === me.id).map((p) => [p.game_id, p.side]));
  const names = new Map(members.map((m) => [m.id, firstName(m.name).toLowerCase()]));
  const openGames = games.filter((g) => !isLocked(g));
  const myOpenLeft = openGames.filter((g) => !mine.has(g.id)).length;
  const pickedCount = new Map<string, number>();
  for (const p of picked) pickedCount.set(p.user_id, (pickedCount.get(p.user_id) ?? 0) + 1);
  const slackers = members.filter((m) => (pickedCount.get(m.id) ?? 0) < games.length && m.id !== me.id && !m.is_bot);
  const anyActive = games.some((g) => g.status === "in" || (g.status === "pre" && isLocked(g)));

  return (
    <div className="space-y-5">
      <AutoRefresh seconds={anyActive ? 45 : 300} />

      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">{week.label}</h1>
          {openGames.length > 0 && (
            <p className="mt-0.5 text-sm text-muted-foreground">
              {myOpenLeft > 0 ? (
                <span className="text-live">you still need {myOpenLeft} pick{myOpenLeft === 1 ? "" : "s"}. </span>
              ) : (
                <span className="text-win">you&apos;re all set. </span>
              )}
              {slackers.length > 0 && <>waiting on {slackers.map((m) => names.get(m.id)).join(", ")}.</>}
            </p>
          )}
        </div>
        {weeks.length > 1 && <WeekPicker weeks={weeks} current={week.id} />}
      </div>

      {games.length === 0 ? (
        <Empty>no games added to this week yet.</Empty>
      ) : (
        <>
          <BoardGrid games={games} members={members} picks={picks} picked={picked} meId={me.id} adjustments={adjustments} />
          <p className="text-center text-xs text-muted-foreground">
            tap a side to put your name on it, tap again to erase. picks lock at kickoff.
          </p>
        </>
      )}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center py-8 text-center text-muted-foreground">{children}</CardContent>
    </Card>
  );
}
