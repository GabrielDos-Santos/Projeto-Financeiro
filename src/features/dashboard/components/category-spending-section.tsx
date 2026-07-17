import { getCategorySpending } from "../queries";
import { CategoryDonutChart } from "@/components/charts/category-donut-chart";
import { formatCents } from "@/lib/money";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export async function CategorySpendingSection() {
  const slices = await getCategorySpending();
  const total = slices.reduce((sum, s) => sum + s.amountCents, 0);
  const top = slices.slice(0, 6);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Gastos por categoria</CardTitle>
        <CardDescription>Mês atual, por competência.</CardDescription>
      </CardHeader>
      <CardContent>
        {slices.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">
            Nenhuma despesa neste mês.
          </p>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <CategoryDonutChart data={slices} />
            <ul className="w-full space-y-1.5">
              {top.map((slice) => {
                const pct =
                  total > 0 ? Math.round((slice.amountCents / total) * 100) : 0;
                return (
                  <li
                    key={slice.categoryId}
                    className="flex items-center gap-2 text-sm"
                  >
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: slice.color }}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1 truncate">
                      {slice.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {pct}%
                    </span>
                    <span className="tabular-nums">
                      {formatCents(slice.amountCents)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
