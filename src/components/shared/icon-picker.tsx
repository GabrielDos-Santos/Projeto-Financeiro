"use client";

import { cn } from "@/lib/utils";
import {
  DOMAIN_ICON_NAMES,
  DOMAIN_ICONS,
  type DomainIconName,
} from "./domain-icon";

type IconPickerProps = {
  value: string;
  onValueChange: (icon: DomainIconName) => void;
  /** Cor de destaque do ícone selecionado (a cor escolhida no ColorPicker). */
  accentColor?: string;
  className?: string;
};

export function IconPicker({
  value,
  onValueChange,
  accentColor,
  className,
}: IconPickerProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Ícone"
      className={cn(
        "grid max-h-40 grid-cols-8 gap-1 overflow-y-auto pr-1",
        className,
      )}
    >
      {DOMAIN_ICON_NAMES.map((name) => {
        const Icon = DOMAIN_ICONS[name];
        const selected = value === name;
        return (
          <button
            key={name}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={name}
            onClick={() => onValueChange(name)}
            className={cn(
              "flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors outline-none hover:bg-accent hover:text-accent-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50",
              selected && "bg-secondary text-foreground ring-2 ring-ring",
            )}
            style={selected && accentColor ? { color: accentColor } : undefined}
          >
            <Icon className="size-4" aria-hidden />
          </button>
        );
      })}
    </div>
  );
}
