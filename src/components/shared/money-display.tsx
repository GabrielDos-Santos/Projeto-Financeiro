import { formatCents } from "@/lib/money";
import { cn } from "@/lib/utils";

type MoneyDisplayProps = {
  cents: number;
  /** Verde quando positivo, vermelho quando negativo (saldos e resultados). */
  colorBySign?: boolean;
  className?: string;
};

export function MoneyDisplay({
  cents,
  colorBySign = false,
  className,
}: MoneyDisplayProps) {
  return (
    <span
      className={cn(
        "tabular-nums",
        colorBySign && cents > 0 && "text-emerald-600 dark:text-emerald-400",
        colorBySign && cents < 0 && "text-red-600 dark:text-red-400",
        className,
      )}
    >
      {formatCents(cents)}
    </span>
  );
}
