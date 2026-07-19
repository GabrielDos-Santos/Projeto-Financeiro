import type { Tables } from "@/types/database";

export type Household = Tables<"households">;
export type HouseholdRole = Tables<"household_members">["role"];

/** Membro ativo com o nome vindo de profiles (RLS: mesma casa se enxerga). */
export type HouseholdMemberRow = {
  id: string;
  user_id: string;
  role: HouseholdRole;
  joined_at: string;
  full_name: string;
};

export type PendingInvite = {
  id: string;
  email: string;
  created_at: string;
  expires_at: string;
};

export type SharedAccountRow = {
  id: string;
  account_id: string;
  account_name: string;
  owner_name: string;
};

/** Conta de um membro que o admin pode compartilhar (ainda não compartilhada). */
export type ShareableAccount = {
  id: string;
  name: string;
  owner_name: string;
};

export type HouseholdData = {
  household: Pick<Household, "id" | "name" | "created_at">;
  myRole: HouseholdRole;
  members: HouseholdMemberRow[];
  pendingInvites: PendingInvite[];
  sharedAccounts: SharedAccountRow[];
  shareableAccounts: ShareableAccount[];
};

export type HouseholdSummary = {
  income_paid_cents: number;
  income_pending_cents: number;
  expense_paid_cents: number;
  expense_pending_cents: number;
};

export type HouseholdCategorySlice = {
  category_name: string;
  category_color: string | null;
  amount_cents: number;
};

export type HouseholdSeriesPoint = {
  month: string;
  income_paid_cents: number;
  expense_paid_cents: number;
};

export const ROLE_LABELS: Record<HouseholdRole, string> = {
  admin: "Administrador",
  member: "Membro",
};
