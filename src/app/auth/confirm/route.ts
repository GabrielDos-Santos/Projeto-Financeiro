import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import { sanitizeNextPath } from "@/lib/utils";

/**
 * Confirmação por token_hash (funciona em qualquer navegador/dispositivo).
 * Requer os templates de e-mail do Supabase apontando para
 * /auth/confirm?token_hash={{ .TokenHash }}&type=... (ver README).
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const fallback = type === "recovery" ? "/redefinir-senha" : "/dashboard";
  const next = sanitizeNextPath(searchParams.get("next"), fallback);

  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });
    if (!error) {
      return NextResponse.redirect(new URL(next, request.url));
    }
  }

  return NextResponse.redirect(
    new URL("/login?erro=link-invalido", request.url),
  );
}
