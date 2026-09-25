"use client";

import { useState, useTransition } from "react";
import { XIcon } from "lucide-react";
import { toast } from "sonner";
import { adminSetAdjustment, adminSetPick } from "@/app/actions";
import { cn } from "@/lib/utils";
import type { Adjustment, Game, Pick, Profile, Side } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// set anyone's picks for this week (even after kickoff) and add flat point
// adjustments. everything saved here is marked as edited and gets an asterisk.
export function PickFixer({ weekId, games, picks, adjustments, members }: {
  weekId: number;
  games: Game[];
  picks: Pick[];
  adjustments: Adjustment[];
  members: Profile[];
}) {
  const [userId, setUserId] = useState(members[0]?.id ?? "");
  const [pending, start] = useTransition();
  const theirs = new Map(picks.filter((p) => p.user_id === userId).map((p) => [p.game_id, p]));
  const adj = adjustments.find((a) => a.user_id === userId);

  function set(gameId: number, side: Side | null) {
    start(async () => {
      const res = await adminSetPick(userId, gameId, side);
      if (res?.error) toast.error(res.error);
    });
  }

  return (
    <div className="space-y-4">
      <Select value={userId} onValueChange={setUserId}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="pick a person" />
        </SelectTrigger>
        <SelectContent>
          {members.map((m) => (
            <SelectItem key={m.id} value={m.id}>
              {m.name.toLowerCase()}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <ul className="divide-y rounded-lg border">
        {games.map((g) => {
          const p = theirs.get(g.id);
          return (
            <li key={g.id} className="flex items-center gap-2 px-3 py-2 text-sm">
              {(["away", "home"] as Side[]).map((s) => (
                <Button
                  key={s}
                  type="button"
                  size="sm"
                  variant={p?.side === s ? "default" : "outline"}
                  disabled={pending}
                  onClick={() => set(g.id, s)}
                  className="min-w-16"
                >
                  {s === "away" ? g.away_abbr : g.home_abbr}
                </Button>
              ))}
              <span className={cn("ml-auto text-xs text-muted-foreground", p?.edited && "text-live")}>
                {p ? (p.edited ? "edited*" : "their pick") : "no pick"}
              </span>
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                aria-label="clear pick"
                disabled={pending || !p}
                onClick={() => set(g.id, null)}
              >
                <XIcon />
              </Button>
            </li>
          );
        })}
      </ul>

      <form
        key={`${userId}-${adj?.points ?? "none"}`}
        action={(fd) => start(() => adminSetAdjustment(userId, weekId, fd))}
        className="space-y-2"
      >
        <Label htmlFor="points">bonus / penalty points this week</Label>
        <div className="flex flex-wrap gap-2">
          <Input id="points" name="points" type="number" defaultValue={adj?.points ?? ""} placeholder="0" className="w-24" />
          <Input name="note" placeholder="note (optional)" className="min-w-40 flex-1" />
          <Button type="submit" variant="outline" disabled={pending}>
            save
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          added on top of their picks. clear the number and save to remove it.
          {adj && !adj.edited && " (this week already has back-filled whiteboard points.)"}
        </p>
      </form>
    </div>
  );
}
