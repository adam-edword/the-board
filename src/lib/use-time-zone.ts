"use client";

import { useSyncExternalStore } from "react";
import { TIME_ZONE } from "@/lib/format";

// the viewer's own time zone. the server doesn't know it, so it renders central
// and the browser swaps in local time right after hydration (no mismatch error).
const subscribe = () => () => {};
const getLocal = () => Intl.DateTimeFormat().resolvedOptions().timeZone || TIME_ZONE;
const getServer = () => TIME_ZONE;

export function useTimeZone() {
  return useSyncExternalStore(subscribe, getLocal, getServer);
}
