import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";

import { ThemeProvider } from "@/components/layout/theme-provider";
import { QueryProvider } from "@/components/layout/query-provider";
import { Toaster } from "@/components/ui/sonner";
import { themeInitScript } from "@/lib/theme-script";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Zeno — Finanças pessoais",
    template: "%s · Zeno",
  },
  description:
    "Controle completo da sua vida financeira: contas, cartões, orçamentos, metas e relatórios.",
  // iOS não lê o manifest.ts pra virar app instalável — precisa desta tag
  // própria (Fase 15, PWA). O prompt de instalação (beforeinstallprompt)
  // não existe no Safari; a instrução fica em Configurações.
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Zeno",
  },
  icons: {
    apple: "/icons/icon-180.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#09090b",
  // "cover" + os insets de safe-area (Fase 1, bottom bar) é o que evita a
  // barra de navegação mobile sobrepor o conteúdo em telas com notch/gesto.
  viewportFit: "cover",
  width: "device-width",
  initialScale: 1,
};

// Dark é o padrão do produto (settings.theme = 'dark'); o script inline
// aplica o tema salvo no cookie antes da hidratação (sem flash) e o
// suppressHydrationWarning cobre a troca de classe feita por ele.
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${GeistSans.variable} ${GeistMono.variable} dark`}
      suppressHydrationWarning
    >
      <body className="font-sans antialiased">
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <ThemeProvider>
          <QueryProvider>
            {children}
            <Toaster richColors position="top-right" />
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
