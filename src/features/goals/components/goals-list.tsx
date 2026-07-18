import { GoalCard } from "./goal-card";
import type { Goal } from "../types";

export function GoalsList({ goals }: { goals: Goal[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {goals.map((goal) => (
        <GoalCard key={goal.id} goal={goal} />
      ))}
    </div>
  );
}
