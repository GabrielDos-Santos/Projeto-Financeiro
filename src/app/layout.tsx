import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "FinApp — Finanças pessoais",
    template: "%s · FinApp",
  },
  description:
    "Controle completo da sua vida financeira: contas, cartões, orçamentos, metas e relatórios.",
};

// Tema dark é o padrão do produto (settings.theme = 'dark').
// A troca dinâmica de tema (ThemeProvider) entra na Fase 1;
// a preferência persistida por usuário, na Fase 13 (Configurações).
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${GeistSans.variable} ${GeistMono.variable} dark`}
    >
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
