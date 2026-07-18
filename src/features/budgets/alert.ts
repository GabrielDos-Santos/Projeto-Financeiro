import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";
import { formatMonthBR } from "@/lib/dates";
import { formatCents } from "@/lib/money";
import type { BudgetAlert } from "./types";

/**
 * Verifica o orçamento da categoria no mês de competência da despesa recém
 * gravada. Cruzou o threshold → insere a `notification` (UMA vez por
 * orçamento/mês — idempotente via metadata) e devolve os dados para o toast.
 *
 * Melhor esforço: nunca derruba a Server Action que gravou a despesa.
 */
export async function maybeBudgetAlert(
  supabase: SupabaseClient<Database>,
  userId: string,
  categoryId: string | null | undefined,
  dateISO: string,
): Promise<BudgetAlert | null> {
  if (!categoryId) return null;

  try {
    const monthISO = `${dateISO.slice(0, 7)}-01`;

    const { data: usage } = await supabase
      .from("v_budget_usage")
      .select(
        "budget_id, category_name, month, amount_cents, spent_cents, usage_ratio, alert_reached",
      )
      .eq("category_id", categoryId)
      .eq("month", monthISO)
      .maybeSingle();

    if (!usage?.alert_reached || !usage.budget_id) return null;

    // Já notificado neste orçamento/mês? Então nem toast de novo.
    const { data: existing } = await supabase
      .from("notifications")
      .select("id")
      .eq("type", "budget_alert")
      .contains("metadata", { budget_id: usage.budget_id, month: monthISO })
      .limit(1);
    if (existing && existing.length > 0) return null;

    const usagePct = Math.round((usage.usage_ratio ?? 0) * 100);
    const categoryName = usage.category_name ?? "categoria";

    await supabase.from("notifications").insert({
      user_id: userId,
      type: "budget_alert",
      title: `Orçamento de ${categoryName} em ${usagePct}%`,
      body: `Você já usou ${formatCents(usage.spent_cents ?? 0)} do teto de ${formatCents(usage.amount_cents ?? 0)} em ${formatMonthBR(monthISO)}.`,
      metadata: {
        budget_id: usage.budget_id,
        month: monthISO,
        usage_ratio: usage.usage_ratio,
      },
    });

    return { categoryName, usagePct };
  } catch {
    return null; // alerta nunca derruba o lançamento
  }
}
