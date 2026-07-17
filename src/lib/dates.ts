import { format, parse } from "date-fns";
import { ptBR } from "date-fns/locale";

/**
 * Datas de competência são `date` no banco (string "YYYY-MM-DD", sem hora).
 * Toda conversão string ⇄ Date acontece aqui, sempre em horário local —
 * nunca `new Date("YYYY-MM-DD")` direto (o parse ISO usa UTC e desloca o dia).
 */

/** "2026-07-17" → Date local (meio-dia evita qualquer borda de DST). */
export function parseDateOnly(iso: string): Date {
  return parse(iso, "yyyy-MM-dd", new Date());
}

/** Date → "2026-07-17" (componente local, sem timezone). */
export function toDateOnly(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

/** Hoje como "YYYY-MM-DD" local. */
export function todayISO(): string {
  return toDateOnly(new Date());
}

/** "2026-07-17" → "17/07/2026". */
export function formatDateBR(iso: string): string {
  return format(parseDateOnly(iso), "dd/MM/yyyy", { locale: ptBR });
}

/** "2026-07-17" → "17 de julho de 2026" (para cabeçalhos/pickers). */
export function formatDateLongBR(iso: string): string {
  return format(parseDateOnly(iso), "d 'de' MMMM 'de' yyyy", { locale: ptBR });
}
