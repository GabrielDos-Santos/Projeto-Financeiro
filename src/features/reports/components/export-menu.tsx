"use client";

import * as React from "react";
import { Download, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type ExportFormat = "csv" | "xlsx" | "pdf";

type ExportMenuProps = {
  /** Query params do relatório atual (scope + month|year), sem o `format`. */
  params: Record<string, string>;
};

const FORMAT_LABELS: Record<ExportFormat, string> = {
  csv: "CSV",
  xlsx: "Excel (.xlsx)",
  pdf: "PDF",
};

/**
 * Baixa o arquivo do Route Handler de export. Usa `fetch` (não navegação
 * direta) para conseguir mostrar o erro num toast se a API responder 4xx/5xx
 * (ex.: rate limit) em vez de abrir uma aba com JSON crua.
 */
export function ExportMenu({ params }: ExportMenuProps) {
  const [pendingFormat, setPendingFormat] = React.useState<ExportFormat | null>(
    null,
  );

  async function handleExport(format: ExportFormat) {
    setPendingFormat(format);
    try {
      const query = new URLSearchParams({ ...params, format }).toString();
      const response = await fetch(`/api/export?${query}`);
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        toast.error(body?.error ?? "Não foi possível exportar.");
        return;
      }
      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition") ?? "";
      const filename =
        /filename="([^"]+)"/.exec(disposition)?.[1] ?? `relatorio.${format}`;

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Não foi possível exportar. Tente novamente.");
    } finally {
      setPendingFormat(null);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={pendingFormat !== null}>
          {pendingFormat ? <Loader2 className="animate-spin" /> : <Download />}
          Exportar
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => handleExport("csv")}>
          <FileText /> {FORMAT_LABELS.csv}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => handleExport("xlsx")}>
          <FileSpreadsheet /> {FORMAT_LABELS.xlsx}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => handleExport("pdf")}>
          <FileText /> {FORMAT_LABELS.pdf}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
