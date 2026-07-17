import type { Metadata } from "next";

import { LoginForm } from "@/features/auth/components/login-form";

export const metadata: Metadata = { title: "Entrar" };

const ERROR_MESSAGES: Record<string, string> = {
  "link-invalido":
    "Link inválido ou expirado. Faça login ou solicite um novo link.",
};

type LoginPageProps = {
  searchParams: Promise<{ next?: string; erro?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { next, erro } = await searchParams;
  return (
    <LoginForm
      next={next}
      errorMessage={erro ? ERROR_MESSAGES[erro] : undefined}
    />
  );
}
