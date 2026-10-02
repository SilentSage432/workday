import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Personal orientation baseline",
    short_name: "Orientation",
    description: "Runnable application baseline. The product name is not final.",
    start_url: "/",
    display: "standalone",
    background_color: "#f8fafc",
    theme_color: "#0f172a",
  };
}
