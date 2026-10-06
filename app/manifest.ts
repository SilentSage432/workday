import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Orient",
    short_name: "Orient",
    description: "One field of time.",
    start_url: "/",
    display: "standalone",
    background_color: "#10141c",
    theme_color: "#10141c",
    icons: [
      {
        src: "/orient-icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/orient-icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
