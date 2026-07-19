import type { Metadata } from "next";

import { createClient } from "@/lib/supabase/server";
import { getMyHousehold } from "@/features/households/queries";
import { CreateHouseholdForm } from "@/features/households/components/create-household-form";
import { HouseholdView } from "@/features/households/components/household-view";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = { title: "Família" };

export default async function FamiliaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const data = await getMyHousehold();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Família"
        description="Finanças da casa: o administrador vê tudo (somente leitura); membros veem os totais e as contas compartilhadas."
      />
      {data && user ? (
        <HouseholdView data={data} myUserId={user.id} />
      ) : (
        <CreateHouseholdForm />
      )}
    </div>
  );
}
