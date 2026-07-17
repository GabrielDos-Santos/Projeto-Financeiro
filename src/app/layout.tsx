import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";

import { ThemeProvider } from "@/components/layout/theme-provider";
import { QueryProvider } from "@/components/layout/query-provider";
import { Toaster } from "@/components/ui/sonner";
import { themeInitScript } from "@/lib/theme-script";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "FinApp — Finanças pessoais",
    template: "%s · FinApp",
  },
  description:
    "Controle completo da sua vida financeira: contas, cartões, orçamentos, metas e relatórios.",
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
