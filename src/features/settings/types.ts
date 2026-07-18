import type { Tables } from "@/types/database";

export type Profile = Tables<"profiles">;
export type Settings = Tables<"settings">;

export const CURRENCY_OPTIONS = ["BRL", "USD", "EUR"] as const;
export const LOCALE_OPTIONS = ["pt-BR", "en-US"] as const;

export const CURRENCY_LABELS: Record<
  (typeof CURRENCY_OPTIONS)[number],
  string
> = {
  BRL: "Real (R$)",
  USD: "Dólar (US$)",
  EUR: "Euro (€)",
};

export const LOCALE_LABELS: Record<(typeof LOCALE_OPTIONS)[number], string> = {
  "pt-BR": "Português (Brasil)",
  "en-US": "English (US)",
};
