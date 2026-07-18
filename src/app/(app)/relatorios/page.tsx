import type { Metadata } from "next";

import { getAnnualReport, getMonthlyReport } from "@/features/reports/queries";
import { AnnualReport } from "@/features/reports/components/annual-report";
import { MonthlyReport } from "@/features/reports/components/monthly-report";
import { ReportFilters } from "@/features/reports/components/report-filters";
import { todayISO } from "@/lib/dates";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = { title: "Relatórios" };

function currentMonthISO() {
  return `${todayISO().slice(0, 7)}-01`;
}

export default async function RelatoriosPage({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string; month?: string; year?: string }>;
}) {
  const params = await searchParams;
  const scope = params.scope === "annual" ? "annual" : "monthly";
  const month =
    params.month && /^\d{4}-\d{2}-01$/.test(params.month)
      ? params.month
      : currentMonthISO();
  const year = params.year
    ? Number.parseInt(params.year, 10)
    : Number.parseInt(currentMonthISO().slice(0, 4), 10);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Relatórios"
        description="Mensal e anual — exporte em CSV, Excel ou PDF."
      />
      <ReportFilters scope={scope} month={month} year={year} />
      {scope === "monthly" ? (
        <MonthlyReport data={await getMonthlyReport(month)} />
      ) : (
        <AnnualReport data={await getAnnualReport(year)} />
      )}
    </div>
  );
}
