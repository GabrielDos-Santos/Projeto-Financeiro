import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description?: string;
  /** Ação principal (ex.: botão "Nova conta"). */
  children?: React.ReactNode;
  className?: string;
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  children,
  className,
}: EmptyStateProps) {
  return (
    <Card className={className}>
      <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-secondary text-muted-foreground">
          <Icon className="size-6" aria-hidden />
        </div>
        <div className="space-y-1">
          <h2 className="font-semibold">{title}</h2>
          {description && (
            <p
              className={cn(
                "mx-auto max-w-sm text-sm text-balance text-muted-foreground",
              )}
            >
              {description}
            </p>
          )}
        </div>
        {children && <div className="mt-1">{children}</div>}
      </CardContent>
    </Card>
  );
}
