"use client";

import Link from "next/link";
import { useState } from "react";
import { TrophyIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { markerStyle, type MarkerColor, type MarkerFont } from "@/lib/markers";
import { CoinIcon } from "@/components/coin-icon";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export type BreakdownRow = {
  id: string;
  name: string;
  color: MarkerColor;
  font: MarkerFont;
  bot: boolean;
  played: boolean;
  won: boolean;
  cfb: number;
  nfl: number;
  total: number;
};
export type BreakdownWeek = { id: number; label: string; done: boolean; rows: BreakdownRow[] };

// one week at a time: everyone's college, nfl and total points. switching weeks is instant.
export function WeekBreakdown({ weeks, initialWeekId, linkSuffix }: {
  weeks: BreakdownWeek[];
  initialWeekId: number;
  linkSuffix: string;
}) {
  const [weekId, setWeekId] = useState(initialWeekId);
  const week = weeks.find((w) => w.id === weekId) ?? weeks[0];
  if (!week) return null;

  const rows = [...week.rows]
    .filter((r) => r.played)
    .sort((a, b) => b.total - a.total || Number(a.bot) - Number(b.bot) || a.name.localeCompare(b.name));
  const hasBonus = rows.some((r) => r.total !== r.cfb + r.nfl);

  return (
    <section className="space-y-3">
      <h2 className="font-heading text-lg font-semibold">weekly breakdown</h2>
      <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1">
        {weeks.map((w) => (
          <Button
            key={w.id}
            size="sm"
            variant={w.id === week.id ? "default" : "outline"}
            className="shrink-0"
            onClick={() => setWeekId(w.id)}
          >
            {w.label}
          </Button>
        ))}
      </div>
      <Card className="py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>name</TableHead>
              <TableHead className="text-right">college</TableHead>
              <TableHead className="text-right">nfl</TableHead>
              <TableHead className="text-right">total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-6 text-center text-muted-foreground">
                  no picks yet this week
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">
                    <Link href={`/players/${r.id}${linkSuffix}`} className="underline-offset-4 hover:underline">
                      {r.bot && <CoinIcon className="mr-1.5" />}
                      <span style={markerStyle({ color: r.color, font: r.font })}>{r.name}</span>
                    </Link>
                    {r.won && <TrophyIcon className="ml-1.5 inline size-3.5 text-live" />}
                  </TableCell>
                  <TableCell className="text-right font-mono text-muted-foreground tabular-nums">{r.cfb}</TableCell>
                  <TableCell className="text-right font-mono text-muted-foreground tabular-nums">{r.nfl}</TableCell>
                  <TableCell className={cn("text-right font-mono font-semibold tabular-nums", r.won && "text-win")}>
                    {r.total}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
      <p className="text-xs text-muted-foreground">
        {!week.done && "this week isn't final yet, so these can still change. "}
        {hasBonus && "totals include admin bonus/penalty points, which don't count toward college or nfl."}
      </p>
    </section>
  );
}
