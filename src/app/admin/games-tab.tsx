import type { Game } from "@/lib/types";
import { GamesWorkspace } from "./games-workspace";

export function GamesTab({ weekId, label, games }: { weekId: number; label: string; games: Game[] }) {
  return <GamesWorkspace key={weekId} weekId={weekId} label={label} games={games} />;
}
