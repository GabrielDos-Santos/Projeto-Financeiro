import { formatCents } from "@/lib/money";
import { cn } from "@/lib/utils";

/** Barra de uso do limite: usado (limite − disponível) sobre o limite total. */
export function LimitBar({
  limitCents,
  availableCents,
  color,
}: {
  limitCents: number;
  availableCents: number;
  color?: string | null;
}) {
  const usedCents = Math.max(0, limitCents - availableCents);
  const ratio = limitCents > 0 ? Math.min(1, usedCents / limitCents) : 0;
  const overLimit = availableCents < 0;

  return (
    <div className="space-y-1.5">
      <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className={cn("h-full rounded-full", overLimit && "bg-destructive")}
          style={{
            width: `${Math.round(ratio * 100)}%`,
            backgroundColor: overLimit || !color ? undefined : color,
          }}
        />
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Usado {formatCents(usedCents)}</span>
        <span className={cn(overLimit && "font-medium text-destructive")}>
          {overLimit
            ? "Limite estourado"
            : `Disponível ${formatCents(availableCents)}`}
        </span>
      </div>
    </div>
  );
}
