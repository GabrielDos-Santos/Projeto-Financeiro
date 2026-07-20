import { addDays } from "date-fns";

import { createAdminClient } from "@/lib/supabase/admin";
import { formatCents } from "@/lib/money";
import { toDateOnly } from "@/lib/dates";
import { sendPushToUser } from "./send";

/** Dias de antecedência do lembrete (decisão 104) — um único aviso, não uma
 * janela: o corte é `due_date = hoje + N`, exato. */
export const PAYMENT_REMINDER_DAYS = 3;

type ReminderTarget = {
  userId: string;
  title: string;
  body: string;
  url: string;
  notificationType: "invoice_due" | "loan_due";
  metadata: Record<string, string>;
};

/**
 * Varre faturas e parcelas de empréstimo vencendo em `PAYMENT_REMINDER_DAYS`
 * dias e notifica (sino + push) quem tem o aviso ligado nas preferências.
 * Roda via `/api/cron/payment-reminders` (Vercel Cron, decisão 103) com a
 * service role — precisa ver TODOS os usuários, não só o da sessão.
 *
 * Melhor esforço, item a item: uma falha (push expirado, notificação
 * duplicada) não derruba o restante do lote.
 */
export async function runPaymentReminders(): Promise<{
  checked: number;
  notified: number;
  pushSent: number;
}> {
  const admin = createAdminClient();
  const targetDate = toDateOnly(addDays(new Date(), PAYMENT_REMINDER_DAYS));

  const targets: ReminderTarget[] = [];

  // ─── Faturas de cartão vencendo em N dias ──────────────────────────────
  const { data: invoices } = await admin
    .from("credit_card_invoices")
    .select("id, user_id, credit_card_id, due_date, status")
    .in("status", ["open", "closed"])
    .eq("due_date", targetDate);

  if (invoices && invoices.length > 0) {
    const { data: totals } = await admin
      .from("v_invoice_totals")
      .select("invoice_id, total_cents")
      .in(
        "invoice_id",
        invoices.map((invoice) => invoice.id),
      );
    const totalByInvoice = new Map(
      (totals ?? []).map((row) => [row.invoice_id, row.total_cents ?? 0]),
    );

    const { data: cards } = await admin
      .from("credit_cards")
      .select("id, name")
      .in(
        "id",
        invoices.map((invoice) => invoice.credit_card_id),
      );
    const cardById = new Map((cards ?? []).map((card) => [card.id, card.name]));

    for (const invoice of invoices) {
      const cardName = cardById.get(invoice.credit_card_id) ?? "cartão";
      const totalCents = totalByInvoice.get(invoice.id) ?? 0;
      targets.push({
        userId: invoice.user_id,
        title: `Fatura do ${cardName} vence em ${PAYMENT_REMINDER_DAYS} dias`,
        body:
          totalCents > 0
            ? `${formatCents(totalCents)} — vencimento em ${targetDate.split("-").reverse().join("/")}.`
            : `Vencimento em ${targetDate.split("-").reverse().join("/")}.`,
        url: `/cartoes/${invoice.credit_card_id}`,
        notificationType: "invoice_due",
        metadata: { invoice_id: invoice.id },
      });
    }
  }

  // ─── Parcelas de empréstimo vencendo em N dias ─────────────────────────
  const { data: dueInstallments } = await admin
    .from("transaction_installments")
    .select("id, transaction_id, user_id, amount_cents, due_date")
    .eq("status", "pending")
    .eq("due_date", targetDate);

  if (dueInstallments && dueInstallments.length > 0) {
    const { data: loans } = await admin
      .from("loans")
      .select("id, name, parent_transaction_id")
      .in(
        "parent_transaction_id",
        dueInstallments.map((installment) => installment.transaction_id),
      );
    const loanByParent = new Map(
      (loans ?? []).map((loan) => [loan.parent_transaction_id, loan]),
    );

    for (const installment of dueInstallments) {
      const loan = loanByParent.get(installment.transaction_id);
      if (!loan) continue; // parcela comum, não é de empréstimo

      targets.push({
        userId: installment.user_id,
        title: `Parcela de "${loan.name}" vence em ${PAYMENT_REMINDER_DAYS} dias`,
        body: `${formatCents(installment.amount_cents)} — vencimento em ${targetDate.split("-").reverse().join("/")}.`,
        url: "/emprestimos",
        notificationType: "loan_due",
        metadata: { loan_id: loan.id, installment_id: installment.id },
      });
    }
  }

  if (targets.length === 0) {
    return { checked: 0, notified: 0, pushSent: 0 };
  }

  // Preferência por usuário — um único fetch para todos os alvos do lote.
  const { data: settingsRows } = await admin
    .from("settings")
    .select("user_id, notify_invoice_due, notify_loan_due")
    .in(
      "user_id",
      targets.map((target) => target.userId),
    );
  const settingsByUser = new Map(
    (settingsRows ?? []).map((row) => [row.user_id, row]),
  );

  let notified = 0;
  let pushSent = 0;

  for (const target of targets) {
    const settings = settingsByUser.get(target.userId);
    const enabled =
      target.notificationType === "invoice_due"
        ? (settings?.notify_invoice_due ?? true)
        : (settings?.notify_loan_due ?? true);
    if (!enabled) continue;

    // Idempotência (decisão 41/104): nunca duplica se o cron rodar 2x no dia.
    const { data: existing } = await admin
      .from("notifications")
      .select("id")
      .eq("user_id", target.userId)
      .eq("type", target.notificationType)
      .contains("metadata", target.metadata)
      .limit(1);
    if (existing && existing.length > 0) continue;

    const { error: insertError } = await admin.from("notifications").insert({
      user_id: target.userId,
      type: target.notificationType,
      title: target.title,
      body: target.body,
      metadata: target.metadata,
    });
    if (insertError) continue;
    notified += 1;

    const { sent } = await sendPushToUser(admin, target.userId, {
      title: target.title,
      body: target.body,
      url: target.url,
      tag: target.notificationType,
    });
    pushSent += sent;
  }

  return { checked: targets.length, notified, pushSent };
}
