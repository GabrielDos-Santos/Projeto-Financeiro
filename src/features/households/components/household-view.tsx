"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  Check,
  Copy,
  Landmark,
  Link2,
  Loader2,
  LogOut,
  Mail,
  Trash2,
  UserMinus,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { formatDateBR } from "@/lib/dates";
import {
  inviteMember,
  leaveHousehold,
  removeMember,
  revokeInvite,
  shareAccount,
  unshareAccount,
} from "../actions";
import { ROLE_LABELS, type HouseholdData } from "../types";
import { Badge } from "@/components/ui/badge";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";

function InviteSection({ onInvited }: { onInvited: () => void }) {
  const [email, setEmail] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();

  function handleInvite(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await inviteMember({ email });
      if (!result.ok) {
        setError(result.fieldErrors?.email?.[0] ?? result.error);
        return;
      }
      // O token só existe AGORA (o banco guarda o hash): o link precisa ser
      // copiado nesta tela — reconvidar gera um novo e invalida este.
      setInviteUrl(`${window.location.origin}/convite/${result.data.token}`);
      setCopied(false);
      setEmail("");
      onInvited();
    });
  }

  async function handleCopy() {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    toast.success("Link copiado — envie para o convidado.");
  }

  return (
    <div className="flex flex-col gap-3">
      <form
        onSubmit={handleInvite}
        className="flex flex-col gap-2 sm:flex-row sm:items-end"
      >
        <div className="flex-1 space-y-2">
          <Label htmlFor="invite-email">E-mail do convidado</Label>
          <Input
            id="invite-email"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError(null);
            }}
            placeholder="pessoa@exemplo.com"
          />
        </div>
        <Button type="submit" disabled={isPending} className="sm:shrink-0">
          {isPending ? <Loader2 className="animate-spin" /> : <Mail />}
          Gerar convite
        </Button>
      </form>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {inviteUrl && (
        <div className="flex flex-col gap-2 rounded-md border bg-secondary/50 p-3">
          <p className="flex items-center gap-1.5 text-xs font-medium">
            <Link2 className="size-3.5" aria-hidden /> Convite criado — copie
            e envie o link (vale por 7 dias):
          </p>
          <div className="flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded bg-background px-2 py-1.5 text-xs">
              {inviteUrl}
            </code>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="shrink-0"
            >
              {copied ? <Check /> : <Copy />} Copiar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function HouseholdView({
  data,
  myUserId,
}: {
  data: HouseholdData;
  myUserId: string;
}) {
  const router = useRouter();
  const isAdmin = data.myRole === "admin";
  const [leaveOpen, setLeaveOpen] = React.useState(false);
  const [removeTarget, setRemoveTarget] = React.useState<{
    id: string;
    name: string;
  } | null>(null);
  const [shareAccountId, setShareAccountId] = React.useState("");
  const [isPending, startTransition] = React.useTransition();

  const iAmOnlyMember = data.members.length === 1;

  function run(action: () => Promise<{ ok: boolean; error?: string }>) {
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        toast.error(result.error ?? "Algo deu errado.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <CardTitle className="text-base">{data.household.name}</CardTitle>
              <CardDescription>
                Você é {ROLE_LABELS[data.myRole].toLowerCase()} desta casa.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link href="/familia/dashboard">
                  <BarChart3 /> Dashboard da família
                </Link>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLeaveOpen(true)}
                className="text-destructive"
              >
                <LogOut /> {iAmOnlyMember ? "Encerrar casa" : "Sair da casa"}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="size-4" aria-hidden /> Membros
          </CardTitle>
          <CardDescription>
            {isAdmin
              ? "Você vê os lançamentos de todos; ninguém edita dados dos outros."
              : "O administrador vê os lançamentos de todos; ninguém edita dados dos outros."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <ul className="divide-y divide-border">
            {data.members.map((member) => (
              <li
                key={member.id}
                className="flex flex-wrap items-center gap-2 py-2"
              >
                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                  {member.full_name}
                  {member.user_id === myUserId && (
                    <span className="text-muted-foreground"> (você)</span>
                  )}
                </span>
                <Badge
                  variant={member.role === "admin" ? "default" : "outline"}
                >
                  {ROLE_LABELS[member.role]}
                </Badge>
                {isAdmin && member.user_id !== myUserId && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground"
                    aria-label={`Remover ${member.full_name}`}
                    onClick={() =>
                      setRemoveTarget({ id: member.id, name: member.full_name })
                    }
                  >
                    <UserMinus />
                  </Button>
                )}
              </li>
            ))}
          </ul>

          {isAdmin && (
            <>
              <InviteSection onInvited={() => router.refresh()} />
              {data.pendingInvites.length > 0 && (
                <div className="flex flex-col gap-1">
                  <p className="text-xs font-medium text-muted-foreground">
                    Convites pendentes
                  </p>
                  <ul className="divide-y divide-border">
                    {data.pendingInvites.map((invite) => (
                      <li
                        key={invite.id}
                        className="flex flex-wrap items-center gap-2 py-1.5 text-sm"
                      >
                        <span className="min-w-0 flex-1 truncate">
                          {invite.email}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          expira {formatDateBR(invite.expires_at.slice(0, 10))}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground"
                          aria-label={`Revogar convite de ${invite.email}`}
                          disabled={isPending}
                          onClick={() => run(() => revokeInvite(invite.id))}
                        >
                          <Trash2 />
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Landmark className="size-4" aria-hidden /> Contas compartilhadas
          </CardTitle>
          <CardDescription>
            Membros comuns veem os lançamentos destas contas, linha a linha.
            {isAdmin && " Você gerencia a lista."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {data.sharedAccounts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma conta compartilhada ainda.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {data.sharedAccounts.map((shared) => (
                <li
                  key={shared.id}
                  className="flex flex-wrap items-center gap-2 py-2 text-sm"
                >
                  <span className="min-w-0 flex-1 truncate font-medium">
                    {shared.account_name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    de {shared.owner_name}
                  </span>
                  {isAdmin && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground"
                      aria-label={`Deixar de compartilhar ${shared.account_name}`}
                      disabled={isPending}
                      onClick={() => run(() => unshareAccount(shared.id))}
                    >
                      <Trash2 />
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}

          {isAdmin && data.shareableAccounts.length > 0 && (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="flex-1 space-y-2">
                <Label>Compartilhar uma conta</Label>
                <Select
                  value={shareAccountId}
                  onValueChange={setShareAccountId}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Escolha a conta" />
                  </SelectTrigger>
                  <SelectContent>
                    {data.shareableAccounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.name} · {account.owner_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                type="button"
                disabled={isPending || !shareAccountId}
                className="sm:shrink-0"
                onClick={() =>
                  run(async () => {
                    const result = await shareAccount({
                      accountId: shareAccountId,
                    });
                    if (result.ok) setShareAccountId("");
                    return result;
                  })
                }
              >
                Compartilhar
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={leaveOpen}
        onOpenChange={setLeaveOpen}
        title={iAmOnlyMember ? "Encerrar a casa" : "Sair da casa"}
        description={
          iAmOnlyMember
            ? `Você é o único membro — a casa "${data.household.name}" será encerrada (convites e compartilhamentos somem; seus lançamentos não são afetados).`
            : `Você sairá de "${data.household.name}": o administrador deixa de ver seus dados e você perde acesso ao dashboard da família. Seus lançamentos não são afetados.`
        }
        confirmLabel={iAmOnlyMember ? "Encerrar" : "Sair"}
        destructive
        isPending={isPending}
        onConfirm={() =>
          run(async () => {
            const result = await leaveHousehold();
            if (result.ok) setLeaveOpen(false);
            return result;
          })
        }
      />
      <ConfirmDialog
        open={removeTarget != null}
        onOpenChange={(open) => !open && setRemoveTarget(null)}
        title="Remover membro"
        description={`${removeTarget?.name ?? "O membro"} sai da casa: você deixa de ver os dados dele e ele perde o acesso aos agregados. Os lançamentos dele não são afetados.`}
        confirmLabel="Remover"
        destructive
        isPending={isPending}
        onConfirm={() =>
          run(async () => {
            const result = await removeMember(removeTarget!.id);
            if (result.ok) setRemoveTarget(null);
            return result;
          })
        }
      />
    </div>
  );
}
