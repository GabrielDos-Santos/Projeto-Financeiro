import {
  ArrowLeftRight,
  BarChart3,
  CreditCard,
  HandCoins,
  LayoutDashboard,
  PiggyBank,
  Repeat,
  Settings,
  Tags,
  Target,
  TrendingUp,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

/** Navegação principal — espelha as rotas do grupo (app) (ARQUITETURA.md §7). */
export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/projecao", label: "Projeção", icon: TrendingUp },
  { href: "/transacoes", label: "Transações", icon: ArrowLeftRight },
  { href: "/contas", label: "Contas", icon: Wallet },
  { href: "/categorias", label: "Categorias", icon: Tags },
  { href: "/cartoes", label: "Cartões", icon: CreditCard },
  { href: "/emprestimos", label: "Empréstimos", icon: HandCoins },
  { href: "/recorrentes", label: "Recorrentes", icon: Repeat },
  { href: "/orcamentos", label: "Orçamentos", icon: PiggyBank },
  { href: "/metas", label: "Metas", icon: Target },
  { href: "/relatorios", label: "Relatórios", icon: BarChart3 },
  { href: "/familia", label: "Família", icon: Users },
];

export const SETTINGS_ITEM: NavItem = {
  href: "/configuracoes",
  label: "Configurações",
  icon: Settings,
};

/** Busca por `href` — índice numérico quebrava calado ao inserir item novo. */
function navItem(href: string): NavItem {
  const item = NAV_ITEMS.find((candidate) => candidate.href === href);
  if (!item) throw new Error(`Item de navegação inexistente: ${href}`);
  return item;
}

/** Itens fixos da bottom bar no mobile (4 + o botão "Mais" = 5 colunas). */
export const MOBILE_NAV_ITEMS: NavItem[] = [
  navItem("/dashboard"),
  navItem("/transacoes"),
  navItem("/contas"),
  navItem("/cartoes"),
];

/** Rotas fora da bottom bar — aparecem no menu "Mais" do mobile (Fase 16). */
export const MOBILE_OVERFLOW_ITEMS: NavItem[] = [
  ...NAV_ITEMS.filter(
    (item) => !MOBILE_NAV_ITEMS.some((fixed) => fixed.href === item.href),
  ),
  SETTINGS_ITEM,
];

export function isNavItemActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function currentSectionLabel(pathname: string): string {
  const all = [...NAV_ITEMS, SETTINGS_ITEM];
  return all.find((item) => isNavItemActive(pathname, item.href))?.label ?? "";
}
