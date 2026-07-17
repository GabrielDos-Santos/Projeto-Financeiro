"use client";

import { formatDateBR, todayISO } from "@/lib/dates";
import { nextOccurrences, type Frequency } from "@/services/recurrence";
import { Badge } from "@/components/ui/badge";

/** Próximas ocorrências (de hoje em diante) de um template — preview no form. */
export function NextOccurrencesPreview({
  startDate,
  frequency,
  intervalCount,
  endDate,
  count = 5,
}: {
  startDate: string;
  frequency: Frequency;
  intervalCount: number;
  endDate: string | null;
  count?: number;
}) {
  if (!startDate || intervalCount < 1) return null;

  const occurrences = nextOccurrences(
    startDate,
    frequency,
    intervalCount,
    endDate,
    todayISO(),
    count,
  );

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">
        Próximas ocorrências
      </p>
      {occurrences.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhuma ocorrência futura (verifique a data de fim).
        </p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {occurrences.map((occ) => (
            <Badge key={occ} variant="secondary">
              {formatDateBR(occ)}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
