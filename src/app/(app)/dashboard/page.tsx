import type { Metadata } from "next";
import { LayoutDashboard } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Dashboard"
        description="Visão geral das suas finanças."
      />
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-secondary text-muted-foreground">
            <LayoutDashboard className="size-6" aria-hidden />
          </div>
          <div className="space-y-1">
            <h2 className="font-semibold">Em construção</h2>
            <p className="mx-auto max-w-sm text-sm text-balance text-muted-foreground">
              Os widgets do dashboard (saldo consolidado, fluxo do mês e
              gráficos) chegam na Fase 8. Sua conta e o shell do app já estão
              prontos.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
