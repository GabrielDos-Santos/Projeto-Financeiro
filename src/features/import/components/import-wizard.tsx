"use client";

import * as React from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Loader2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

import { todayISO } from "@/lib/dates";
import { formatCents } from "@/lib/money";
import {
  buildCategorySuggestionIndex,
  suggestCategory,
  type CategorySuggestionIndex,
} from "@/services/import/category-suggestion";
import { parseCsvFile, CsvParseError } from "@/services/import/csv-parse";
import {
  defaultColumnMapping,
  mapCsvRows,
  type AmountMode,
  type ColumnMapping,
  type DateFormat,
} from "@/services/import/mapping";
import type {
  AccountOption,
  CardOption,
  CategoryOption,
} from "@/features/transactions/types";
import {
  analyzeImportRows,
  checkCardImportContext,
  fetchCategorySuggestionSource,
  importAccountEntries,
  importCardEntries,
} from "../actions";
import type { ReviewRow } from "../types";
import { ReviewTable } from "./review-table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { DatePicker } from "@/components/shared/date-picker";
import { MonthNav } from "@/components/shared/month-nav";

type Mode = "account" | "card";
type Step = "context" | "file" | "mapping" | "review" | "done";

type ImportWizardProps = {
  mode: Mode;
  accounts: AccountOption[];
  cards: CardOption[];
  categories: CategoryOption[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const AMOUNT_MODE_LABELS: Record<AmountMode, string> = {
  signed: "Uma coluna, com sinal (-100 / 100)",
  debit_credit: "Duas colunas (débito e crédito)",
  amount_type: "Uma coluna de valor + uma coluna D/C",
};

const DATE_FORMAT_LABELS: Record<DateFormat, string> = {
  DMY: "DD/MM/AAAA",
  DMY_SHORT: "DD/MM/AA",
  YMD: "AAAA-MM-DD",
};

function currentMonthISO() {
  return `${todayISO().slice(0, 7)}-01`;
}

export function ImportWizard({
  mode,
  accounts,
  cards,
  categories,
  open,
  onOpenChange,
}: ImportWizardProps) {
  const [step, setStep] = React.useState<Step>("context");
  const [isPending, startTransition] = React.useTransition();

  // Contexto
  const [accountId, setAccountId] = React.useState(accounts[0]?.id ?? "");
  const [cutoffDate, setCutoffDate] = React.useState(todayISO());
  const [creditCardId, setCreditCardId] = React.useState(cards[0]?.id ?? "");
  const [referenceMonth, setReferenceMonth] = React.useState(currentMonthISO());

  // Arquivo
  const [file, setFile] = React.useState<File | null>(null);
  const [csvRows, setCsvRows] = React.useState<string[][] | null>(null);

  // Mapeamento
  const [mapping, setMapping] = React.useState<ColumnMapping | null>(null);

  // Revisão
  const [rows, setRows] = React.useState<ReviewRow[]>([]);
  const [rejectedCount, setRejectedCount] = React.useState(0);
  const [defaultCategoryId, setDefaultCategoryId] = React.useState("");
  const [isAnalyzing, setIsAnalyzing] = React.useState(false);

  // Resultado
  const [result, setResult] = React.useState<{
    imported: number;
    batchId: string;
  } | null>(null);

  const contextId = mode === "account" ? accountId : creditCardId;

  function resetAll() {
    setStep("context");
    setFile(null);
    setCsvRows(null);
    setMapping(null);
    setRows([]);
    setRejectedCount(0);
    setDefaultCategoryId("");
    setResult(null);
  }

  function handleClose(next: boolean) {
    if (!next) resetAll();
    onOpenChange(next);
  }

  async function handleContextNext() {
    if (mode === "account") {
      if (!accountId) {
        toast.error("Escolha uma conta.");
        return;
      }
      setStep("file");
      return;
    }
    if (!creditCardId) {
      toast.error("Escolha um cartão.");
      return;
    }
    startTransition(async () => {
      const result = await checkCardImportContext(creditCardId, referenceMonth);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      if (result.data.blocked) {
        toast.error(
          "Esta fatura já está paga. Reabra-a em /cartoes antes de importar.",
        );
        return;
      }
      setStep("file");
    });
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0];
    event.target.value = "";
    if (!selected) return;
    try {
      const parsed = await parseCsvFile(selected);
      setFile(selected);
      setCsvRows(parsed.rows);
      setMapping(defaultColumnMapping(parsed.firstRow.length));
      setStep("mapping");
    } catch (error) {
      toast.error(
        error instanceof CsvParseError
          ? error.message
          : "Não foi possível ler o arquivo.",
      );
    }
  }

  function handleMappingNext() {
    if (!csvRows || !mapping) return;
    const mapped = mapCsvRows(csvRows, mapping);
    const accepted = mapped.filter(
      (row) => !row.skippedReason && row.dateISO && row.amountCents != null,
    );
    setRejectedCount(mapped.length - accepted.length);

    const initialRows: ReviewRow[] = accepted.map((row) => {
      const type: "income" | "expense" =
        mode === "card" ? "expense" : row.isCredit ? "income" : "expense";
      const affectsBalance =
        mode === "card" ? true : row.dateISO! > cutoffDate;
      return {
        key: `row-${row.rowIndex}`,
        dateISO: row.dateISO!,
        description: row.description || "(sem descrição)",
        amountCents: row.amountCents!,
        type,
        categoryId: "",
        status: row.dateISO! > todayISO() ? "pending" : "paid",
        affectsBalance,
        isDuplicate: false,
        include: true,
      };
    });

    setRows(initialRows);
    setStep("review");

    setIsAnalyzing(true);
    (async () => {
      try {
        const [suggestionResult, analysis] = await Promise.all([
          fetchCategorySuggestionSource(),
          analyzeImportRows({
            contextId,
            rows: initialRows.map((r) => ({
              date: r.dateISO,
              description: r.description,
              amountCents: r.amountCents,
            })),
          }),
        ]);

        const index: CategorySuggestionIndex = buildCategorySuggestionIndex(
          suggestionResult.ok ? suggestionResult.data : [],
        );

        setRows((current) =>
          current.map((row, i) => ({
            ...row,
            categoryId: suggestCategory(row.description, index) ?? "",
            isDuplicate: analysis.ok ? (analysis.data.duplicates[i] ?? false) : false,
            include: analysis.ok
              ? !(analysis.data.duplicates[i] ?? false)
              : row.include,
          })),
        );
      } catch {
        // sugestão/dedup são melhor-esforço — revisão manual continua possível
      } finally {
        setIsAnalyzing(false);
      }
    })();
  }

  function applyDefaultCategory() {
    if (!defaultCategoryId) return;
    setRows((current) =>
      current.map((row) =>
        row.categoryId ? row : { ...row, categoryId: defaultCategoryId },
      ),
    );
  }

  function handleConfirm() {
    const included = rows.filter((r) => r.include);
    if (included.length === 0) {
      toast.error("Nenhuma linha selecionada.");
      return;
    }
    if (included.some((r) => !r.categoryId)) {
      toast.error("Todas as linhas incluídas precisam de categoria.");
      return;
    }

    startTransition(async () => {
      const payloadRows = included.map((r) => ({
        date: r.dateISO,
        description: r.description,
        amountCents: r.amountCents,
        type: r.type,
        categoryId: r.categoryId,
        status: r.status,
        affectsBalance: r.affectsBalance,
      }));

      const outcome =
        mode === "account"
          ? await importAccountEntries({
              accountId,
              fileName: file?.name ?? "importacao.csv",
              rows: payloadRows,
            })
          : await importCardEntries({
              creditCardId,
              referenceMonth,
              fileName: file?.name ?? "importacao.csv",
              rows: payloadRows.map(({ type: _type, affectsBalance: _ab, ...r }) => r),
            });

      if (!outcome.ok) {
        toast.error(outcome.error);
        return;
      }
      setResult(outcome.data);
      setStep("done");
    });
  }

  const selectedCard = cards.find((c) => c.id === creditCardId);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === "account" ? "Importar extrato de conta" : "Importar fatura de cartão"}
          </DialogTitle>
          <DialogDescription>
            {step === "context" && "Escolha o contexto desta importação."}
            {step === "file" && "Envie o arquivo CSV do seu banco."}
            {step === "mapping" && "Diga o que cada coluna do arquivo significa."}
            {step === "review" &&
              "Confira, ajuste categorias e confirme os lançamentos."}
            {step === "done" && "Importação concluída."}
          </DialogDescription>
        </DialogHeader>

        {step === "context" && (
          <div className="grid gap-4">
            {mode === "account" ? (
              <>
                <div className="space-y-2">
                  <Label>Conta</Label>
                  <Select value={accountId} onValueChange={setAccountId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Escolha a conta" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Seu saldo inicial já reflete os lançamentos até quando?</Label>
                  <DatePicker value={cutoffDate} onValueChange={setCutoffDate} />
                  <p className="text-muted-foreground text-xs">
                    Linhas até essa data nascem como &quot;histórico&quot; (não
                    afetam o saldo); depois dela, afetam normalmente. Você
                    pode ajustar linha por linha na revisão.
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>Cartão</Label>
                  <Select value={creditCardId} onValueChange={setCreditCardId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Escolha o cartão" />
                    </SelectTrigger>
                    <SelectContent>
                      {cards.map((card) => (
                        <SelectItem key={card.id} value={card.id}>
                          {card.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Competência da fatura</Label>
                  <MonthNav
                    month={referenceMonth}
                    onMonthChange={setReferenceMonth}
                  />
                  <p className="text-muted-foreground text-xs">
                    Todas as compras do arquivo entram nesta única fatura.
                  </p>
                </div>
              </>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => handleClose(false)}>
                Cancelar
              </Button>
              <Button onClick={handleContextNext} disabled={isPending}>
                {isPending ? <Loader2 className="animate-spin" /> : null}
                Continuar <ChevronRight />
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === "file" && (
          <div className="grid gap-4">
            <label className="border-input hover:bg-accent/50 flex flex-col items-center gap-2 rounded-md border border-dashed px-6 py-10 text-center text-sm">
              <Upload className="text-muted-foreground size-6" />
              <span>Clique para escolher um arquivo .csv</span>
              <span className="text-muted-foreground text-xs">
                Até 500 linhas / 1 MB
              </span>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep("context")}>
                <ChevronLeft /> Voltar
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === "mapping" && mapping && csvRows && (
          <MappingStep
            mapping={mapping}
            onMappingChange={setMapping}
            columnCount={csvRows[0]?.length ?? 0}
            firstRows={csvRows.slice(0, 3)}
            onBack={() => setStep("file")}
            onNext={handleMappingNext}
          />
        )}

        {step === "review" && (
          <div className="grid gap-3">
            {rejectedCount > 0 && (
              <p className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                <AlertTriangle className="size-3.5" />
                {rejectedCount} linha(s) ignorada(s): data ou valor
                inválido, ou é uma linha de crédito/estorno (fora do v1).
              </p>
            )}
            <div className="flex flex-wrap items-end gap-2">
              <div className="min-w-48 flex-1 space-y-1.5">
                <Label className="text-xs">
                  Categoria padrão desta importação
                </Label>
                <Select
                  value={defaultCategoryId}
                  onValueChange={setDefaultCategoryId}
                >
                  <SelectTrigger className="h-8 w-full">
                    <SelectValue placeholder="Escolha" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={applyDefaultCategory}
                disabled={!defaultCategoryId}
              >
                Aplicar às sem categoria
              </Button>
            </div>
            {isAnalyzing ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <ReviewTable
                rows={rows}
                onChange={setRows}
                categories={categories}
                mode={mode}
              />
            )}
            <p className="text-muted-foreground text-xs">
              {rows.filter((r) => r.include).length} de {rows.length}{" "}
              linha(s) selecionada(s) · total{" "}
              {formatCents(
                rows
                  .filter((r) => r.include)
                  .reduce((sum, r) => sum + r.amountCents, 0),
              )}
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep("mapping")}>
                <ChevronLeft /> Voltar
              </Button>
              <Button onClick={handleConfirm} disabled={isPending || isAnalyzing}>
                {isPending ? <Loader2 className="animate-spin" /> : null}
                Confirmar importação
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === "done" && result && (
          <div className="grid gap-4">
            <div className="flex flex-col items-center gap-2 py-4 text-center">
              <CheckCircle2 className="size-8 text-emerald-600 dark:text-emerald-400" />
              <p className="font-medium">
                {result.imported} lançamento(s) importado(s).
              </p>
              <p className="text-muted-foreground text-sm">
                Errou algo? Você pode desfazer esta importação inteira em{" "}
                <Link
                  href="/transacoes/importar"
                  className="underline underline-offset-2"
                  onClick={() => handleClose(false)}
                >
                  Importar dados
                </Link>
                .
              </p>
            </div>
            {mode === "card" && selectedCard && (
              <div className="bg-secondary/50 rounded-md p-3 text-sm">
                <p className="mb-2 flex items-center gap-1.5 font-medium">
                  <CreditCard className="size-4" /> Esta fatura já foi paga?
                </p>
                <p className="text-muted-foreground mb-3 text-xs">
                  Se sim, registre o pagamento como histórico para não
                  debitar o saldo de novo.
                </p>
                <Button variant="outline" size="sm" asChild>
                  <Link
                    href={`/cartoes/${selectedCard.id}`}
                    onClick={() => handleClose(false)}
                  >
                    Ir para o cartão
                  </Link>
                </Button>
              </div>
            )}
            <DialogFooter>
              <Button onClick={() => handleClose(false)}>Concluir</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function MappingStep({
  mapping,
  onMappingChange,
  columnCount,
  firstRows,
  onBack,
  onNext,
}: {
  mapping: ColumnMapping;
  onMappingChange: (mapping: ColumnMapping) => void;
  columnCount: number;
  firstRows: string[][];
  onBack: () => void;
  onNext: () => void;
}) {
  const columnOptions = Array.from({ length: columnCount }, (_, i) => i);

  function set<K extends keyof ColumnMapping>(key: K, value: ColumnMapping[K]) {
    onMappingChange({ ...mapping, [key]: value });
  }

  function columnLabel(index: number) {
    const sample = firstRows[mapping.hasHeaderRow ? 1 : 0]?.[index] ?? "";
    return `Coluna ${index + 1}${sample ? ` (ex.: ${sample})` : ""}`;
  }

  return (
    <div className="grid gap-4">
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="has-header"
          checked={mapping.hasHeaderRow}
          onChange={(e) => set("hasHeaderRow", e.target.checked)}
          className="size-4"
        />
        <Label htmlFor="has-header" className="font-normal">
          A primeira linha é um cabeçalho (não é um lançamento)
        </Label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs">Coluna da data</Label>
          <Select
            value={String(mapping.dateColumn)}
            onValueChange={(v) => set("dateColumn", Number(v))}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {columnOptions.map((i) => (
                <SelectItem key={i} value={String(i)}>
                  {columnLabel(i)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Formato da data</Label>
          <Select
            value={mapping.dateFormat}
            onValueChange={(v) => set("dateFormat", v as DateFormat)}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(DATE_FORMAT_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Coluna da descrição</Label>
        <Select
          value={String(mapping.descriptionColumn)}
          onValueChange={(v) => set("descriptionColumn", Number(v))}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {columnOptions.map((i) => (
              <SelectItem key={i} value={String(i)}>
                {columnLabel(i)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Como o valor aparece no arquivo</Label>
        <Select
          value={mapping.amountMode}
          onValueChange={(v) => set("amountMode", v as AmountMode)}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(AMOUNT_MODE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {mapping.amountMode !== "debit_credit" && (
          <div className="space-y-1.5">
            <Label className="text-xs">Coluna do valor</Label>
            <Select
              value={mapping.amountColumn != null ? String(mapping.amountColumn) : ""}
              onValueChange={(v) => set("amountColumn", Number(v))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Escolha" />
              </SelectTrigger>
              <SelectContent>
                {columnOptions.map((i) => (
                  <SelectItem key={i} value={String(i)}>
                    {columnLabel(i)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        {mapping.amountMode === "amount_type" && (
          <div className="space-y-1.5">
            <Label className="text-xs">Coluna D/C</Label>
            <Select
              value={mapping.typeColumn != null ? String(mapping.typeColumn) : ""}
              onValueChange={(v) => set("typeColumn", Number(v))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Escolha" />
              </SelectTrigger>
              <SelectContent>
                {columnOptions.map((i) => (
                  <SelectItem key={i} value={String(i)}>
                    {columnLabel(i)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        {mapping.amountMode === "debit_credit" && (
          <>
            <div className="space-y-1.5">
              <Label className="text-xs">Coluna de débito</Label>
              <Select
                value={mapping.debitColumn != null ? String(mapping.debitColumn) : ""}
                onValueChange={(v) => set("debitColumn", Number(v))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Escolha" />
                </SelectTrigger>
                <SelectContent>
                  {columnOptions.map((i) => (
                    <SelectItem key={i} value={String(i)}>
                      {columnLabel(i)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Coluna de crédito</Label>
              <Select
                value={mapping.creditColumn != null ? String(mapping.creditColumn) : ""}
                onValueChange={(v) => set("creditColumn", Number(v))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Escolha" />
                </SelectTrigger>
                <SelectContent>
                  {columnOptions.map((i) => (
                    <SelectItem key={i} value={String(i)}>
                      {columnLabel(i)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        )}
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Separador decimal</Label>
        <Select
          value={mapping.decimalSeparator}
          onValueChange={(v) => set("decimalSeparator", v as "," | ".")}
        >
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value=",">Vírgula (1.234,56)</SelectItem>
            <SelectItem value=".">Ponto (1234.56)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onBack}>
          <ChevronLeft /> Voltar
        </Button>
        <Button onClick={onNext}>
          Continuar <ChevronRight />
        </Button>
      </DialogFooter>
    </div>
  );
}
