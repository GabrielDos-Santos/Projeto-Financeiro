import { History } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * Badge para lançamentos com `affects_balance = false` (Fase 17 — onboarding
 * com histórico): contam nos relatórios por competência, mas não movem o
 * saldo derivado (já refletidos no saldo inicial da conta).
 */
export function HistoricalBadge() {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant="outline" className="text-muted-foreground gap-1">
          <History className="size-3" aria-hidden />
          Histórico
        </Badge>
      </TooltipTrigger>
      <TooltipContent>Não afeta o saldo atual da conta</TooltipContent>
    </Tooltip>
  );
}
