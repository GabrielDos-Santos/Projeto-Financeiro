import Papa from "papaparse";

/**
 * Parse de CSV no CLIENT (o arquivo nunca sobe como blob — só as linhas já
 * mapeadas/validadas vão na Server Action). Sem `header: true`: exportações
 * de banco variam demais (cabeçalho ausente, duplicado, em branco) — o
 * usuário mapeia colunas por índice na etapa seguinte, mais robusto.
 *
 * Encoding: tenta UTF-8; se aparecer o caractere de substituição (U+FFFD,
 * sinal de bytes inválidos em UTF-8), refaz como latin1 — cobre a maioria
 * dos bancos BR que exportam em Windows-1252/ISO-8859-1.
 */
export type CsvParseResult = {
  rows: string[][];
  /** Linha 0, só como candidata a cabeçalho — não é tratada como especial. */
  firstRow: string[];
};

const MAX_ROWS = 500;
const MAX_BYTES = 1_048_576; // 1 MB

export class CsvParseError extends Error {}

async function readAsText(file: File, encoding: "utf-8" | "latin1") {
  const buffer = await file.arrayBuffer();
  return new TextDecoder(encoding).decode(buffer);
}

export async function parseCsvFile(file: File): Promise<CsvParseResult> {
  if (file.size > MAX_BYTES) {
    throw new CsvParseError("Arquivo maior que 1 MB.");
  }

  let text = await readAsText(file, "utf-8");
  if (text.includes("�")) {
    text = await readAsText(file, "latin1");
  }

  const parsed = Papa.parse<string[]>(text, {
    skipEmptyLines: true,
    delimiter: "", // auto-detect (vírgula, ponto e vírgula — comum em CSV BR)
  });

  if (parsed.errors.length > 0 && parsed.data.length === 0) {
    throw new CsvParseError("Não foi possível ler o arquivo como CSV.");
  }

  const rows = parsed.data.filter((row) => row.some((cell) => cell.trim()));
  if (rows.length === 0) {
    throw new CsvParseError("O arquivo está vazio.");
  }
  if (rows.length > MAX_ROWS) {
    throw new CsvParseError(
      `Máximo de ${MAX_ROWS} linhas por importação — este arquivo tem ${rows.length}.`,
    );
  }

  return { rows, firstRow: rows[0]! };
}
