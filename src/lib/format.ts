// the server renders times in central (where the group mostly is); each
// browser then switches kickoff times to its own time zone (see useTimeZone)
export const TIME_ZONE = "America/Chicago";

export function kickoffLabel(iso: string, timeZone: string = TIME_ZONE) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  })
    .format(new Date(iso))
    .toLowerCase();
}

export function isLocked(game: { kickoff: string; status: string }) {
  return game.status !== "pre" || new Date(game.kickoff).getTime() <= Date.now();
}

// the featured game of the week is worth double
export function pointsFor(game: { featured: boolean }) {
  return game.featured ? 2 : 1;
}

// a pick is right if its team won. a tie counts for everyone who picked the game.
export function pickIsRight(game: { status: string; winner: string | null }, side: "home" | "away") {
  return game.status === "post" && (game.winner === side || game.winner === "tie");
}

export function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || name;
}
