import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchSchedule, type League } from "@/lib/espn";
import { getMe, getWeekData, getWeeks } from "@/lib/data";
import { kickoffLabel } from "@/lib/format";
import { TeamLogo } from "@/components/team-logo";
import { WeekPicker } from "@/components/week-picker";
import type { Profile } from "@/lib/types";
import { createWeek, deleteWeek, refreshScores, removeGame, renameWeek, setMember } from "@/app/actions";
import { ConfirmButton } from "@/components/confirm-button";
import { AddGameButton } from "./add-game-button";

export default async function AdminPage(props: PageProps<"/admin">) {
  const me = await getMe();
  if (!me?.is_admin) redirect("/");

  const sp = await props.searchParams;
  const weeks = await getWeeks();
  const week = weeks.find((w) => String(w.id) === sp.week) ?? weeks[0];

  const league: League = sp.league === "ncaaf" ? "ncaaf" : "nfl";
  const espnWeek = sp.ew ? Number(sp.ew) : undefined;
  const seasonType = sp.st ? Number(sp.st) : undefined;
  const top25 = sp.top25 === "1";

  const supabase = await createClient();
  const { data: people } = await supabase.from("profiles").select("*").order("created_at");

  const [weekData, schedule] = await Promise.all([
    week ? getWeekData(week.id) : null,
    week ? fetchSchedule(league, { week: espnWeek, seasonType }).catch(() => null) : null,
  ]);
  const added = new Set(weekData?.games.map((g) => g.espn_id));
  let browse = schedule?.games ?? [];
  if (top25) browse = browse.filter((g) => g.homeRank || g.awayRank);

  const q = (over: Record<string, string | number | undefined>) => {
    const p = new URLSearchParams();
    const merged = { week: week?.id, league, ew: schedule?.week, st: schedule?.seasonType, top25: top25 ? 1 : undefined, ...over };
    for (const [k, v] of Object.entries(merged)) if (v !== undefined) p.set(k, String(v));
    return `/admin?${p}`;
  };

  const thisYear = new Date().getFullYear();

  return (
    <div className="space-y-10">
      {/* ------------------------------------------------ weeks */}
      <section className="space-y-4">
        <h1 className="text-2xl font-bold">admin</h1>

        <form action={createWeek} className="flex flex-wrap gap-2">
          <input
            name="label"
            placeholder={`week ${weeks.length + 1}`}
            defaultValue={`week ${weeks.length + 1}`}
            className="flex-1 min-w-32 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
          />
          <input
            name="season"
            type="number"
            defaultValue={week?.season ?? thisYear}
            className="w-24 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
          />
          <button className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-zinc-900">new week</button>
        </form>

        {week && (
          <div className="flex flex-wrap items-center gap-2">
            <WeekPicker weeks={weeks} current={week.id} basePath="/admin" />
            <form action={renameWeek.bind(null, week.id)} className="flex gap-2">
              <input
                name="label"
                defaultValue={week.label}
                className="w-32 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
              />
              <button className="rounded-lg border border-zinc-700 px-3 py-2 text-sm">rename</button>
            </form>
            <form action={refreshScores}>
              <button className="rounded-lg border border-zinc-700 px-3 py-2 text-sm">refresh scores</button>
            </form>
          </div>
        )}
      </section>

      {week && weekData && (
        <>
          {/* ------------------------------------------------ games in this week */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">
              games in {week.label} <span className="text-zinc-500">({weekData.games.length})</span>
            </h2>
            {weekData.games.length === 0 && <p className="text-sm text-zinc-500">none yet, add some below.</p>}
            <ul className="divide-y divide-zinc-800 rounded-xl border border-zinc-800">
              {weekData.games.map((g) => (
                <li key={g.id} className="flex items-center gap-3 p-3 text-sm">
                  <span className="w-12 text-xs uppercase text-zinc-500">{g.league === "nfl" ? "nfl" : "cfb"}</span>
                  <span className="flex-1">
                    {g.away_abbr} @ {g.home_abbr}
                    <span className="ml-2 text-xs text-zinc-500">{kickoffLabel(g.kickoff)}</span>
                  </span>
                  <form action={removeGame.bind(null, g.id)}>
                    <button className="text-xs text-red-400">remove</button>
                  </form>
                </li>
              ))}
            </ul>
          </section>

          {/* ------------------------------------------------ browse espn */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">add games</h2>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              {(["nfl", "ncaaf"] as const).map((l) => (
                <Link
                  key={l}
                  href={q({ league: l, ew: undefined, st: undefined })}
                  className={`rounded-lg px-3 py-1.5 ${league === l ? "bg-white text-zinc-900" : "border border-zinc-700"}`}
                >
                  {l === "nfl" ? "nfl" : "college"}
                </Link>
              ))}
              {schedule && (
                <span className="flex items-center gap-1">
                  <Link href={q({ ew: Math.max(1, schedule.week - 1) })} className="rounded-lg border border-zinc-700 px-2 py-1.5">‹</Link>
                  <span className="px-1">
                    {schedule.seasonType === 3 ? "postseason " : ""}week {schedule.week}
                  </span>
                  <Link href={q({ ew: schedule.week + 1 })} className="rounded-lg border border-zinc-700 px-2 py-1.5">›</Link>
                </span>
              )}
              <Link
                href={q({ st: schedule?.seasonType === 3 ? 2 : 3, ew: 1 })}
                className="rounded-lg border border-zinc-700 px-3 py-1.5"
              >
                {schedule?.seasonType === 3 ? "regular season" : "postseason"}
              </Link>
              {league === "ncaaf" && (
                <Link href={q({ top25: top25 ? undefined : 1 })} className={`rounded-lg px-3 py-1.5 ${top25 ? "bg-white text-zinc-900" : "border border-zinc-700"}`}>
                  top 25 only
                </Link>
              )}
            </div>

            {!schedule && <p className="text-sm text-red-400">couldn&apos;t reach espn, try again in a sec.</p>}
            {schedule && browse.length === 0 && <p className="text-sm text-zinc-500">no games found for that week.</p>}

            <ul className="divide-y divide-zinc-800 rounded-xl border border-zinc-800">
              {browse.map((g) => (
                <li key={g.espnId} className="flex items-center gap-3 p-3 text-sm">
                  <div className="flex flex-1 items-center gap-2 min-w-0">
                    <TeamLogo src={g.awayLogo} size={22} />
                    <span className="truncate">
                      {g.awayRank && <span className="text-xs text-zinc-500">#{g.awayRank} </span>}
                      {g.awayName}
                      <span className="text-zinc-500"> @ </span>
                      {g.homeRank && <span className="text-xs text-zinc-500">#{g.homeRank} </span>}
                      {g.homeName}
                    </span>
                    <TeamLogo src={g.homeLogo} size={22} />
                  </div>
                  <span className="hidden text-xs text-zinc-500 sm:inline">
                    {kickoffLabel(g.kickoff)}
                    {g.network && ` · ${g.network}`}
                  </span>
                  <AddGameButton
                    added={added.has(g.espnId)}
                    args={[week.id, league, g.espnId, schedule!.week, schedule!.seasonType]}
                  />
                </li>
              ))}
            </ul>
          </section>
        </>
      )}

      {/* ------------------------------------------------ members */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">people</h2>
        <p className="text-sm text-zinc-500">
          anyone with a google account can sign in, but they can&apos;t see anything until you approve them here.
        </p>
        <ul className="divide-y divide-zinc-800 rounded-xl border border-zinc-800">
          {((people ?? []) as Profile[]).map((p) => (
            <li key={p.id} className="flex flex-wrap items-center gap-2 p-3 text-sm">
              <span className="flex-1 min-w-40">
                {p.name}
                <span className="block text-xs text-zinc-500">{p.email}</span>
              </span>
              {!p.approved && <span className="rounded bg-amber-500/20 px-2 py-0.5 text-xs text-amber-300">waiting</span>}
              {p.is_admin && <span className="rounded bg-zinc-700 px-2 py-0.5 text-xs">admin</span>}
              {p.id !== me.id && (
                <>
                  <form action={setMember.bind(null, p.id, !p.approved, p.approved ? false : p.is_admin)}>
                    <button className={`rounded-lg px-3 py-1 text-xs ${p.approved ? "border border-zinc-700 text-red-400" : "bg-lime-500 text-zinc-900 font-medium"}`}>
                      {p.approved ? "remove" : "approve"}
                    </button>
                  </form>
                  {p.approved && (
                    <form action={setMember.bind(null, p.id, true, !p.is_admin)}>
                      <button className="rounded-lg border border-zinc-700 px-3 py-1 text-xs">
                        {p.is_admin ? "unmake admin" : "make admin"}
                      </button>
                    </form>
                  )}
                </>
              )}
            </li>
          ))}
        </ul>
      </section>

      {week && (
        <section>
          <form action={deleteWeek.bind(null, week.id)}>
            <ConfirmButton message={`delete ${week.label} and everyone's picks for it? can't undo this.`} className="text-xs text-red-400/70">
              delete {week.label} and all its picks
            </ConfirmButton>
          </form>
        </section>
      )}
    </div>
  );
}
