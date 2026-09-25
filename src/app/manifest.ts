import type { MetadataRoute } from "next";

// lets people "add to home screen" and open the board like an app
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "the board",
    short_name: "the board",
    description: "weekly football picks",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0a0a",
    theme_color: "#0a0a0a",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
