// shared by the server page and the client shell. has to live outside the
// "use client" file, or the server gets a client reference instead of the array.
export const ADMIN_TABS = [
  { key: "games", label: "games" },
  { key: "fix", label: "fix picks" },
  { key: "people", label: "people" },
  { key: "week", label: "week settings" },
  { key: "season", label: "season" },
] as const;
export type AdminTab = (typeof ADMIN_TABS)[number]["key"];
