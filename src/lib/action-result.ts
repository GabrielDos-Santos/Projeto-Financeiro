/**
 * Contrato padrão de retorno de toda Server Action (ARQUITETURA.md §2).
 * Erros nunca vazam stack ou SQL — apenas mensagens seguras para o usuário.
 */
export type ActionResult<T = null> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export function ok<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}

export function fail<T = null>(
  error: string,
  fieldErrors?: Record<string, string[]>,
): ActionResult<T> {
  return { ok: false, error, fieldErrors };
}
