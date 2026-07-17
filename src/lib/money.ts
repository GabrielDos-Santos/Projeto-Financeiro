/**
 * Dinheiro sempre em BIGINT de centavos no banco (decisão D1) — aqui, `number`
 * inteiro de centavos. Toda conversão para exibição/entrada passa por este módulo.
 */

const BRL_FORMATTER = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

/** `123456` → `"R$ 1.234,56"`. */
export function formatCents(cents: number): string {
  return BRL_FORMATTER.format(cents / 100);
}

/**
 * Converte o texto digitado num input de dinheiro para centavos.
 * Interpreta apenas os dígitos ("1.234,56" → 123456), como calculadora de PDV;
 * `-` no início preserva o sinal (saldo inicial pode ser negativo).
 */
export function parseCentsFromInput(raw: string): number {
  const negative = raw.trimStart().startsWith("-");
  const digits = raw.replace(/\D/g, "");
  if (!digits) return 0;
  const cents = Number.parseInt(digits.slice(0, 15), 10);
  return negative ? -cents : cents;
}

/** Formata centavos para o valor exibido dentro de um input ("123456" → "1.234,56"). */
export function formatCentsForInput(cents: number): string {
  if (cents === 0) return "";
  const abs = Math.abs(cents);
  const formatted = new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(abs / 100);
  return cents < 0 ? `-${formatted}` : formatted;
}

/**
 * Divide um total em N parcelas que somam exatamente o total (decisão D1):
 * todas recebem `floor(total/n)` e o resto é distribuído 1 centavo por parcela,
 * a partir da primeira. Ex.: 100001 em 12x → 5× de 8334 + 7× de 8333.
 */
export function splitInstallments(totalCents: number, count: number): number[] {
  if (count < 1 || !Number.isInteger(count)) {
    throw new Error("Quantidade de parcelas inválida");
  }
  const base = Math.floor(totalCents / count);
  const remainder = totalCents - base * count;
  return Array.from({ length: count }, (_, i) =>
    i < remainder ? base + 1 : base,
  );
}
