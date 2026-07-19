"use client";

import * as React from "react";
import {
  CreditCard,
  FileSpreadsheet,
  Landmark,
  Layers,
  Undo2,
} from "lucide-react";
import { toast } from "sonner";

import { formatDateBR } from "@/lib/dates";
import type {
  AccountOption,
  CardOption,
  CategoryOption,
} from "@/features/transactions/types";
import { undoImport } from "../actions";
import type { ImportBatch } from "../types";
import { ImportWizard } from "./import-wizard";
import { InstallmentBackfillForm } from "./installment-backfill-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";

const BATCH_KIND_LABELS: Record<ImportBatch["kind"], string> = {
  account_csv: "Extrato de conta",
  card_csv: "Fatura de cartão",
};

type EntryKind = "account" | "card" | "installment" | null;

type ImportHubProps = {
  accounts: AccountOption[];
  cards: CardOption[];
  categories: CategoryOption[];
  recentBatches: ImportBatch[];
};

export function ImportHub({
  accounts,
  cards,
  categories,
  recentBatches,
}: ImportHubProps) {
  const [active, setActive] = React.useState<EntryKind>(null);
  const [undoTarget, setUndoTarget] = React.useState<ImportBatch | null>(null);
  const [isPending, startTransition] = React.useTransition();

  function handleUndo() {
    if (!undoTarget) return;
    startTransition(async () => {
      const result = await undoImport(undoTarget.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Importação desfeita.");
      setUndoTarget(null);
    });
  }

  return (
    <div className="grid gap-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <button type="button" onClick={() => setActive("account")}>
          <Card className="h-full text-left transition-colors hover:border-primary/50">
            <CardContent className="flex flex-col gap-2">
              <Landmark className="size-5 text-muted-foreground" />
              <p className="font-medium">Extrato de conta</p>
              <p className="text-xs text-muted-foreground">
                Importe um CSV do seu banco — várias linhas de uma vez.
              </p>
            </CardContent>
          </Card>
        </button>
        <button
          type="button"
          onClick={() => setActive("card")}
          disabled={cards.length === 0}
        >
          <Card className="h-full text-left transition-colors hover:border-primary/50 disabled:opacity-50">
            <CardContent className="flex flex-col gap-2">
              <CreditCard className="size-5 text-muted-foreground" />
              <p className="font-medium">Fatura de cartão</p>
              <p className="text-xs text-muted-foreground">
                {cards.length === 0
                  ? "Cadastre um cartão primeiro."
                  : "Importe as compras de uma competência inteira."}
              </p>
            </CardContent>
          </Card>
        </button>
        <button type="button" onClick={() => setActive("installment")}>
          <Card className="h-full text-left transition-colors hover:border-primary/50">
            <CardContent className="flex flex-col gap-2">
              <Layers className="size-5 text-muted-foreground" />
              <p className="font-medium">Compra parcelada em andamento</p>
              <p className="text-xs text-muted-foreground">
                Reconstrua uma compra com parcelas já pagas e futuras.
              </p>
            </CardContent>
          </Card>
        </button>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-medium">Importações recentes</h2>
        {recentBatches.length === 0 ? (
          <EmptyState
            icon={FileSpreadsheet}
            title="Nenhuma importação ainda"
            description="Os lotes de CSV importados aparecem aqui, com a opção de desfazer."
          />
        ) : (
          <Card>
            <CardContent className="divide-y divide-border p-0">
              {recentBatches.map((batch) => (
                <div
                  key={batch.id}
                  className="flex flex-wrap items-center justify-between gap-2 px-6 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {batch.file_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {BATCH_KIND_LABELS[batch.kind]} · {batch.row_count}{" "}
                      linha(s) · {formatDateBR(batch.created_at.slice(0, 10))}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setUndoTarget(batch)}
                  >
                    <Undo2 /> Desfazer
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </section>

      <ImportWizard
        mode="account"
        accounts={accounts}
        cards={cards}
        categories={categories}
        open={active === "account"}
        onOpenChange={(open) => setActive(open ? "account" : null)}
      />
      <ImportWizard
        mode="card"
        accounts={accounts}
        cards={cards}
        categories={categories}
        open={active === "card"}
        onOpenChange={(open) => setActive(open ? "card" : null)}
      />

      <Dialog
        open={active === "installment"}
        onOpenChange={(open) => setActive(open ? "installment" : null)}
      >
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Compra parcelada em andamento</DialogTitle>
            <DialogDescription>
              Reconstrua a compra por completo: mãe, parcelas já pagas e
              futuras.
            </DialogDescription>
          </DialogHeader>
          <InstallmentBackfillForm
            accounts={accounts}
            cards={cards}
            categories={categories}
            onDone={() => setActive(null)}
          />
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(undoTarget)}
        onOpenChange={(open) => !open && setUndoTarget(null)}
        title="Desfazer importação?"
        description={`Isso apaga as ${undoTarget?.row_count ?? 0} linha(s) importadas de "${undoTarget?.file_name ?? ""}". Essa ação não pode ser desfeita.`}
        confirmLabel="Desfazer importação"
        destructive
        isPending={isPending}
        onConfirm={handleUndo}
      />
    </div>
  );
}
