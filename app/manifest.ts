import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Open tasks",
    short_name: "Tasks",
    description: "Capture a task, and return to the one you started. The product name is not final.",
    start_url: "/",
    display: "standalone",
    background_color: "#0c0a09",
    theme_color: "#0c0a09",
  };
}
