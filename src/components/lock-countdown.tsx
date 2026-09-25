"use client";

import { useEffect, useState } from "react";
import { LockIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Upcoming = { id: number; kickoff: string; label: string; picked: boolean };

function fmt(ms: number) {
  const m = Math.max(0, Math.round(ms / 60000));
  const d = Math.floor(m / 1440);
  const h = Math.floor((m % 1440) / 60);
  const min = m % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${min}m`;
  return `${min}m`;
}

// "next lock in 2h 14m · BUF @ KC", ticking down. gets loud if you haven't
// picked that game yet.
export function LockCountdown({ games }: { games: Upcoming[] }) {
  // start empty and fill in on the client, so server and browser clocks can't
  // disagree during hydration
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0);
    const id = setInterval(tick, 20_000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, []);
  if (now === null) return null;

  const next = games
    .filter((g) => new Date(g.kickoff).getTime() > now)
    .sort((a, b) => a.kickoff.localeCompare(b.kickoff))[0];
  if (!next) return null;
  const left = new Date(next.kickoff).getTime() - now;
  const urgent = !next.picked && left < 3 * 3600_000;

  return (
    <p className={cn("flex items-center gap-1.5 text-sm", urgent ? "text-live" : "text-muted-foreground")}>
      <LockIcon className="size-3.5" />
      next lock in <b className="font-mono tabular-nums">{fmt(left)}</b> · {next.label}
      {!next.picked && <span className={cn(urgent && "font-medium")}> · you haven&apos;t picked it</span>}
    </p>
  );
}
