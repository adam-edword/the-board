"use client";

import { useOptimistic, useState, useTransition } from "react";
import { setPick } from "@/app/actions";
import { isLocked, kickoffLabel } from "@/lib/format";
import type { Game, Side } from "@/lib/types";
import { TeamLogo } from "./team-logo";

type Props = {
  game: Game;
  mySide: Side | null;
  // names of who took each side, only filled in once the game has kicked off
  pickers: { home: string[]; away: string[] } | null;
};

export function GameCard({ game, mySide, pickers }: Props) {
  const [side, setOptimisticSide] = useOptimistic(mySide);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const locked = isLocked(game);

  function choose(next: Side) {
    if (isLocked(game)) return setError("that game already kicked off");
    const value = side === next ? null : next; // tap your pick again to clear it
    setError(null);
    startTransition(async () => {
      setOptimisticSide(value);
      const res = await setPick(game.id, value);
      if (res?.error) setError(res.error);
    });
  }

  const final = game.status === "post";
  const live = game.status === "in";
  const result = final && side ? (game.winner === side ? "win" : "loss") : null;

  return (
    <div
      className={`rounded-2xl border p-3 transition ${
        result === "win"
          ? "border-lime-500/50 bg-lime-500/5"
          : result === "loss"
            ? "border-red-500/40 bg-red-500/5"
            : "border-zinc-800 bg-zinc-900/60"
      }`}
    >
      <div className="mb-2 flex items-center justify-between text-xs text-zinc-400">
        <span className="uppercase tracking-wide">{game.league === "nfl" ? "nfl" : "college"}</span>
        <span className={live ? "font-semibold text-amber-400" : ""}>
          {game.status === "pre" ? kickoffLabel(game.kickoff) : (game.status_detail ?? "").toLowerCase()}
          {!locked && !side && <span className="ml-2 text-amber-400">needs a pick</span>}
          {locked && game.status === "pre" && " · locked"}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {(["away", "home"] as const).map((s) => {
          const chosen = side === s;
          const won = final && game.winner === s;
          const names = pickers?.[s] ?? [];
          return (
            <button
              key={s}
              onClick={() => choose(s)}
              disabled={locked || pending}
              className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-3 text-center transition active:scale-[0.97] disabled:active:scale-100 ${
                chosen
                  ? "border-white bg-white text-zinc-900"
                  : "border-zinc-800 bg-zinc-950 text-zinc-100"
              } ${locked && !chosen ? "opacity-70" : ""}`}
            >
              <TeamLogo src={game[`${s}_logo`]} size={36} />
              <span className="text-sm font-semibold leading-tight">
                {game[`${s}_rank`] && <span className="mr-1 text-xs font-normal opacity-60">#{game[`${s}_rank`]}</span>}
                {game[`${s}_name`]}
              </span>
              <span className="text-[11px] opacity-60">{s === "home" ? "home" : "away"}</span>
              {game.status !== "pre" && game.status !== "void" && (
                <span className={`font-mono text-2xl font-bold ${won ? "" : final ? "opacity-40" : ""}`}>
                  {game[`${s}_score`] ?? 0}
                </span>
              )}
              {names.length > 0 && (
                <span className={`mt-1 text-[11px] leading-snug ${chosen ? "text-zinc-600" : "text-zinc-400"}`}>
                  {names.join(", ")}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {game.status === "void" && <p className="mt-2 text-xs text-zinc-400">game canceled/postponed, doesn&apos;t count</p>}
      {final && game.winner === "tie" && <p className="mt-2 text-xs text-zinc-400">tie, nobody gets the point</p>}
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </div>
  );
}
