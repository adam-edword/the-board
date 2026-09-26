"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Week } from "@/lib/types";

// dropdown for any week, arrows for the one before/after. weeks come newest first.
export function WeekPicker({ weeks, current, basePath = "/" }: {
  weeks: Week[];
  current: number;
  basePath?: string;
}) {
  const router = useRouter();
  const i = weeks.findIndex((w) => w.id === current);
  const older = i >= 0 ? weeks[i + 1] : undefined;
  const newer = i > 0 ? weeks[i - 1] : undefined;
  const href = (w: Week) => `${basePath}?week=${w.id}`;

  return (
    <div className="flex items-center gap-1">
      <Arrow to={older && href(older)} label="previous week">
        <ChevronLeftIcon />
      </Arrow>
      <Select value={String(current)} onValueChange={(v) => router.push(`${basePath}?week=${v}`)}>
        <SelectTrigger className="w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="end">
          {weeks.map((w) => (
            <SelectItem key={w.id} value={String(w.id)}>
              {w.label} <span className="text-muted-foreground">{w.season}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Arrow to={newer && href(newer)} label="next week">
        <ChevronRightIcon />
      </Arrow>
    </div>
  );
}

function Arrow({ to, label, children }: { to?: string; label: string; children: React.ReactNode }) {
  if (!to) {
    return (
      <Button variant="ghost" size="icon" aria-label={label} disabled>
        {children}
      </Button>
    );
  }
  return (
    <Button variant="ghost" size="icon" aria-label={label} asChild>
      <Link href={to}>{children}</Link>
    </Button>
  );
}
