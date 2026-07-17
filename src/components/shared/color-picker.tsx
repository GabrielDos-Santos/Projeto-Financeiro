"use client";

import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Paleta fechada (Tailwind 500) — inclui todas as cores usadas pelas
 * categorias padrão de `create_default_categories()` (migration 0006).
 */
export const DOMAIN_COLORS = [
  "#ef4444", // red
  "#f97316", // orange
  "#f59e0b", // amber
  "#eab308", // yellow
  "#84cc16", // lime
  "#22c55e", // green
  "#10b981", // emerald
  "#14b8a6", // teal
  "#06b6d4", // cyan
  "#0ea5e9", // sky
  "#3b82f6", // blue
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#a855f7", // purple
  "#ec4899", // pink
  "#f43f5e", // rose
  "#64748b", // slate
  "#71717a", // zinc
] as const;

type ColorPickerProps = {
  value: string;
  onValueChange: (color: string) => void;
  className?: string;
};

export function ColorPicker({
  value,
  onValueChange,
  className,
}: ColorPickerProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Cor"
      className={cn("grid grid-cols-9 gap-2", className)}
    >
      {DOMAIN_COLORS.map((color) => {
        const selected = value.toLowerCase() === color;
        return (
          <button
            key={color}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={color}
            onClick={() => onValueChange(color)}
            className={cn(
              "flex size-7 items-center justify-center rounded-full transition-transform outline-none hover:scale-110 focus-visible:ring-[3px] focus-visible:ring-ring/50",
              selected &&
                "ring-2 ring-ring ring-offset-2 ring-offset-background",
            )}
            style={{ backgroundColor: color }}
          >
            {selected && <Check className="size-4 text-white" aria-hidden />}
          </button>
        );
      })}
    </div>
  );
}
