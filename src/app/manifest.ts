import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "UNIQUE — Entrena en los mejores gimnasios",
    short_name: "UNIQUE",
    description:
      "Un solo plan de créditos para acceder a cycling, boxing, yoga y más en los gimnasios y estudios afiliados a UNIQUE.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ff4f3f",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
