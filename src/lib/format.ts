// kickoff times are shown in central time
export const TIME_ZONE = "America/Chicago";

export function kickoffLabel(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
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

export function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || name;
}
