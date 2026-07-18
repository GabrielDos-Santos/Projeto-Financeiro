/**
 * Hash de dedup do import (decisão 60): sha-256 de
 * `contexto|data|valor|descrição normalizada`. Web Crypto (`crypto.subtle`)
 * — isomórfico: funciona tanto na Server Action (Node 20+) quanto no
 * browser, sem depender de `node:crypto`.
 *
 * NÃO é unique no banco: duplicata legítima existe (duas tarifas iguais no
 * mesmo dia) — o hash só sinaliza "provável duplicata" na revisão.
 */
export async function computeImportHash(
  contextId: string,
  dateISO: string,
  amountCents: number,
  description: string,
): Promise<string> {
  const normalizedDescription = description
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // remove acentos
    .replace(/\s+/g, " ");

  const raw = `${contextId}|${dateISO}|${amountCents}|${normalizedDescription}`;
  const bytes = new TextEncoder().encode(raw);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
