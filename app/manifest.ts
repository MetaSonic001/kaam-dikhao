import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Kaam Dikhao", short_name: "Kaam Dikhao", description: "Did this actually get built? Track public works, add evidence, ask for records.",
    start_url: "/", display: "standalone", background_color: "#f7f7f4", theme_color: "#08243a",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
    shortcuts: [{ name: "Report what you see", url: "/report" }, { name: "Explore map", url: "/explore" }],
  };
}
