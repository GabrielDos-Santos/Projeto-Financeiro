import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type StatCardProps = {
  label: string;
  icon?: LucideIcon;
  hint?: string;
  className?: string;
  children: React.ReactNode;
};

/** Tile de indicador — um número/headline com rótulo e dica opcional. */
export function StatCard({
  label,
  icon: Icon,
  hint,
  className,
  children,
}: StatCardProps) {
  return (
    <Card className={className}>
      <CardContent className="space-y-1">
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          {Icon && <Icon className="size-4" aria-hidden />}
          {label}
        </div>
        <div className={cn("text-2xl font-semibold tracking-tight")}>
          {children}
        </div>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}
