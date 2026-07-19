import { createClient } from "@/lib/supabase/server";
import { todayISO } from "@/lib/dates";
import { hashInviteToken } from "./token";
import { inviteTokenSchema } from "./schemas";
import type {
  HouseholdCategorySlice,
  HouseholdData,
  HouseholdSeriesPoint,
  HouseholdSummary,
} from "./types";

export type HouseholdContext = {
  myUserId: string;
  isAdmin: boolean;
  members: { id: string; name: string }[];
  /** `user_id → nome`, derivado de `members` — conveniência para os badges. */
  memberNames: Record<string, string>;
};

/**
 * Contexto da casa do usuário logado para as telas de domínio (transações,
 * contas), ou `null` se ele não está em nenhuma — o caso comum (usuário
 * solo), pra quem nada na UI muda. Usado para: identificar de quem é um
 * lançamento/conta quando a RLS estendida (Fase 16) mostra dado de outro
 * membro, e habilitar o filtro por membro (só para o admin).
 */
export async function getHouseholdContext(): Promise<HouseholdContext | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: membership } = await supabase
    .from("household_members")
    .select("household_id, role")
    .eq("user_id", user.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();
  if (!membership) return null;

  const { data: rows } = await supabase
    .from("household_members")
    .select("user_id, profiles:user_id(full_name)")
    .eq("household_id", membership.household_id)
    .eq("status", "active")
    .order("joined_at");

  const members = (rows ?? []).map((row) => ({
    id: row.user_id,
    name: row.profiles?.full_name ?? "—",
  }));
  const memberNames: Record<string, string> = {};
  for (const member of members) memberNames[member.id] = member.name;

  return {
    myUserId: user.id,
    isAdmin: membership.role === "admin",
    members,
    memberNames,
  };
}

/**
 * Casa do usuário logado (v1: no máximo uma), com membros, convites
 * pendentes (RLS: só o admin enxerga — para membro vem vazio), contas
 * compartilhadas e as contas de membros que o admin ainda pode compartilhar.
 */
export async function getMyHousehold(): Promise<HouseholdData | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: membership } = await supabase
    .from("household_members")
    .select("household_id, role")
    .eq("user_id", user.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();
  if (!membership) return null;

  const householdId = membership.household_id;

  const [householdResult, membersResult, invitesResult, sharedResult] =
    await Promise.all([
      supabase
        .from("households")
        .select("id, name, created_at")
        .eq("id", householdId)
        .maybeSingle(),
      supabase
        .from("household_members")
        .select("id, user_id, role, joined_at, profiles:user_id(full_name)")
        .eq("household_id", householdId)
        .eq("status", "active")
        .order("joined_at"),
      supabase
        .from("household_invites")
        .select("id, email, created_at, expires_at")
        .eq("household_id", householdId)
        .is("accepted_at", null)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false }),
      supabase
        .from("household_shared_accounts")
        .select(
          "id, account_id, accounts:account_id(name, profiles:user_id(full_name))",
        )
        .eq("household_id", householdId)
        .order("created_at"),
    ]);

  if (!householdResult.data) return null;

  const sharedAccounts = (sharedResult.data ?? []).map((row) => ({
    id: row.id,
    account_id: row.account_id,
    account_name: row.accounts?.name ?? "—",
    owner_name: row.accounts?.profiles?.full_name ?? "—",
  }));

  // Contas candidatas a compartilhar (admin): tudo que a RLS estendida deixa
  // o admin ver (as dele + as dos membros), menos arquivadas e já
  // compartilhadas. Para membro comum a lista fica vazia na UI (sem gestão).
  let shareableAccounts: HouseholdData["shareableAccounts"] = [];
  if (membership.role === "admin") {
    const sharedIds = new Set(sharedAccounts.map((s) => s.account_id));
    const { data: accounts } = await supabase
      .from("accounts")
      .select("id, name, profiles:user_id(full_name)")
      .eq("is_archived", false)
      .order("name");
    shareableAccounts = (accounts ?? [])
      .filter((account) => !sharedIds.has(account.id))
      .map((account) => ({
        id: account.id,
        name: account.name,
        owner_name: account.profiles?.full_name ?? "—",
      }));
  }

  return {
    household: householdResult.data,
    myRole: membership.role,
    members: (membersResult.data ?? []).map((member) => ({
      id: member.id,
      user_id: member.user_id,
      role: member.role,
      joined_at: member.joined_at,
      full_name: member.profiles?.full_name ?? "—",
    })),
    pendingInvites: invitesResult.data ?? [],
    sharedAccounts,
    shareableAccounts,
  };
}

export type InvitePreview = {
  householdName: string;
  email: string;
  expired: boolean;
  accepted: boolean;
};

/** Tela de consentimento do convite: quem tem o token (o link) lê o resumo. */
export async function getInvitePreview(
  token: string,
): Promise<InvitePreview | null> {
  const parsed = inviteTokenSchema.safeParse(token);
  if (!parsed.success) return null;

  const supabase = await createClient();
  const { data } = await supabase.rpc("get_invite_details", {
    p_token_hash: hashInviteToken(parsed.data),
  });
  const invite = data?.[0];
  if (!invite) return null;

  return {
    householdName: invite.household_name,
    email: invite.email,
    expired: new Date(invite.expires_at).getTime() < Date.now(),
    accepted: invite.accepted_at != null,
  };
}

/** Agregados do dashboard da família — funções DEFINER com guarda de membership. */
export async function getHouseholdDashboard(householdId: string): Promise<{
  summary: HouseholdSummary | null;
  breakdown: HouseholdCategorySlice[];
  series: HouseholdSeriesPoint[];
}> {
  const supabase = await createClient();
  const currentMonth = `${todayISO().slice(0, 7)}-01`;

  const [summaryResult, breakdownResult, seriesResult] = await Promise.all([
    supabase.rpc("get_household_monthly_summary", {
      p_household: householdId,
      p_month: currentMonth,
    }),
    supabase.rpc("get_household_category_breakdown", {
      p_household: householdId,
      p_month: currentMonth,
    }),
    supabase.rpc("get_household_monthly_series", {
      p_household: householdId,
      p_months: 6,
    }),
  ]);

  return {
    summary: summaryResult.data?.[0] ?? null,
    breakdown: breakdownResult.data ?? [],
    series: seriesResult.data ?? [],
  };
}

export type HouseholdRecentEntry = {
  id: string;
  description: string;
  date: string;
  amountCents: number;
  type: "income" | "expense" | "transfer";
  direction: "in" | "out" | null;
  memberName: string;
  categoryName: string | null;
  categoryColor: string | null;
  categoryIcon: string | null;
};

/**
 * Feed "Últimas movimentações" do dashboard da FAMÍLIA, com o nome do membro
 * dono de cada linha. **Só para o admin** (a página não chama para membro
 * comum, que só vê agregados — decisão 83). Lê `v_entries` direto: a RLS
 * estendida (`is_admin_over`) já expõe as linhas dos membros ao admin.
 * Limitado a `date <= hoje` (mesma razão do feed pessoal: parcelas futuras
 * não são "movimentação recente"); ordena por `created_at` (ordem de
 * inserção, como o novo padrão de /transacoes).
 */
export async function getHouseholdRecentEntries(
  memberNames: Record<string, string>,
  limit = 8,
): Promise<HouseholdRecentEntry[]> {
  const supabase = await createClient();
  const memberIds = Object.keys(memberNames);
  if (memberIds.length === 0) return [];

  const [entries, categories] = await Promise.all([
    supabase
      .from("v_entries")
      .select(
        "id, description, date, amount_cents, type, transfer_direction, category_id, user_id, created_at",
      )
      .in("user_id", memberIds)
      .neq("status", "cancelled")
      .lte("date", todayISO())
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(limit),
    supabase.from("categories").select("id, name, color, icon"),
  ]);

  const categoryById = new Map((categories.data ?? []).map((c) => [c.id, c]));

  return (entries.data ?? []).map((entry) => {
    const category = entry.category_id
      ? categoryById.get(entry.category_id)
      : undefined;
    return {
      id: entry.id ?? "",
      description: entry.description ?? "",
      date: entry.date ?? "",
      amountCents: entry.amount_cents ?? 0,
      type: entry.type ?? "expense",
      direction: entry.transfer_direction,
      memberName: memberNames[entry.user_id ?? ""] ?? "—",
      categoryName: category?.name ?? null,
      categoryColor: category?.color ?? null,
      categoryIcon: category?.icon ?? null,
    };
  });
}
