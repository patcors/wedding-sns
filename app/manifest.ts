import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Sam & Sarah",
    short_name: "Sam & Sarah",
    description: "A little adventure for the wedding of Sam & Sarah.",
    // Launches from the home screen with no browser navbar / nav buttons.
    // "fullscreen" hides the status bar too on Android; iOS falls back to a
    // standalone-style chrome via the apple meta tags in layout.tsx.
    display: "fullscreen",
    orientation: "portrait",
    start_url: "/",
    scope: "/",
    background_color: "#fb7185",
    theme_color: "#fb7185",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
