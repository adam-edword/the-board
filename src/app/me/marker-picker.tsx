"use client";

import { useState, useTransition } from "react";
import { CheckIcon } from "lucide-react";
import { toast } from "sonner";
import { updateMarker } from "@/app/actions";
import { cn } from "@/lib/utils";
import {
  MARKER_COLORS,
  MARKER_FONTS,
  markerStyle,
  type MarkerColor,
  type MarkerFont,
} from "@/lib/markers";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export function MarkerPicker({ name, color: initialColor, font: initialFont }: {
  name: string;
  color: MarkerColor;
  font: MarkerFont;
}) {
  const [color, setColor] = useState(initialColor);
  const [font, setFont] = useState(initialFont);
  const [pending, start] = useTransition();
  const dirty = color !== initialColor || font !== initialFont;

  function save() {
    start(async () => {
      const res = await updateMarker(color, font);
      if (res?.error) toast.error(res.error);
      else toast.success("marker saved");
    });
  }

  return (
    <div className="space-y-5">
      <MarkerFields name={name} color={color} font={font} onColor={setColor} onFont={setFont} />
      <Button onClick={save} disabled={!dirty || pending}>
        {pending ? "saving…" : "save marker"}
      </Button>
    </div>
  );
}

// preview + color + font pickers, shared by the profile page and onboarding
export function MarkerFields({ name, color, font, onColor, onFont }: {
  name: string;
  color: MarkerColor;
  font: MarkerFont;
  onColor: (c: MarkerColor) => void;
  onFont: (f: MarkerFont) => void;
}) {
  return (
    <div className="space-y-5">
      {/* preview, drawn like a slice of the board */}
      <div className="grid grid-cols-2 divide-x rounded-lg border bg-muted/20">
        {["BUF", "KC"].map((team, i) => (
          <div key={team} className="p-2">
            <div className="border-b border-dashed pb-1.5 text-sm font-bold">{team}</div>
            <ul className="mt-1.5 min-h-10 space-y-0.5 leading-tight">
              {i === 0 && <li style={markerStyle({ color, font })}>{name}</li>}
              {i === 1 && <li style={markerStyle({ color: "white", font: "pangolin" })} className="opacity-50">someone</li>}
            </ul>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <Label>color</Label>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="marker color">
          {(Object.keys(MARKER_COLORS) as MarkerColor[]).map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={color === c}
              aria-label={c}
              onClick={() => onColor(c)}
              className={cn(
                "grid size-9 place-items-center rounded-full ring-offset-2 ring-offset-background transition outline-none",
                "focus-visible:ring-3 focus-visible:ring-ring/50",
                color === c && "ring-2 ring-foreground",
              )}
              style={{ backgroundColor: MARKER_COLORS[c] }}
            >
              {color === c && <CheckIcon className="size-4 text-black/70" strokeWidth={3} />}
            </button>
          ))}
        </div>
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
