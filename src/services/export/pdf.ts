import path from "node:path";

import pdfMake from "pdfmake";
import type { TDocumentDefinitions } from "pdfmake/interfaces";

/**
 * pdfmake server-side (Node): fontes lidas do disco (pacote `pdfmake/fonts`),
 * não do bundle de vfs do browser. Roboto suporta acentuação pt-BR.
 * `pdfmake` exporta uma instância singleton (não uma classe) — configura-se
 * uma vez no módulo.
 */
const FONTS_DIR = path.join(process.cwd(), "node_modules/pdfmake/fonts/Roboto");

pdfMake.setFonts({
  Roboto: {
    normal: path.join(FONTS_DIR, "Roboto-Regular.ttf"),
    bold: path.join(FONTS_DIR, "Roboto-Medium.ttf"),
    italics: path.join(FONTS_DIR, "Roboto-Italic.ttf"),
    bolditalics: path.join(FONTS_DIR, "Roboto-MediumItalic.ttf"),
  },
});
// pdfmake valida CADA leitura de arquivo local contra esta policy — inclusive
// as próprias fontes. Permite só o diretório de fontes embutido; nenhuma
// imagem/link externo é usado nos relatórios, então tudo fora disso é negado.
pdfMake.setLocalAccessPolicy((filePath) =>
  path.resolve(filePath).startsWith(FONTS_DIR),
);
pdfMake.setUrlAccessPolicy(() => false);

/** Tabela simples em A4, cabeçalho repetido em cada página, título + subtítulo. */
export async function buildTablePdf(
  title: string,
  subtitle: string,
  headers: string[],
  rows: string[][],
  /** Índices de coluna alinhados à direita (valores monetários). */
  rightAlignColumns: number[] = [],
): Promise<Buffer> {
  const docDefinition: TDocumentDefinitions = {
    pageSize: "A4",
    pageMargins: [32, 48, 32, 32],
    defaultStyle: { font: "Roboto", fontSize: 9 },
    content: [
      { text: title, style: "title" },
      { text: subtitle, style: "subtitle" },
      {
        table: {
          headerRows: 1,
          widths: headers.map((_, i) =>
            rightAlignColumns.includes(i) ? "auto" : "*",
          ),
          body: [
            headers.map((h) => ({ text: h, style: "tableHeader" })),
            ...rows.map((row) =>
              row.map((cell, i) => ({
                text: cell,
                alignment: rightAlignColumns.includes(i)
                  ? ("right" as const)
                  : ("left" as const),
              })),
            ),
          ],
        },
        layout: "lightHorizontalLines",
      },
    ],
    styles: {
      title: { fontSize: 16, bold: true, margin: [0, 0, 0, 2] },
      subtitle: { fontSize: 10, color: "#71717a", margin: [0, 0, 0, 12] },
      tableHeader: { bold: true, fillColor: "#f4f4f5" },
    },
  };

  const doc = pdfMake.createPdf(docDefinition);
  return doc.getBuffer();
}
