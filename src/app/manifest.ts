import type { MetadataRoute } from "next";
import { PRODUCTION_ORIGIN } from "@/lib/multiplayer/share";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Blinq — memory game",
    short_name: "Blinq",
    description: "Memory workout, with fun",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f3effb",
    theme_color: "#6E28D9",
    launch_handler: { client_mode: ["navigate-existing", "auto"] },
    prefer_related_applications: false,
    related_applications: [
      {
        platform: "webapp",
        url: `${PRODUCTION_ORIGIN}/manifest.webmanifest`,
      },
    ],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
