"use client";

import { useRouter } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Week } from "@/lib/types";

export function WeekPicker({ weeks, current, basePath = "/" }: {
  weeks: Week[];
  current: number;
  basePath?: string;
}) {
  const router = useRouter();
  return (
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
  );
}
