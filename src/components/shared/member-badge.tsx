import { User } from "lucide-react";

import { Badge } from "@/components/ui/badge";

/** Pílula discreta com o nome do membro dono do lançamento/conta (Fase 16). */
export function MemberBadge({ name }: { name: string }) {
  return (
    <Badge
      variant="outline"
      className="max-w-full gap-1 border-dashed text-muted-foreground"
    >
      <User className="size-3 shrink-0" aria-hidden />
      <span className="min-w-0 truncate">{name}</span>
    </Badge>
  );
}
