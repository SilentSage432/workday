import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Open tasks",
    short_name: "Tasks",
    description: "Capture and complete tasks. The product name is not final.",
    start_url: "/",
    display: "standalone",
    background_color: "#f8fafc",
    theme_color: "#1c1917",
  };
}
