import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const isDev = process.env.NODE_ENV === "development";

// connect-src precisa do projeto Supabase. Em build a env já está carregada
// (.env.local / Vercel); o fallback com wildcard cobre configuração ausente.
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://*.supabase.co";
const supabaseWs = supabaseUrl.replace(/^https/, "wss");

/**
 * CSP (ARQUITETURA.md §9, decisão 13 da Fase 1).
 * - script-src com 'unsafe-inline': exigido pelos scripts inline do próprio
 *   Next (hydration/streaming) e pelo script de tema; CSP com nonce exigiria
 *   middleware por request e tornaria todas as páginas dinâmicas — fora do
 *   MVP. 'unsafe-eval' só em dev (react-refresh).
 * - style-src com 'unsafe-inline': atributos style={} usados nas cores de
 *   categorias/contas/gráficos.
 * - img-src https:: o avatar do perfil é uma URL externa qualquer (Fase 13).
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self'",
  `connect-src 'self' ${supabaseUrl} ${supabaseWs}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  // Service worker (Fase 15, PWA) — carregado como script de mesma origem.
  "worker-src 'self'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

// PWA (Fase 15, ARQUITETURA-EXPANSAO.md) — desligado em dev: o precache
// interferiria com o hot-reload do Turbopack (SW serviria assets antigos).
const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  disable: isDev,
  // `/offline` é uma rota do App Router, não um arquivo em `public/` — sem
  // isto o SW só a colocaria em cache depois de uma 1ª visita online, e o
  // objetivo é a página de fallback já funcionar offline desde o começo.
  // Bump a revisão só se o conteúdo da página mudar.
  additionalPrecacheEntries: [{ url: "/offline", revision: "1" }],
});

export default withSerwist(nextConfig);
