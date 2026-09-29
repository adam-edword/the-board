import { ChevronDownIcon, StarIcon } from "lucide-react";
import type { Game } from "@/lib/types";

// why the commissioner put each game on the board, tucked away until tapped
export function SlateReasons({ games }: { games: Game[] }) {
  const why = [...games]
    .filter((g) => g.slate_reason)
    .sort((a, b) => a.kickoff.localeCompare(b.kickoff) || a.id - b.id);
  if (!why.length) return null;
  return (
    <details className="group rounded-lg border px-3 py-2 text-sm">
      <summary className="flex cursor-pointer list-none items-center gap-1 text-muted-foreground">
        why these games
        <ChevronDownIcon className="size-4 transition-transform group-open:rotate-180" />
      </summary>
      <ul className="mt-2 grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
        {why.map((g) => (
          <li key={g.id}>
            <span className="font-semibold">
              {g.away_abbr} @ {g.home_abbr}
            </span>
            {g.featured && <StarIcon className="ml-1 inline size-3 fill-live text-live" />}
            <span className="text-muted-foreground"> · {g.slate_reason}</span>
          </li>
        ))}
      </ul>
    </details>
  );
}
