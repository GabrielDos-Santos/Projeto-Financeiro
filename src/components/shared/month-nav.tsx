"use client";

import { addMonths, subMonths } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { formatMonthBR, parseDateOnly, toDateOnly } from "@/lib/dates";
import { Button } from "@/components/ui/button";

/** Navegação simples entre meses (competência) — "‹ julho de 2026 ›". */
export function MonthNav({
  month,
  onMonthChange,
}: {
  /** "YYYY-MM-01" */
  month: string;
  onMonthChange: (month: string) => void;
}) {
  const current = parseDateOnly(month);

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="outline"
        size="icon"
        aria-label="Mês anterior"
        onClick={() => onMonthChange(toDateOnly(subMonths(current, 1)))}
      >
        <ChevronLeft />
      </Button>
      <span className="w-40 text-center text-sm font-medium capitalize">
        {formatMonthBR(month)}
      </span>
      <Button
        variant="outline"
        size="icon"
        aria-label="Próximo mês"
        onClick={() => onMonthChange(toDateOnly(addMonths(current, 1)))}
      >
        <ChevronRight />
      </Button>
    </div>
  );
}
