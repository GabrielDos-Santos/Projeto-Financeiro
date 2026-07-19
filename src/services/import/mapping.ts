/**
 * Interpretação de colunas de CSV bancário (v1 — formatos BR mais comuns).
 * Funções puras: recebem string crua da célula, devolvem valor tipado ou
 * `null` se não reconhecerem o formato (a linha é rejeitada na etapa 4 do
 * wizard com o motivo).
 */

export type DateFormat = "DMY" | "DMY_SHORT" | "YMD";
export type AmountMode = "signed" | "debit_credit" | "amount_type";
export type DecimalSeparator = "," | ".";

export type ColumnMapping = {
  hasHeaderRow: boolean;
  dateColumn: number;
  dateFormat: DateFormat;
  descriptionColumn: number;
  amountMode: AmountMode;
  amountColumn: number | null; // signed | amount_type
  debitColumn: number | null; // debit_credit
  creditColumn: number | null; // debit_credit
  typeColumn: number | null; // amount_type: valores tipo "D"/"C"
  decimalSeparator: DecimalSeparator;
};

export function defaultColumnMapping(columnCount: number): ColumnMapping {
  return {
    hasHeaderRow: true,
    dateColumn: 0,
    dateFormat: "DMY",
    descriptionColumn: Math.min(1, columnCount - 1),
    amountMode: "signed",
    amountColumn: Math.min(2, columnCount - 1),
    debitColumn: null,
    creditColumn: null,
    typeColumn: null,
    decimalSeparator: ",",
  };
}

/** "DD/MM/YYYY" | "DD/MM/YY" | "YYYY-MM-DD" → "YYYY-MM-DD", ou null. */
export function parseDateFlexible(
  raw: string,
  format: DateFormat,
): string | null {
  const value = raw.trim();
  if (format === "YMD") {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!m) return null;
    return `${m[1]}-${m[2]}-${m[3]}`;
  }
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/.exec(value);
  if (!m) return null;
  const day = m[1]!.padStart(2, "0");
  const month = m[2]!.padStart(2, "0");
  let year = m[3]!;
  if (year.length === 2) {
    year = (Number(year) >= 70 ? "19" : "20") + year;
  }
  const monthNum = Number(month);
  const dayNum = Number(day);
  if (monthNum < 1 || monthNum > 12 || dayNum < 1 || dayNum > 31) return null;
  return `${year}-${month}-${day}`;
}

/** "1.234,56" ou "1234.56" → centavos (inteiro), preservando o sinal. */
export function parseMoneyFlexible(
  raw: string,
  decimalSeparator: DecimalSeparator,
): number | null {
  let value = raw.trim().replace(/^R\$\s*/i, "");
  if (!value) return null;

  const negative = /^-/.test(value) || /^\(.*\)$/.test(value);
  // Alguns bancos (Nubank incluso) exportam negativo como "- 36,00", com
  // espaço depois do sinal — sem o trim() o dígito nunca bate a regex final.
  value = value
    .replace(/[()]/g, "")
    .replace(/^-/, "")
    .trim();

  if (decimalSeparator === ",") {
    value = value.replace(/\./g, "").replace(",", ".");
  } else {
    value = value.replace(/,/g, "");
  }

  if (!/^\d+(\.\d+)?$/.test(value)) return null;
  const cents = Math.round(Number.parseFloat(value) * 100);
  return negative ? -cents : cents;
}

export type MappedRow = {
  rowIndex: number;
  dateISO: string | null;
  description: string;
  /** Sempre positivo; o sinal vira `type` (conta) ou é sempre expense (cartão). */
  amountCents: number | null;
  /** null quando o modo era debit_credit e a linha caiu na coluna de crédito
   * (estorno) — pulada com aviso (D5/decisão 22, evolução futura). */
  skippedReason: "invalid_date" | "invalid_amount" | "credit_skipped" | null;
  /** Só relevante em contexto de conta: sinal original do valor. */
  isCredit: boolean;
};

/**
 * Aplica o mapeamento a todas as linhas cruas, devolvendo linhas tipadas.
 *
 * `context` resolve a ambiguidade do modo "signed": num EXTRATO DE CONTA,
 * positivo = dinheiro entrando (receita) e negativo = saindo (despesa); numa
 * FATURA DE CARTÃO é o oposto — positivo = compra (despesa) e negativo =
 * pagamento/estorno (crédito, pulado com aviso — decisão 22). Sem isso, um
 * CSV do Nubank importado como cartão descartava as compras e aceitava os
 * "Pagamento recebido" como despesa (bug real reportado pelo usuário).
 */
export function mapCsvRows(
  rawRows: string[][],
  mapping: ColumnMapping,
  context: "account" | "card" = "account",
): MappedRow[] {
  const dataRows = mapping.hasHeaderRow ? rawRows.slice(1) : rawRows;

  return dataRows.map((row, i) => {
    const dateISO = parseDateFlexible(
      row[mapping.dateColumn] ?? "",
      mapping.dateFormat,
    );
    const description = (row[mapping.descriptionColumn] ?? "").trim();

    let amountCents: number | null = null;
    let isCredit = false;
    let skippedReason: MappedRow["skippedReason"] = null;

    if (mapping.amountMode === "signed") {
      const parsed =
        mapping.amountColumn != null
          ? parseMoneyFlexible(
              row[mapping.amountColumn] ?? "",
              mapping.decimalSeparator,
            )
          : null;
      if (parsed == null) {
        skippedReason = "invalid_amount";
      } else if (context === "card") {
        // Fatura: positivo = compra; negativo = pagamento/estorno (fora).
        isCredit = parsed < 0;
        if (isCredit) skippedReason = "credit_skipped";
        else amountCents = Math.abs(parsed);
      } else {
        isCredit = parsed >= 0;
        amountCents = Math.abs(parsed);
      }
    } else if (mapping.amountMode === "debit_credit") {
      const debitRaw =
        mapping.debitColumn != null ? row[mapping.debitColumn] : "";
      const creditRaw =
        mapping.creditColumn != null ? row[mapping.creditColumn] : "";
      const debit = debitRaw
        ? parseMoneyFlexible(debitRaw, mapping.decimalSeparator)
        : null;
      const credit = creditRaw
        ? parseMoneyFlexible(creditRaw, mapping.decimalSeparator)
        : null;
      if (credit != null && Math.abs(credit) > 0) {
        skippedReason = "credit_skipped";
        isCredit = true;
      } else if (debit != null && Math.abs(debit) > 0) {
        amountCents = Math.abs(debit);
        isCredit = false;
      } else {
        skippedReason = "invalid_amount";
      }
    } else {
      // amount_type: valor único + coluna com "D"/"C" (ou "DEBITO"/"CREDITO")
      const parsed =
        mapping.amountColumn != null
          ? parseMoneyFlexible(
              row[mapping.amountColumn] ?? "",
              mapping.decimalSeparator,
            )
          : null;
      const typeRaw = (
        mapping.typeColumn != null ? (row[mapping.typeColumn] ?? "") : ""
      )
        .trim()
        .toUpperCase();
      const creditLike = typeRaw.startsWith("C");
      if (parsed == null) {
        skippedReason = "invalid_amount";
      } else if (creditLike) {
        skippedReason = "credit_skipped";
        isCredit = true;
      } else {
        amountCents = Math.abs(parsed);
        isCredit = false;
      }
    }

    if (!dateISO && !skippedReason) skippedReason = "invalid_date";

    return {
      rowIndex: i,
      dateISO,
      description,
      amountCents,
      skippedReason,
      isCredit,
    };
  });
}
