"use client";

import { useState } from "react";

type Line = { label: string; points: number; played: boolean; done: boolean; won: boolean; coin: number | null };

// one series: this player's points per week, in their marker color.
// bars have rounded tops on a shared baseline; hover (or tap) shows details.
export function WeeklyPoints({ weeks, color }: { weeks: Line[]; color: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...weeks.map((w) => w.points), ...weeks.map((w) => w.coin ?? 0));
  const H = 140;
  const active = hover !== null ? weeks[hover] : null;

  return (
    <div>
      <div className="mb-2 h-5 text-sm">
        {active ? (
          <span>
            <span className="text-muted-foreground">{active.label}:</span>{" "}
            {active.played ? (
              <>
                <b className="font-mono">{active.points}</b> pts
                {active.won && " · won the week"}
                {active.coin !== null && active.done && <span className="text-muted-foreground"> · coin had {active.coin}</span>}
                {!active.done && <span className="text-muted-foreground"> · in progress</span>}
              </>
            ) : (
              <span className="text-muted-foreground">didn&apos;t play</span>
            )}
          </span>
        ) : (
          <span className="text-muted-foreground">hover or tap a week</span>
        )}
      </div>

      <div className="flex items-end gap-2 border-b border-border/60" style={{ height: H }} onMouseLeave={() => setHover(null)}>
        {weeks.map((w, i) => {
          const h = w.played ? Math.max(2, (w.points / max) * (H - 8)) : 0;
          return (
            <button
              key={w.label}
              type="button"
              aria-label={`${w.label}: ${w.played ? `${w.points} points` : "didn't play"}`}
              onMouseEnter={() => setHover(i)}
              onFocus={() => setHover(i)}
              onClick={() => setHover(i)}
              className="group relative flex h-full flex-1 items-end justify-center outline-none"
            >
              <span
                className="w-full max-w-10 rounded-t-[4px] transition-opacity"
                style={{
                  height: h,
                  backgroundColor: color,
                  opacity: hover === null || hover === i ? (w.done ? 0.9 : 0.45) : 0.35,
                }}
              />
            </button>
          );
        })}
      </div>
      <div className="mt-1 flex gap-2">
        {weeks.map((w) => (
          <span key={w.label} className="flex-1 truncate text-center text-[11px] text-muted-foreground">
            {w.label.replace(/^week\s*/i, "wk ")}
          </span>
        ))}
      </div>

      {/* same data as a table for screen readers */}
      <table className="sr-only">
        <caption>points by week</caption>
        <thead>
          <tr>
            <th>week</th>
            <th>points</th>
          </tr>
        </thead>
        <tbody>
          {weeks.map((w) => (
            <tr key={w.label}>
              <td>{w.label}</td>
              <td>{w.played ? w.points : "didn't play"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
