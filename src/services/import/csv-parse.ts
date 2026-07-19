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

/**
 * Corrige "mojibake" de UTF-8 já salvo como Latin-1 no arquivo de origem —
 * não é um erro do decoder acima (esse arquivo decodifica limpo como UTF-8,
 * sem `�`), é o PRÓPRIO CSV que já chega com "ção" gravado como "Ã§Ã£o"
 * (visto num extrato do Nubank). Cada char do trecho corrompido é sempre um
 * byte Latin-1 (≤ 0xFF) que, decodificado de novo como UTF-8, volta ao
 * caractere original. Se algum char do arquivo passar de 0xFF (Unicode real,
 * não Latin-1) ou a redecodificação falhar, devolve o texto original —
 * mais seguro não tocar do que estragar um arquivo que já estava certo.
 */
function fixDoubleEncodedUtf8(text: string): string {
  if (!/[ÃÂ]./.test(text)) return text;
  if ([...text].some((ch) => ch.charCodeAt(0) > 0xff)) return text;
  try {
    const bytes = Uint8Array.from(text, (ch) => ch.charCodeAt(0));
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return text;
  }
}

export async function parseCsvFile(file: File): Promise<CsvParseResult> {
  if (file.size > MAX_BYTES) {
    throw new CsvParseError("Arquivo maior que 1 MB.");
  }

  let text = await readAsText(file, "utf-8");
  if (text.includes("�")) {
    text = await readAsText(file, "latin1");
  }
  text = fixDoubleEncodedUtf8(text);

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
