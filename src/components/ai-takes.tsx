import { firstName } from "@/lib/format";
import { markerStyle } from "@/lib/markers";
import type { Game, Pick, Profile } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// the ai player's one-liners for the week, under the board
export function AiTakes({ games, picks, members }: { games: Game[]; picks: Pick[]; members: Profile[] }) {
  const ai = members.find((m) => m.is_ai);
  if (!ai) return null;
  const byGame = new Map(picks.filter((p) => p.user_id === ai.id && p.reason).map((p) => [p.game_id, p]));
  const takes = [...games]
    .sort((a, b) => a.kickoff.localeCompare(b.kickoff) || a.id - b.id)
    .flatMap((g) => {
      const p = byGame.get(g.id);
      return p ? [{ g, p }] : [];
    });
  if (!takes.length) return null;
  const name = firstName(ai.name).toLowerCase();

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="text-sm">
          <span style={markerStyle({ color: ai.marker_color, font: ai.marker_font })}>{name}</span>
          <span className="text-muted-foreground">&apos;s takes</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          {takes.map(({ g, p }) => (
            <li key={g.id}>
              <span className="font-semibold">{p.side === "home" ? g.home_abbr : g.away_abbr}</span>
              <span className="text-muted-foreground">
                {" "}
                over {p.side === "home" ? g.away_abbr : g.home_abbr}
              </span>
              <p className="text-muted-foreground">{p.reason}</p>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
