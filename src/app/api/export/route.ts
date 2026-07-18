import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { formatDateBR, formatMonthBR } from "@/lib/dates";
import { formatCents } from "@/lib/money";
import { getAnnualReport, getMonthlyReport } from "@/features/reports/queries";
import { buildTableCsv } from "@/services/export/csv";
import { buildTableXlsx } from "@/services/export/xlsx";
import { buildTablePdf } from "@/services/export/pdf";

const TYPE_LABELS: Record<string, string> = {
  income: "Receita",
  expense: "Despesa",
  transfer: "Transferência",
};

const STATUS_LABELS: Record<string, string> = {
  paid: "Pago",
  pending: "Pendente",
  cancelled: "Cancelada",
};

const querySchema = z.discriminatedUnion("scope", [
  z.object({
    scope: z.literal("monthly"),
    month: z.string().regex(/^\d{4}-\d{2}-01$/, "Mês inválido"),
    format: z.enum(["csv", "xlsx", "pdf"]),
  }),
  z.object({
    scope: z.literal("annual"),
    year: z.coerce.number().int().min(2000).max(2100),
    format: z.enum(["csv", "xlsx", "pdf"]),
  }),
]);

const CONTENT_TYPES: Record<string, string> = {
  csv: "text/csv; charset=utf-8",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pdf: "application/pdf",
};

/**
 * Export de relatórios (mensal/anual) em CSV/XLSX/PDF — sempre server-side
 * (Route Handler): os dados nunca são serializados para o client antes de
 * virar arquivo, e o rate limit (§9) protege contra geração em massa.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const parsed = querySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Parâmetros inválidos." },
      { status: 400 },
    );
  }

  const { data: allowed, error: rateLimitError } = await supabase.rpc(
    "check_rate_limit",
    { p_key: `${user.id}:export`, p_max_hits: 20, p_window: "1 hour" },
  );
  if (rateLimitError) {
    return NextResponse.json(
      { error: "Não foi possível verificar o limite de exportações." },
      { status: 500 },
    );
  }
  if (!allowed) {
    return NextResponse.json(
      { error: "Muitas exportações. Aguarde um pouco e tente de novo." },
      { status: 429 },
    );
  }

  const { scope, format } = parsed.data;
  let title: string;
  let subtitle: string;
  let headers: string[];
  let rows: string[][];
  let rightAlignColumns: number[];
  let filenameBase: string;

  if (scope === "monthly") {
    const report = await getMonthlyReport(parsed.data.month);
    title = "Relatório mensal";
    subtitle = formatMonthBR(report.month);
    headers = [
      "Data",
      "Descrição",
      "Tipo",
      "Categoria",
      "Conta/Cartão",
      "Status",
      "Valor",
    ];
    rows = report.entries.map((entry) => [
      formatDateBR(entry.date),
      entry.description,
      TYPE_LABELS[entry.type] ?? entry.type,
      entry.categoryName,
      entry.sourceName,
      STATUS_LABELS[entry.status] ?? entry.status,
      formatCents(entry.amountCents),
    ]);
    rows.push([
      "",
      "",
      "",
      "",
      "",
      "Total pago",
      formatCents(report.netPaidCents),
    ]);
    rightAlignColumns = [6];
    filenameBase = `relatorio-mensal-${report.month.slice(0, 7)}`;
  } else {
    const report = await getAnnualReport(parsed.data.year);
    title = "Relatório anual";
    subtitle = String(report.year);
    headers = ["Mês", "Receitas", "Despesas", "Resultado"];
    rows = report.months.map((m) => [
      formatMonthBR(m.month),
      formatCents(m.incomeCents),
      formatCents(m.expenseCents),
      formatCents(m.netCents),
    ]);
    rows.push([
      "Total",
      formatCents(report.totalIncomeCents),
      formatCents(report.totalExpenseCents),
      formatCents(report.totalNetCents),
    ]);
    rightAlignColumns = [1, 2, 3];
    filenameBase = `relatorio-anual-${report.year}`;
  }

  let body: BodyInit;
  if (format === "csv") {
    body = buildTableCsv(headers, rows);
  } else if (format === "xlsx") {
    body = new Uint8Array(await buildTableXlsx(title, headers, rows));
  } else {
    body = new Uint8Array(
      await buildTablePdf(title, subtitle, headers, rows, rightAlignColumns),
    );
  }

  return new NextResponse(body, {
    headers: {
      "Content-Type": CONTENT_TYPES[format]!,
      "Content-Disposition": `attachment; filename="${filenameBase}.${format}"`,
    },
  });
}
