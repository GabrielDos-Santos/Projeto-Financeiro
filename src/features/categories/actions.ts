"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { categoryFormSchema, categoryIdSchema } from "./schemas";

const UNIQUE_VIOLATION = "23505";
const FK_RESTRICT_VIOLATION = "23503";

const NAME_TAKEN = "Você já tem uma categoria com esse nome nesse tipo.";

export async function createCategory(
  input: unknown,
): Promise<ActionResult<null>> {
  const parsed = categoryFormSchema.safeParse(input);
  if (!parsed.success) {
    return fail(
      "Dados inválidos. Revise os campos.",
      z.flattenError(parsed.error).fieldErrors,
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("Sessão expirada. Entre novamente.");

  const { error } = await supabase.from("categories").insert({
    user_id: user.id,
    name: parsed.data.name,
    type: parsed.data.type,
    color: parsed.data.color,
    icon: parsed.data.icon,
  });

  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      return fail(NAME_TAKEN, { name: [NAME_TAKEN] });
    }
    return fail("Não foi possível criar a categoria. Tente novamente.");
  }

  revalidatePath("/categorias");
  return ok(null);
}

export async function updateCategory(
  id: unknown,
  input: unknown,
): Promise<ActionResult<null>> {
  const parsedId = categoryIdSchema.safeParse(id);
  if (!parsedId.success) return fail("Categoria inválida.");

  const parsed = categoryFormSchema.safeParse(input);
  if (!parsed.success) {
    return fail(
      "Dados inválidos. Revise os campos.",
      z.flattenError(parsed.error).fieldErrors,
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("Sessão expirada. Entre novamente.");

  // O tipo (receita/despesa) não muda na edição: lançamentos e orçamentos
  // existentes assumem o tipo original da categoria.
  const { error, count } = await supabase
    .from("categories")
    .update(
      {
        name: parsed.data.name,
        color: parsed.data.color,
        icon: parsed.data.icon,
      },
      { count: "exact" },
    )
    .eq("id", parsedId.data);

  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      return fail(NAME_TAKEN, { name: [NAME_TAKEN] });
    }
    return fail("Não foi possível salvar a categoria. Tente novamente.");
  }
  if (count === 0) return fail("Categoria não encontrada.");

  revalidatePath("/categorias");
  return ok(null);
}

export async function setCategoryArchived(
  id: unknown,
  isArchived: boolean,
): Promise<ActionResult<null>> {
  const parsedId = categoryIdSchema.safeParse(id);
  if (!parsedId.success) return fail("Categoria inválida.");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("Sessão expirada. Entre novamente.");

  const { error, count } = await supabase
    .from("categories")
    .update({ is_archived: isArchived }, { count: "exact" })
    .eq("id", parsedId.data);

  if (error) return fail("Não foi possível atualizar a categoria.");
  if (count === 0) return fail("Categoria não encontrada.");

  revalidatePath("/categorias");
  return ok(null);
}

export async function deleteCategory(id: unknown): Promise<ActionResult<null>> {
  const parsedId = categoryIdSchema.safeParse(id);
  if (!parsedId.success) return fail("Categoria inválida.");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("Sessão expirada. Entre novamente.");

  const { error, count } = await supabase
    .from("categories")
    .delete({ count: "exact" })
    .eq("id", parsedId.data);

  if (error) {
    // FK RESTRICT em transactions/recurring; budgets caem por cascade.
    if (error.code === FK_RESTRICT_VIOLATION) {
      return fail(
        "Esta categoria está em uso por lançamentos e não pode ser excluída. Arquive-a.",
      );
    }
    return fail("Não foi possível excluir a categoria. Tente novamente.");
  }
  if (count === 0) return fail("Categoria não encontrada.");

  revalidatePath("/categorias");
  return ok(null);
}
