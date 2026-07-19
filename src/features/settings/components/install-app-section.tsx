"use client";

import { Download, Share, SquarePlus } from "lucide-react";

import { useInstallPrompt } from "@/hooks/use-install-prompt";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/** Fase 15 (PWA) — só aparece quando faz sentido: nada some quando o app já
 * está instalado, e a instrução do iOS só existe porque o Safari não tem
 * `beforeinstallprompt` (nenhum outro caminho é possível lá). */
export function InstallAppSection() {
  const { installed, ios, canInstall, promptInstall } = useInstallPrompt();

  if (installed || (!ios && !canInstall)) return null;

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-0.5">
          <p className="text-sm font-medium">Instalar o app</p>
          <p className="text-xs text-muted-foreground">
            {ios
              ? "No Safari: toque em Compartilhar"
              : "Acesso mais rápido, direto da tela inicial do seu celular."}
            {ios && (
              <>
                {" "}
                <Share className="inline size-3.5 align-text-bottom" aria-hidden />{" "}
                e depois em &quot;Adicionar à Tela de Início&quot;{" "}
                <SquarePlus
                  className="inline size-3.5 align-text-bottom"
                  aria-hidden
                />
                .
              </>
            )}
          </p>
        </div>
        {!ios && (
          <Button onClick={promptInstall} size="sm">
            <Download /> Instalar app
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
