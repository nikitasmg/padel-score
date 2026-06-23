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
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
