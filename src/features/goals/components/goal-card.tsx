"use client";

import * as React from "react";
import {
  Archive,
  ArchiveRestore,
  CircleCheck,
  MoreVertical,
  Pencil,
  PiggyBank,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { formatDateBR } from "@/lib/dates";
import { formatCents } from "@/lib/money";
import { cn } from "@/lib/utils";
import { computeGoalProjection } from "@/services/goals";
import { GoalProgressRadial } from "@/components/charts/goal-progress-radial";
import { deleteGoal, setGoalArchived } from "../actions";
import { goalProgressPct, GOAL_STATUS_LABELS, type Goal } from "../types";
import { ContributeDialog } from "./contribute-dialog";
import { GoalFormDialog } from "./goal-form-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DomainIcon } from "@/components/shared/domain-icon";

export function GoalCard({ goal }: { goal: Goal }) {
  const [contributeOpen, setContributeOpen] = React.useState(false);
  const [editOpen, setEditOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();

  const color = goal.color ?? "#14b8a6";
  const pct = goalProgressPct(goal);
  const isActive = goal.status === "active";
  const isArchived = goal.status === "archived";
  const projection = computeGoalProjection(
    goal.current_amount_cents,
    goal.target_amount_cents,
    goal.target_date,
  );

  function handleArchiveToggle() {
    startTransition(async () => {
      const result = await setGoalArchived(goal.id, !isArchived);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(isArchived ? "Meta reativada." : "Meta arquivada.");
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteGoal(goal.id);
      if (!result.ok) {
        toast.error(result.error);
        setDeleteOpen(false);
        return;
      }
      toast.success("Meta excluída.");
      setDeleteOpen(false);
    });
  }

  return (
    <Card className={cn(isArchived && "opacity-60")}>
      <CardContent className="flex gap-4">
        <GoalProgressRadial pct={pct} color={color} />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-start gap-2">
            <div
              className="flex size-7 shrink-0 items-center justify-center rounded-full"
              style={{ backgroundColor: `${color}1f`, color }}
            >
              <DomainIcon name={goal.icon} className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{goal.name}</p>
              {goal.status !== "active" && (
                <Badge
                  variant="outline"
                  className={cn(
                    goal.status === "completed" &&
                      "border-emerald-500/40 text-emerald-600 dark:text-emerald-400",
                  )}
                >
                  {goal.status === "completed" && (
                    <CircleCheck className="size-3" />
                  )}
                  {GOAL_STATUS_LABELS[goal.status]}
                </Badge>
              )}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="-mt-1 -mr-2 size-8 text-muted-foreground"
                  aria-label={`Ações da meta ${goal.name}`}
                >
                  <MoreVertical />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => setEditOpen(true)}>
                  <Pencil /> Editar
                </DropdownMenuItem>
                {goal.status !== "completed" && (
                  <DropdownMenuItem
                    onSelect={handleArchiveToggle}
                    disabled={isPending}
                  >
                    {isArchived ? (
                      <>
                        <ArchiveRestore /> Reativar
                      </>
                    ) : (
                      <>
                        <Archive /> Arquivar
                      </>
                    )}
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onSelect={() => setDeleteOpen(true)}
                >
                  <Trash2 /> Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <p className="text-sm">
            <span className="font-medium">
              {formatCents(goal.current_amount_cents)}
            </span>
            <span className="text-muted-foreground">
              {" "}
              de {formatCents(goal.target_amount_cents)}
            </span>
          </p>

          {goal.target_date && goal.status === "active" && (
            <p className="text-xs text-muted-foreground">
              Alvo em {formatDateBR(goal.target_date)}
              {projection.requiredMonthlyCents !== null &&
                projection.requiredMonthlyCents > 0 &&
                ` · aporte de ${formatCents(projection.requiredMonthlyCents)}/mês para chegar lá`}
            </p>
          )}

          {isActive && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setContributeOpen(true)}
            >
              <PiggyBank /> Aportar
            </Button>
          )}
        </div>
      </CardContent>

      <GoalFormDialog goal={goal} open={editOpen} onOpenChange={setEditOpen} />
      <ContributeDialog
        goal={goal}
        open={contributeOpen}
        onOpenChange={setContributeOpen}
      />
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Excluir meta"
        description={`A meta "${goal.name}" será excluída de forma permanente.`}
        confirmLabel="Excluir"
        destructive
        isPending={isPending}
        onConfirm={handleDelete}
      />
    </Card>
  );
}
