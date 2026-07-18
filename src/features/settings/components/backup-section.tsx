"use client";

import * as React from "react";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function BackupSection() {
  const [isPending, setIsPending] = React.useState(false);

  async function handleDownload() {
    setIsPending(true);
    try {
      const response = await fetch("/api/backup");
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        toast.error(body?.error ?? "Não foi possível gerar o backup.");
        return;
      }
      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition") ?? "";
      const filename =
        /filename="([^"]+)"/.exec(disposition)?.[1] ?? "backup.json";

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
      toast.success("Backup gerado.");
    } catch {
      toast.error("Não foi possível gerar o backup. Tente novamente.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Backup dos seus dados</CardTitle>
        <CardDescription>
          Um arquivo JSON com todas as suas contas, categorias, lançamentos,
          cartões, recorrências, orçamentos e metas.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button variant="outline" onClick={handleDownload} disabled={isPending}>
          {isPending ? <Loader2 className="animate-spin" /> : <Download />}
          Baixar backup (JSON)
        </Button>
      </CardContent>
    </Card>
  );
}
