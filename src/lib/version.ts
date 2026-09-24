import { TIME_ZONE } from "@/lib/format";

export const version = {
  version: process.env.APP_VERSION ?? "dev",
  sha: process.env.BUILD_SHA || null,
  builtAt: process.env.BUILD_TIME ?? null,
};

export function versionLabel() {
  const built = version.builtAt
    ? new Intl.DateTimeFormat("en-US", {
        timeZone: TIME_ZONE,
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
        .format(new Date(version.builtAt))
        .toLowerCase()
    : null;
  return [`v${version.version}`, version.sha, built && `built ${built}`].filter(Boolean).join(" · ");
}
