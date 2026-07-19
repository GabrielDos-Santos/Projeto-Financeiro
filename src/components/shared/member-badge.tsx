import { User } from "lucide-react";

import { Badge } from "@/components/ui/badge";

/** Pílula discreta com o nome do membro dono do lançamento/conta (Fase 16). */
export function MemberBadge({ name }: { name: string }) {
  return (
    <Badge
      variant="outline"
      className="gap-1 border-dashed text-muted-foreground"
    >
      <User className="size-3" aria-hidden />
      {name}
    </Badge>
  );
}
