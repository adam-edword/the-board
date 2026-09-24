import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // self-contained server bundle for the docker image
  output: "standalone",
};

export default nextConfig;
