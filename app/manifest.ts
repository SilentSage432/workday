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
  };
}
