/**
 * Nome do dono de um registro, só quando NÃO é o usuário logado (Fase 16 —
 * RLS estendida passa a trazer dado de outros membros: admin vendo tudo, ou
 * conta compartilhada). `memberNames` vem `null` fora de uma casa — a
 * maioria dos usuários — e nada muda na UI pra eles.
 */
export function ownerName(
  userId: string | null | undefined,
  myUserId: string,
  memberNames: Record<string, string> | null,
): string | null {
  if (!memberNames || !userId || userId === myUserId) return null;
  return memberNames[userId] ?? null;
}
