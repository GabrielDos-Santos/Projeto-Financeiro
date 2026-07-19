import {
  ArrowLeftRight,
  BarChart3,
  CreditCard,
  LayoutDashboard,
  PiggyBank,
  Repeat,
  Settings,
  Tags,
  Target,
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
  { href: "/transacoes", label: "Transações", icon: ArrowLeftRight },
  { href: "/contas", label: "Contas", icon: Wallet },
  { href: "/categorias", label: "Categorias", icon: Tags },
  { href: "/cartoes", label: "Cartões", icon: CreditCard },
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

/** Itens fixos da bottom bar no mobile (4 + o botão "Mais" = 5 colunas). */
export const MOBILE_NAV_ITEMS: NavItem[] = [
  NAV_ITEMS[0]!, // Dashboard
  NAV_ITEMS[1]!, // Transações
  NAV_ITEMS[2]!, // Contas
  NAV_ITEMS[4]!, // Cartões
];

/** Rotas fora da bottom bar — aparecem no menu "Mais" do mobile (Fase 16). */
export const MOBILE_OVERFLOW_ITEMS: NavItem[] = [
  NAV_ITEMS[3]!, // Categorias
  NAV_ITEMS[5]!, // Recorrentes
  NAV_ITEMS[6]!, // Orçamentos
  NAV_ITEMS[7]!, // Metas
  NAV_ITEMS[8]!, // Relatórios
  NAV_ITEMS[9]!, // Família
  SETTINGS_ITEM,
];

export function isNavItemActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function currentSectionLabel(pathname: string): string {
  const all = [...NAV_ITEMS, SETTINGS_ITEM];
  return all.find((item) => isNavItemActive(pathname, item.href))?.label ?? "";
}
