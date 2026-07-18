import ExcelJS from "exceljs";

/** Planilha simples: uma aba, cabeçalho em negrito, colunas com largura automática. */
export async function buildTableXlsx(
  sheetName: string,
  headers: string[],
  rows: string[][],
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "FinApp";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(sheetName);
  sheet.addRow(headers);
  sheet.getRow(1).font = { bold: true };
  rows.forEach((row) => sheet.addRow(row));

  sheet.columns.forEach((column, index) => {
    const header = headers[index] ?? "";
    const longestCell = rows.reduce(
      (max, row) => Math.max(max, (row[index] ?? "").length),
      header.length,
    );
    column.width = Math.min(40, Math.max(10, longestCell + 2));
  });

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
