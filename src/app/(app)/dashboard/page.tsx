import type { Metadata } from "next";
import { Suspense } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { SummaryCards } from "@/features/dashboard/components/summary-cards";
import { MonthlyChartSection } from "@/features/dashboard/components/monthly-chart-section";
import { CategorySpendingSection } from "@/features/dashboard/components/category-spending-section";
import { RecentTransactions } from "@/features/dashboard/components/recent-transactions";
import { CardsOverview } from "@/features/dashboard/components/cards-overview";
import {
  PanelSkeleton,
  SummaryCardsSkeleton,
} from "@/features/dashboard/components/dashboard-skeletons";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Dashboard"
        description="Visão geral das suas finanças."
      />

      <Suspense fallback={<SummaryCardsSkeleton />}>
        <SummaryCards />
      </Suspense>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Suspense fallback={<PanelSkeleton />}>
            <MonthlyChartSection />
          </Suspense>
        </div>
        <Suspense fallback={<PanelSkeleton height={220} />}>
          <CategorySpendingSection />
        </Suspense>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Suspense fallback={<PanelSkeleton height={320} />}>
            <RecentTransactions />
          </Suspense>
        </div>
        <Suspense fallback={<PanelSkeleton height={220} />}>
          <CardsOverview />
        </Suspense>
      </div>
    </div>
  );
}
