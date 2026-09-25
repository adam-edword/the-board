"use client";

import { useState, useTransition } from "react";
import { CheckIcon, LockIcon } from "lucide-react";
import { toast } from "sonner";
import { updateMarker } from "@/app/actions";
import { cn } from "@/lib/utils";
import {
  MARKER_COLORS,
  MARKER_FONTS,
  markerStyle,
  type Marker,
  type MarkerColor,
  type MarkerFont,
} from "@/lib/markers";
import type { Game, Side } from "@/lib/types";
import { BoardTile } from "@/components/board-tile";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

// colors other people already have: color -> their name (null when you can't
// see names yet, i.e. still waiting for approval)
export type TakenColors = Partial<Record<MarkerColor, string | null>>;

// your color if it's still free, otherwise the first free one
export function freeColor(preferred: MarkerColor, taken: TakenColors): MarkerColor {
  if (!(preferred in taken)) return preferred;
  return (Object.keys(MARKER_COLORS) as MarkerColor[]).find((c) => !(c in taken)) ?? preferred;
}

export function MarkerPicker({ id, name, color: initialColor, font: initialFont, taken, others }: {
  id: string;
  name: string;
  color: MarkerColor;
  font: MarkerFont;
  taken: TakenColors;
  others: Marker[];
}) {
  const [color, setColor] = useState(initialColor);
  const [font, setFont] = useState(initialFont);
  const [pending, start] = useTransition();
  const dirty = color !== initialColor || font !== initialFont;

  function save() {
    start(async () => {
      try {
        const res = await updateMarker(color, font);
        if (res?.error) toast.error(res.error);
        else toast.success("marker saved");
      } catch {
        toast.error("couldn't save that, check your connection");
      }
    });
  }

  return (
    <div className="space-y-5">
      <MarkerFields id={id} name={name} color={color} font={font} taken={taken} others={others} onColor={setColor} onFont={setFont} />
      <Button onClick={save} disabled={!dirty || pending}>
        {pending ? "saving…" : "save marker"}
      </Button>
    </div>
  );
}

// a made-up game for the preview, never locks
const PREVIEW_GAME: Game = {
  id: 1,
  week_id: 0,
  league: "nfl",
  espn_id: "",
  kickoff: "2999-01-01T00:00:00Z",
  home_name: "Kansas City Chiefs",
  home_abbr: "KC",
  home_logo: "https://a.espncdn.com/i/teamlogos/nfl/500/kc.png",
  home_rank: null,
  away_name: "Buffalo Bills",
  away_abbr: "BUF",
  away_logo: "https://a.espncdn.com/i/teamlogos/nfl/500/buf.png",
  away_rank: null,
  home_score: null,
  away_score: null,
  status: "pre",
  status_detail: null,
  network: null,
  winner: null,
  featured: false,
};

// preview + color + font pickers, shared by the profile page and onboarding.
// the preview is a real board tile with everyone else's markers on it, so you
// can see how yours sits next to theirs.
export function MarkerFields({ id, name, color, font, taken, others, onColor, onFont }: {
  id: string;
  name: string;
  color: MarkerColor;
  font: MarkerFont;
  taken: TakenColors;
  others: Marker[];
  onColor: (c: MarkerColor) => void;
  onFont: (f: MarkerFont) => void;
}) {
  // you're on buf, everyone else alternates sides so both have names
  const sides: Record<Side, Marker[]> = { away: [], home: [] };
  others.forEach((m, i) => sides[i % 2 ? "away" : "home"].push(m));

  return (
    <div className="space-y-5">
      <div className="max-w-sm">
        <BoardTile
          game={PREVIEW_GAME}
          others={sides}
          mySide="away"
          me={{ id, name, color, font }}
          pickedCount={0}
          total={0}
          roster={[id, ...others.map((m) => m.id ?? m.name)]}
          preview
        />
      </div>

      <div className="space-y-2">
        <Label>color</Label>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="marker color">
          {(Object.keys(MARKER_COLORS) as MarkerColor[]).map((c) => {
            // someone else already has it (you can always keep your own)
            const lockedBy = c in taken && c !== color ? (taken[c] ?? "someone") : null;
            return (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={color === c}
                aria-label={lockedBy ? `${c}, taken by ${lockedBy}` : c}
                title={lockedBy ? `taken by ${lockedBy.toLowerCase()}` : c}
                disabled={!!lockedBy}
                onClick={() => onColor(c)}
                className={cn(
                  "relative grid size-9 place-items-center rounded-full ring-offset-2 ring-offset-background transition outline-none",
                  "focus-visible:ring-3 focus-visible:ring-ring/50",
                  color === c && "ring-2 ring-foreground",
                  lockedBy && "cursor-not-allowed",
                )}
                style={{ backgroundColor: MARKER_COLORS[c] }}
              >
                {color === c && <CheckIcon className="size-4 text-black/70" strokeWidth={3} />}
                {lockedBy && <LockIcon className="size-3.5 text-black/70" strokeWidth={2.5} />}
              </button>
            );
          })}
        </div>
        {Object.keys(taken).length > 0 && (
          <p className="text-xs text-muted-foreground">locked colors are already someone&apos;s. hover to see whose.</p>
        )}
      </div>

      <div className="space-y-2">
        <Label>font</Label>
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="marker font">
          {(Object.keys(MARKER_FONTS) as MarkerFont[]).map((f) => (
            <button
              key={f}
              type="button"
              role="radio"
              aria-checked={font === f}
              onClick={() => onFont(f)}
              className={cn(
                "flex flex-col items-start gap-1 rounded-lg border px-3 py-2 text-left transition outline-none",
                "hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50",
                font === f && "border-foreground bg-muted/50",
              )}
            >
              <span style={markerStyle({ color, font: f })} className="truncate leading-tight">
                {name}
              </span>
              <span className="text-[11px] text-muted-foreground">{MARKER_FONTS[f].label}</span>
            </button>
          ))}
        </div>
      </div>

    </div>
  );
}
