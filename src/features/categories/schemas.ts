import { z } from "zod";

import { Constants } from "@/types/database";

export const categoryFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Informe o nome da categoria")
    .max(60, "Máximo de 60 caracteres"),
  type: z.enum(Constants.public.Enums.category_type, "Tipo inválido"),
  color: z.string().regex(/^#[0-9a-f]{6}$/i, "Cor inválida"),
  icon: z.string().trim().min(1, "Escolha um ícone").max(50, "Ícone inválido"),
});

export type CategoryFormInput = z.infer<typeof categoryFormSchema>;

export const categoryIdSchema = z.uuid("Categoria inválida");
