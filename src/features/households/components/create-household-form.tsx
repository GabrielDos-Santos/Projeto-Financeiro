"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Home, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { createHousehold } from "../actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Estado simples, sem RHF — um campo só (mesmo racional da decisão 59). */
export function CreateHouseholdForm() {
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await createHousehold({ name });
      if (!result.ok) {
        setError(result.fieldErrors?.name?.[0] ?? result.error);
        return;
      }
      toast.success("Casa criada! Agora convide os membros.");
      router.refresh();
    });
  }

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Home className="size-4" aria-hidden /> Criar uma casa
        </CardTitle>
        <CardDescription>
          A casa reúne as finanças da família: você (administrador) passa a
          ver os lançamentos de quem aceitar seu convite; os membros veem os
          totais da casa e as contas que você compartilhar.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="space-y-2">
            <Label htmlFor="household-name">Nome da casa</Label>
            <Input
              id="household-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError(null);
              }}
              placeholder="Ex.: Família Santos"
              maxLength={80}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="animate-spin" />}
            Criar casa
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
