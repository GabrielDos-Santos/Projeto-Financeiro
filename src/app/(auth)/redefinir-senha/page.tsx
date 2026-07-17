import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { ResetPasswordForm } from "@/features/auth/components/reset-password-form";

export const metadata: Metadata = { title: "Nova senha" };

export default async function ResetPasswordPage() {
  // Esta página exige a sessão de recuperação criada pelo link do e-mail.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/esqueci-senha");
  }

  return <ResetPasswordForm />;
}
