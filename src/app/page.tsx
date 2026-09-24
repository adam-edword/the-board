import Link from "next/link";
import { redirect } from "next/navigation";
import { AutoRefresh } from "@/components/auto-refresh";
import { BoardGrid } from "@/components/board-grid";
import { GameCard } from "@/components/game-card";
import { WeekPicker } from "@/components/week-picker";
import { firstName, isLocked } from "@/lib/format";
import { getMe, getMembers, getWeekData, getWeeks } from "@/lib/data";
import { syncScores } from "@/lib/sync";
import type { Side } from "@/lib/types";

export default async function BoardPage(props: PageProps<"/">) {
  const me = await getMe();
  if (!me) redirect("/login");
  if (!me.approved) return <Pending />;

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
        no weeks set up yet.{" "}
        {me.is_admin && (
          <Link href="/admin" className="underline">
            add some games
          </Link>
        )}
      </Empty>
    );
  }

  const week = weeks.find((w) => String(w.id) === sp.week) ?? weeks[0];
  const view = sp.view === "board" ? "board" : "picks";
  const [{ games, picks, picked }, members] = await Promise.all([getWeekData(week.id), getMembers()]);

  const mine = new Map(picks.filter((p) => p.user_id === me.id).map((p) => [p.game_id, p.side]));
  const names = new Map(members.map((m) => [m.id, firstName(m.name).toLowerCase()]));
  const openGames = games.filter((g) => !isLocked(g));
  const myOpenLeft = openGames.filter((g) => !mine.has(g.id)).length;
  const pickedCount = new Map<string, number>();
  for (const p of picked) pickedCount.set(p.user_id, (pickedCount.get(p.user_id) ?? 0) + 1);
  const slackers = members.filter((m) => (pickedCount.get(m.id) ?? 0) < games.length && m.id !== me.id);
  const anyActive = games.some((g) => g.status === "in" || (g.status === "pre" && isLocked(g)));

  return (
    <div className="space-y-5">
      <AutoRefresh seconds={anyActive ? 45 : 300} />

      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{week.label}</h1>
        {weeks.length > 1 && <WeekPicker weeks={weeks} current={week.id} extra={view === "board" ? "&view=board" : ""} />}
      </div>

      {openGames.length > 0 && (
        <p className="text-sm text-zinc-400">
          {myOpenLeft > 0 ? (
            <span className="text-amber-400">you still need {myOpenLeft} pick{myOpenLeft === 1 ? "" : "s"}. </span>
          ) : (
            <span className="text-lime-400">you&apos;re all set. </span>
          )}
          {slackers.length > 0 && <>still waiting on {slackers.map((m) => names.get(m.id)).join(", ")}.</>}
        </p>
      )}

      <div className="grid grid-cols-2 rounded-xl bg-zinc-900 p-1 text-sm">
        {(["picks", "board"] as const).map((v) => (
          <Link
            key={v}
            href={`/?week=${week.id}${v === "board" ? "&view=board" : ""}`}
            className={`rounded-lg py-2 text-center ${view === v ? "bg-zinc-700 font-semibold" : "text-zinc-400"}`}
          >
            {v === "picks" ? "my picks" : "the board"}
          </Link>
        ))}
      </div>

      {games.length === 0 ? (
        <Empty>no games added to this week yet.</Empty>
      ) : view === "board" ? (
        <BoardGrid games={games} members={members} picks={picks} picked={picked} meId={me.id} />
      ) : (
        <div className="space-y-3">
          {games.map((g) => {
            let pickers: { home: string[]; away: string[] } | null = null;
            if (isLocked(g)) {
              pickers = { home: [], away: [] };
              for (const p of picks) {
                if (p.game_id === g.id) pickers[p.side as Side].push(names.get(p.user_id) ?? "?");
              }
            }
            return <GameCard key={g.id} game={g} mySide={mine.get(g.id) ?? null} pickers={pickers} />;
          })}
        </div>
      )}
    </div>
  );
}

function Pending() {
  return (
    <Empty>
      you&apos;re in, but the admin still needs to approve you before you can see the board. bug them about it.
    </Empty>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border border-dashed border-zinc-800 p-8 text-center text-zinc-400">{children}</div>;
}
