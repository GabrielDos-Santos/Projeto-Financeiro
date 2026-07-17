import type { Metadata } from "next";

import { getCategories } from "@/features/categories/queries";
import { CategoryList } from "@/features/categories/components/category-list";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = { title: "Categorias" };

export default async function CategoriasPage() {
  const categories = await getCategories();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Categorias"
        description="Organize receitas e despesas — categorias em uso não somem: arquive em vez de excluir."
      />
      <CategoryList categories={categories} />
    </div>
  );
}
