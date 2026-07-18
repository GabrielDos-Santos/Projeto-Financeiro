"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";

/** Navegação simples entre anos — "‹ 2026 ›". */
export function YearNav({
  year,
  onYearChange,
}: {
  year: number;
  onYearChange: (year: number) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <Button
        variant="outline"
        size="icon"
        aria-label="Ano anterior"
        onClick={() => onYearChange(year - 1)}
      >
        <ChevronLeft />
      </Button>
      <span className="w-16 text-center text-sm font-medium">{year}</span>
      <Button
        variant="outline"
        size="icon"
        aria-label="Próximo ano"
        onClick={() => onYearChange(year + 1)}
      >
        <ChevronRight />
      </Button>
    </div>
  );
}
