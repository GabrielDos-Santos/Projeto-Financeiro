import type { Metadata } from "next";

import { getProjectionInputs } from "@/features/projection/queries";
import { ProjectionView } from "@/features/projection/components/projection-view";
import { PROJECTION_HORIZONS } from "@/features/projection/types";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = { title: "Projeção" };

/** Maior horizonte oferecido — busca uma vez e o client recorta o resto. */
const MAX_HORIZON = Math.max(...PROJECTION_HORIZONS);

export default async function ProjecaoPage() {
  const inputs = await getProjectionInputs(MAX_HORIZON);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Projeção"
        description="Como suas contas ficam nos próximos meses — e o que muda se você fizer aquela compra."
      />
      <ProjectionView inputs={inputs} />
    </div>
  );
}
