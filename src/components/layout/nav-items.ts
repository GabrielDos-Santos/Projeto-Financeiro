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
];

export const SETTINGS_ITEM: NavItem = {
  href: "/configuracoes",
  label: "Configurações",
  icon: Settings,
};

/** Itens da bottom bar no mobile (máx. 5). */
export const MOBILE_NAV_ITEMS: NavItem[] = [
  NAV_ITEMS[0]!, // Dashboard
  NAV_ITEMS[1]!, // Transações
  NAV_ITEMS[2]!, // Contas
  NAV_ITEMS[4]!, // Cartões
  NAV_ITEMS[8]!, // Relatórios
];

export function isNavItemActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function currentSectionLabel(pathname: string): string {
  const all = [...NAV_ITEMS, SETTINGS_ITEM];
  return all.find((item) => isNavItemActive(pathname, item.href))?.label ?? "";
}
