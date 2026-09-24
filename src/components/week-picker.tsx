"use client";

import { useRouter } from "next/navigation";
import type { Week } from "@/lib/types";

export function WeekPicker({ weeks, current, basePath = "/", extra = "" }: {
  weeks: Week[];
  current: number;
  basePath?: string;
  extra?: string;
}) {
  const router = useRouter();
  return (
    <select
      value={current}
      onChange={(e) => router.push(`${basePath}?week=${e.target.value}${extra}`)}
      className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
    >
      {weeks.map((w) => (
        <option key={w.id} value={w.id}>
          {w.label} ({w.season})
        </option>
      ))}
    </select>
  );
}
