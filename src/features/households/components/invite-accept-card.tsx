"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, Home, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { acceptInvite } from "../actions";
import type { InvitePreview } from "../queries";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function InviteAcceptCard({
  token,
  preview,
}: {
  token: string;
  preview: InvitePreview;
}) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();

  const blocked = preview.expired || preview.accepted;

  function handleAccept() {
    startTransition(async () => {
      const result = await acceptInvite(token);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Bem-vindo(a) à casa "${preview.householdName}"!`);
      router.push("/familia");
      router.refresh();
    });
  }

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Home className="size-4" aria-hidden /> Convite para{" "}
          {preview.householdName}
        </CardTitle>
        <CardDescription>
          Convite enviado para <strong>{preview.email}</strong>.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {blocked ? (
          <p className="text-sm text-muted-foreground">
            {preview.accepted
              ? "Este convite já foi utilizado."
              : "Este convite expirou — peça um novo link ao administrador da casa."}
          </p>
        ) : (
          <>
            {/* Consentimento explícito (decisão 85): o texto diz o que o
             * admin passa a ver ANTES do aceite. */}
            <div className="flex items-start gap-2 rounded-md border bg-secondary/50 p-3 text-sm">
              <Eye className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <p>
                Ao aceitar, o <strong>administrador da casa</strong> poderá
                ver suas contas, cartões e transações (somente leitura —
                ninguém edita nada seu). Você verá os totais da casa e as
                contas compartilhadas, e pode sair quando quiser.
              </p>
            </div>
            <Button onClick={handleAccept} disabled={isPending}>
              {isPending && <Loader2 className="animate-spin" />}
              Aceitar e entrar na casa
            </Button>
          </>
        )}
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard">Voltar ao painel</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
