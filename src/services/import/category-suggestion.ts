/**
 * Sugestão de categoria por palavra-chave contra o HISTÓRICO DO PRÓPRIO
 * USUÁRIO (decisão 59) — heurística simples, sem categoria-sistema oculta:
 * se a descrição importada compartilha uma palavra significativa com
 * lançamentos passados, sugere a categoria mais provável entre eles.
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
  // dominante do índice e a sugestão sai sempre a mesma categoria genérica.
  "parcela",
  "parc",
  // Boilerplate de extrato bancário (Nubank e afins): toda linha de Pix é
  // "Transferência enviada pelo Pix - FULANO - CPF - BANCO (n) Agência: x
  // Conta: y" — essas palavras aparecem em TODAS as linhas e, deixadas no
  // índice, elegem sempre a categoria mais frequente do histórico (bug real:
  // posto de gasolina e Receita Federal sugeridos como "Alimentação").
  "transferencia",
  "enviada",
  "enviado",
  "recebida",
  "recebido",
  "pelo",
  "pela",
  "pix",
  "pagamento",
  "pagamentos",
  "boleto",
  "boletos",
  "efetuado",
  "efetuada",
  "fatura",
  "faturas",
  "valor",
  "adicionado",
  "adicionada",
  "cartao",
  "cartoes",
  "credito",
  "debito",
  "agencia",
  "conta",
  "banco",
  "bancos",
  "cooperativa",
  "instituicao",
  // Nomes de banco comuns no SUFIXO das linhas de Pix (o banco do
  // recebedor, irrelevante para a categoria do gasto).
  "itau",
  "unibanco",
  "bradesco",
  "santander",
  "sicredi",
  "nubank",
  "caixa",
  "economica",
  "federal",
  "inter",
  "brasil",
]);

function normalize(text: string): string {
  return (
    text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      // Sufixo de parcelamento ("- Parcela 3/10", "parcela 3 de 10") some
      // antes de tokenizar — não é sobre o estabelecimento, é sobre a fatura.
      .replace(/parcelas?\s*\d+\s*(\/|de)\s*\d+/g, " ")
      .replace(/[^a-z0-9\s]/g, " ")
      .trim()
  );
}

function significantWords(description: string): string[] {
  return normalize(description)
    .split(/\s+/)
    .filter(
      (word) =>
        word.length >= 4 &&
        !STOP_WORDS.has(word) &&
        // Token só de dígitos é fragmento de CNPJ/agência/conta ("0001",
        // "0341", "81010") — ruído presente em quase toda linha de extrato.
        !/^\d+$/.test(word),
    );
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
      byCategory.set(
        entry.categoryId,
        (byCategory.get(entry.categoryId) ?? 0) + 1,
      );
    }
  }
  return index;
}

/**
 * Categoria mais provável entre as palavras da descrição, ou null sem match.
 * O voto de cada palavra é PONDERADO pela concentração dela numa categoria
 * (count/total): "ifood" que só aparece em Alimentação vale 1,0; uma palavra
 * espalhada por 5 categorias vale no máximo ~0,3 — palavras comuns que
 * escaparem da stoplist se autodiluem em vez de eleger a categoria mais
 * frequente do histórico.
 */
export function suggestCategory(
  description: string,
  index: CategorySuggestionIndex,
): string | null {
  const votes = new Map<string, number>();
  for (const word of significantWords(description)) {
    const byCategory = index.get(word);
    if (!byCategory) continue;
    let total = 0;
    for (const count of byCategory.values()) total += count;
    if (total === 0) continue;
    for (const [categoryId, count] of byCategory) {
      votes.set(categoryId, (votes.get(categoryId) ?? 0) + count / total);
    }
  }
  if (votes.size === 0) return null;
  return [...votes.entries()].sort((a, b) => b[1] - a[1])[0]![0];
}
