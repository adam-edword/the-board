import "server-only";
import { timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";

// routes meant for the scheduled task (or a manual curl) send
// `Authorization: Bearer $CRON_SECRET`. with no secret set they stay locked.
export function cronAuthorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const got = Buffer.from(request.headers.get("authorization") ?? "");
  const want = Buffer.from(`Bearer ${secret}`);
  return got.length === want.length && timingSafeEqual(got, want);
}
