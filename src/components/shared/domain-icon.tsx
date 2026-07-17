import {
  Baby,
  Banknote,
  Bitcoin,
  BookOpen,
  Briefcase,
  Bus,
  Car,
  Circle,
  CirclePlus,
  Coins,
  CreditCard,
  Dog,
  Dumbbell,
  Ellipsis,
  Film,
  Fuel,
  Gamepad2,
  Gift,
  GraduationCap,
  HandCoins,
  HeartPulse,
  Home,
  Landmark,
  Laptop,
  Music,
  Phone,
  PiggyBank,
  Pill,
  Plane,
  Receipt,
  Repeat,
  Shirt,
  ShoppingBag,
  ShoppingCart,
  Smartphone,
  Sparkles,
  TrendingUp,
  Umbrella,
  Utensils,
  Wallet,
  Wifi,
  Wrench,
  type LucideIcon,
} from "lucide-react";

/**
 * Ícones armazenados no banco pelo nome kebab-case do Lucide (colunas `icon`).
 * Registro fechado: só o que está aqui pode ser escolhido/renderizado —
 * inclui os 14 usados por `create_default_categories()` (migration 0006).
 */
export const DOMAIN_ICONS = {
  utensils: Utensils,
  "shopping-cart": ShoppingCart,
  car: Car,
  home: Home,
  "heart-pulse": HeartPulse,
  "graduation-cap": GraduationCap,
  "gamepad-2": Gamepad2,
  repeat: Repeat,
  "shopping-bag": ShoppingBag,
  ellipsis: Ellipsis,
  banknote: Banknote,
  laptop: Laptop,
  "trending-up": TrendingUp,
  "circle-plus": CirclePlus,
  wallet: Wallet,
  landmark: Landmark,
  "piggy-bank": PiggyBank,
  coins: Coins,
  smartphone: Smartphone,
  bitcoin: Bitcoin,
  "credit-card": CreditCard,
  "hand-coins": HandCoins,
  receipt: Receipt,
  briefcase: Briefcase,
  plane: Plane,
  gift: Gift,
  dumbbell: Dumbbell,
  baby: Baby,
  dog: Dog,
  wrench: Wrench,
  shirt: Shirt,
  film: Film,
  music: Music,
  "book-open": BookOpen,
  fuel: Fuel,
  bus: Bus,
  pill: Pill,
  wifi: Wifi,
  phone: Phone,
  umbrella: Umbrella,
  sparkles: Sparkles,
} satisfies Record<string, LucideIcon>;

export type DomainIconName = keyof typeof DOMAIN_ICONS;

export const DOMAIN_ICON_NAMES = Object.keys(DOMAIN_ICONS) as DomainIconName[];

export function isDomainIconName(name: string): name is DomainIconName {
  return name in DOMAIN_ICONS;
}

type DomainIconProps = {
  /** Nome kebab-case vindo do banco; desconhecido/null cai no fallback. */
  name: string | null;
  className?: string;
};

/** Renderiza o ícone do domínio (conta/categoria) com fallback seguro. */
export function DomainIcon({ name, className }: DomainIconProps) {
  const Icon = name && isDomainIconName(name) ? DOMAIN_ICONS[name] : Circle;
  return <Icon className={className} aria-hidden />;
}
