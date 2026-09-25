"use client";

import Link from "next/link";
import { useState } from "react";
import { PlusIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { createNextWeek } from "@/app/actions";
import type { Week } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { ADMIN_TABS, type AdminTab } from "./admin-tabs";

// week chips + section tabs. tabs switch instantly (everything is already
// rendered); the url is kept in sync so a refresh lands on the same tab.
export function AdminShell({ weeks, seasons, season, weekId, initialTab, waiting, panels }: {
  weeks: Week[];
  seasons: { season: number; firstWeekId: number }[];
  season: number | null;
  weekId: number | null;
  initialTab: AdminTab;
  waiting: number;
  panels: Record<AdminTab, React.ReactNode>;
}) {
  const [tab, setTab] = useState(initialTab);
  const [creating, setCreating] = useState(false);

  function pick(t: AdminTab) {
    setTab(t);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", t);
    window.history.replaceState(window.history.state, "", url);
  }

  return (
    <>
      {/* season switcher (only once there's more than one) */}
      {seasons.length > 1 && (
        <div className="flex gap-1 text-sm">
          {seasons.map((s) => (
            <Link
              key={s.season}
              href={`/admin?week=${s.firstWeekId}&tab=${tab}`}
              className={cn(
                "rounded-md px-2 py-0.5",
                s.season === season ? "bg-muted font-medium" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {s.season}
            </Link>
          ))}
        </div>
      )}

      {/* week chips, oldest to newest, plus a one-tap new week */}
      <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1">
        {[...weeks].reverse().map((w) => (
          <Button key={w.id} asChild size="sm" variant={w.id === weekId ? "default" : "outline"} className="shrink-0">
            <Link href={`/admin?week=${w.id}&tab=${tab}`}>{w.label}</Link>
          </Button>
        ))}
        {/* new weeks always go in the current season */}
        {(seasons.length <= 1 || season === seasons[0]?.season) && (
          <form action={createNextWeek} onSubmit={() => setCreating(true)} className="shrink-0">
            <Button type="submit" size="sm" variant="ghost" disabled={creating}>
              <PlusIcon /> {creating ? "adding…" : "new week"}
            </Button>
          </form>
        )}
      </div>

      <nav className="flex gap-1 overflow-x-auto border-b">
        {ADMIN_TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => pick(t.key)}
            className={cn(
              "-mb-px flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2 text-sm transition-colors",
              tab === t.key ? "border-foreground font-medium" : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
            {t.key === "people" && waiting > 0 && <Badge className="h-4 bg-live/15 px-1.5 text-live">{waiting}</Badge>}
          </button>
        ))}
      </nav>

      {ADMIN_TABS.map((t) => (
        <div key={t.key} hidden={tab !== t.key}>
          {panels[t.key]}
        </div>
      ))}
    </>
  );
}
