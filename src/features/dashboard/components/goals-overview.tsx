import Link from "next/link";
import { ChevronRight, Target } from "lucide-react";

import { getGoals } from "@/features/goals/queries";
import { goalProgressPct } from "@/features/goals/types";
import { formatCents } from "@/lib/money";
import { GoalProgressRadial } from "@/components/charts/goal-progress-radial";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DomainIcon } from "@/components/shared/domain-icon";

export async function GoalsOverview() {
  const goals = (await getGoals()).filter((g) => g.status === "active");

  if (goals.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Metas</CardTitle>
        <CardDescription>Em andamento.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {goals.slice(0, 3).map((goal) => {
          const color = goal.color ?? "#14b8a6";
          const pct = goalProgressPct(goal);
          return (
            <div key={goal.id} className="flex items-center gap-3">
              <GoalProgressRadial pct={pct} color={color} size={56} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <div
                    className="flex size-5 shrink-0 items-center justify-center rounded-full"
                    style={{ backgroundColor: `${color}1f`, color }}
                  >
                    <DomainIcon name={goal.icon} className="size-3" />
                  </div>
                  <span className="truncate text-sm font-medium">
                    {goal.name}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatCents(goal.current_amount_cents)} de{" "}
                  {formatCents(goal.target_amount_cents)}
                </p>
              </div>
            </div>
          );
        })}
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="w-full text-muted-foreground"
        >
          <Link href="/metas">
            <Target /> Ver metas <ChevronRight />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
