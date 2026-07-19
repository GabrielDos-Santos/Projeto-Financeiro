/**
 * Sugestão de categoria por palavra-chave contra o HISTÓRICO DO PRÓPRIO
 * USUÁRIO (decisão 59) — heurística simples, sem categoria-sistema oculta:
 * se a descrição importada compartilha uma palavra significativa com
 * lançamentos passados, sugere a categoria mais frequente entre eles.
 */

const STOP_WORDS = new Set([
  "de",
  "da",
  "do",
  "das",
  "dos",
  "em",
  "para",
  "com",
  "ltda",
  "sa",
  "me",
  "eireli",
  // "parcela"/"parc" aparecem em QUASE toda compra parcelada de fatura de
  // cartão (ex.: "Loja X - Parcela 3/10") — sem isso, a palavra vira o voto
  // dominante do índice (a maioria do histórico categorizado tende a ter
  // *algo* parcelado) e a sugestão vira sempre a mesma categoria genérica,
  // ignorando o nome real do estabelecimento (bug reportado pelo usuário).
  "parcela",
  "parc",
]);

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    // Sufixo de parcelamento ("- Parcela 3/10", "parcela 3 de 10") some
    // antes de tokenizar — não é sobre o estabelecimento, é sobre a fatura.
    .replace(/parcelas?\s*\d+\s*(\/|de)\s*\d+/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .trim();
}

function significantWords(description: string): string[] {
  return normalize(description)
    .split(/\s+/)
    .filter((word) => word.length >= 4 && !STOP_WORDS.has(word));
}

export type CategoryHistoryEntry = {
  description: string;
  categoryId: string;
};

/** Índice palavra → {categoryId → contagem}, construído uma vez por sessão de import. */
export type CategorySuggestionIndex = Map<string, Map<string, number>>;

export function buildCategorySuggestionIndex(
  history: CategoryHistoryEntry[],
): CategorySuggestionIndex {
  const index: CategorySuggestionIndex = new Map();
  for (const entry of history) {
    for (const word of significantWords(entry.description)) {
      let byCategory = index.get(word);
      if (!byCategory) {
        byCategory = new Map();
        index.set(word, byCategory);
      }
      byCategory.set(entry.categoryId, (byCategory.get(entry.categoryId) ?? 0) + 1);
    }
  }
  return index;
}

/** Categoria mais votada entre as palavras da descrição, ou null sem match. */
export function suggestCategory(
  description: string,
  index: CategorySuggestionIndex,
): string | null {
  const votes = new Map<string, number>();
  for (const word of significantWords(description)) {
    const byCategory = index.get(word);
    if (!byCategory) continue;
    for (const [categoryId, count] of byCategory) {
      votes.set(categoryId, (votes.get(categoryId) ?? 0) + count);
    }
  }
  if (votes.size === 0) return null;
  return [...votes.entries()].sort((a, b) => b[1] - a[1])[0]![0];
}
