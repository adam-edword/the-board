import type { NextRequest } from "next/server";

// behind coolify's reverse proxy the request url is the container's internal
// address, so build the public origin from the forwarded headers instead
export function publicOrigin(request: NextRequest) {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, "");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") ?? "https";
  return host ? `${proto.split(",")[0]}://${host.split(",")[0]}` : request.nextUrl.origin;
}
