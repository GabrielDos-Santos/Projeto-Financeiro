import type { MetadataRoute } from "next";

/**
 * PWA (Fase 15, ARQUITETURA-EXPANSAO.md). Tons do tema dark (zinc), que é o
 * padrão do app (decisão 9) — cor de destaque emerald igual à dos ícones e
 * ao verde de valor positivo (decisão 39).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Zeno — Finanças pessoais",
    short_name: "Zeno",
    description:
      "Contas, transações, cartões, orçamentos e metas em um só lugar.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#09090b",
    theme_color: "#09090b",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
