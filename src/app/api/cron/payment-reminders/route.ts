import { NextResponse, type NextRequest } from "next/server";

import { runPaymentReminders } from "@/features/push/reminders";

/**
 * Job diário de lembretes de vencimento (Fase 19, decisão 103) — chamado
 * pelo Vercel Cron (`vercel.json`), nunca por um usuário. Protegido por
 * `CRON_SECRET`: ao configurar essa env var na Vercel, a própria Vercel
 * injeta `Authorization: Bearer $CRON_SECRET` nas chamadas agendadas — o
 * mesmo segredo aqui rejeita qualquer outra origem.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET não configurado." },
      { status: 500 },
    );
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  try {
    const summary = await runPaymentReminders();
    return NextResponse.json({ ok: true, ...summary });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
