import { markerStyle } from "@/lib/markers";
import type { Profile } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";

// the ai player's summary of his week, under the board
export function AiTakes({ summary, members }: { summary: string | null; members: Profile[] }) {
  const ai = members.find((m) => m.is_ai);
  if (!ai || !summary) return null;
  return (
    <Card size="sm">
      <CardContent className="text-sm">
        <span style={markerStyle({ color: ai.marker_color, font: ai.marker_font })}>{ai.name}</span>
        <span className="text-muted-foreground">: {summary}</span>
      </CardContent>
    </Card>
  );
}
