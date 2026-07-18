import type { Metadata } from "next";
import { Plus, Target } from "lucide-react";

import { getGoals } from "@/features/goals/queries";
import { GoalFormDialog } from "@/features/goals/components/goal-form-dialog";
import { GoalsList } from "@/features/goals/components/goals-list";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Metas" };

export default async function MetasPage() {
  const goals = await getGoals();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Metas"
        description="Junte dinheiro para um objetivo, aos poucos."
      >
        <GoalFormDialog>
          <Button>
            <Plus /> Nova meta
          </Button>
        </GoalFormDialog>
      </PageHeader>

      {goals.length === 0 ? (
        <EmptyState
          icon={Target}
          title="Nenhuma meta ainda"
          description="Crie uma meta com um valor alvo — e, se quiser, uma data — e vá aportando até chegar lá."
        >
          <GoalFormDialog>
            <Button>
              <Plus /> Criar primeira meta
            </Button>
          </GoalFormDialog>
        </EmptyState>
      ) : (
        <GoalsList goals={goals} />
      )}
    </div>
  );
}
