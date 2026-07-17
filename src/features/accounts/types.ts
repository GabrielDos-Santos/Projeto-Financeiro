import type { Tables } from "@/types/database";

export type Account = Tables<"accounts">;

/** Linha da view `v_account_balances` — conta + saldo derivado (decisão D2). */
export type AccountWithBalance = Tables<"v_account_balances">;

export const ACCOUNT_TYPE_LABELS: Record<Account["type"], string> = {
  bank: "Conta bancária",
  wallet: "Carteira",
  cash: "Dinheiro",
  investment: "Investimento",
  digital: "Conta digital",
};
