"use client";

import { useRouter } from "next/navigation";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MonthNav } from "@/components/shared/month-nav";
import { YearNav } from "@/components/shared/year-nav";
import { ExportMenu } from "./export-menu";

type ReportFiltersProps = {
  scope: "monthly" | "annual";
  month: string;
  year: number;
};

/** Tabs Mensal/Anual + navegação de período — tudo via query string (RSC re-renderiza). */
export function ReportFilters({ scope, month, year }: ReportFiltersProps) {
  const router = useRouter();

  function goTo(
    nextScope: "monthly" | "annual",
    nextMonth = month,
    nextYear = year,
  ) {
    const params = new URLSearchParams({
      scope: nextScope,
      ...(nextScope === "monthly"
        ? { month: nextMonth }
        : { year: String(nextYear) }),
    });
    router.push(`/relatorios?${params.toString()}`);
  }

  const exportParams: Record<string, string> =
    scope === "monthly" ? { scope, month } : { scope, year: String(year) };

  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Tabs
          value={scope}
          onValueChange={(v) => goTo(v as "monthly" | "annual")}
        >
          <TabsList>
            <TabsTrigger value="monthly">Mensal</TabsTrigger>
            <TabsTrigger value="annual">Anual</TabsTrigger>
          </TabsList>
        </Tabs>
        {scope === "monthly" ? (
          <MonthNav month={month} onMonthChange={(m) => goTo("monthly", m)} />
        ) : (
          <YearNav year={year} onYearChange={(y) => goTo("annual", month, y)} />
        )}
      </div>
      <ExportMenu params={exportParams} />
    </div>
  );
}
