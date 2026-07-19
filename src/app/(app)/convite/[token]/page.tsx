import type { Metadata } from "next";
import { MailX } from "lucide-react";

import { getInvitePreview } from "@/features/households/queries";
import { InviteAcceptCard } from "@/features/households/components/invite-accept-card";
import { EmptyState } from "@/components/shared/empty-state";

export const metadata: Metadata = { title: "Convite" };

/**
 * Aceite de convite (Fase 16): rota protegida — não logado cai no /login com
 * ?next= e volta pra cá depois (é o fluxo do doc: sem conta, cadastra antes).
 * Quem tem o token (o link) vê o consentimento; o token cru nunca vai ao
 * banco (hash em `getInvitePreview`).
 */
export default async function ConvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const preview = await getInvitePreview(token);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center">
      {preview ? (
        <InviteAcceptCard token={token} preview={preview} />
      ) : (
        <EmptyState
          icon={MailX}
          title="Convite não encontrado"
          description="O link pode estar incompleto, o convite pode ter sido revogado ou substituído por um mais novo. Peça outro link ao administrador da casa."
        />
      )}
    </div>
  );
}
