import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Muvuca",
    short_name: "Muvuca",
    description: "Biblioteca pessoal de links e prompts.",
    lang: "pt-BR",
    start_url: "/",
    display: "standalone",
    background_color: "#f4f3f7",
    theme_color: "#a3e635",
    icons: [
      { src: "/brand/favicon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/brand/favicon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
