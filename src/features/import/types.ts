import type { Tables } from "@/types/database";

export type ImportBatch = Tables<"import_batches">;

/** Linha pronta para revisão na etapa 4 do wizard. */
export type ReviewRow = {
  key: string; // rowIndex-based, estável para React
  dateISO: string;
  description: string;
  amountCents: number;
  type: "income" | "expense"; // sempre "expense" no contexto cartão
  categoryId: string;
  status: "paid" | "pending";
  affectsBalance: boolean;
  isDuplicate: boolean;
  include: boolean;
};

/** Payload enviado à Server Action de confirmação. */
export type ImportRowPayload = {
  date: string;
  description: string;
  amountCents: number;
  type: "income" | "expense";
  categoryId: string;
  status: "paid" | "pending";
  affectsBalance: boolean;
};
