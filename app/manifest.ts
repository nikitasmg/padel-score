import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "RALLY · Счёт в паделе",
    short_name: "RALLY",
    description: "Ведение счёта в матче по паделу",
    start_url: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#0a0b0a",
    theme_color: "#0a0b0a",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
