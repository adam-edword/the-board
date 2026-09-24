import type { NextConfig } from "next";
import pkg from "./package.json";

const nextConfig: NextConfig = {
  // self-contained server bundle for the docker image
  output: "standalone",
  // baked in at build time so you can tell which deploy is live
  env: {
    APP_VERSION: pkg.version,
    BUILD_TIME: new Date().toISOString(),
    // coolify passes the git commit as a build arg
    BUILD_SHA: (process.env.SOURCE_COMMIT ?? "").slice(0, 7),
  },
};

export default nextConfig;
