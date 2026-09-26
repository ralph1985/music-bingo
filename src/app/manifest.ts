import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Bingo Musical",
    short_name: "Bingo Musical",
    description: "Bingo musical móvil con cartones digitales y partidas compartidas.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#100b1d",
    theme_color: "#14141f",
    lang: "es",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
