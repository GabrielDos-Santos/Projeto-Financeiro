"use client";

import * as React from "react";
import { Loader2, Play } from "lucide-react";
import { toast } from "sonner";

import { runRecurringGeneration } from "../actions";
import { Button } from "@/components/ui/button";

/** Dispara agora a geração de lançamentos devidos (mesma função do cron diário). */
export function GenerateNowButton() {
  const [isPending, startTransition] = React.useTransition();

  function handleClick() {
    startTransition(async () => {
      const result = await runRecurringGeneration();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      const n = result.data.generated;
      toast.success(
        n === 0
          ? "Nada a gerar agora."
          : `${n} lançamento(s) gerado(s). Veja em Transações.`,
      );
    });
  }

  return (
    <Button
      variant="outline"
      onClick={handleClick}
      disabled={isPending}
      title="Gera agora os lançamentos devidos, sem esperar o job diário"
    >
      {isPending ? <Loader2 className="animate-spin" /> : <Play />}
      Gerar agora
    </Button>
  );
}
