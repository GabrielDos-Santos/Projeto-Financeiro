/**
 * CSV nativo (sem dependência) — RFC 4180: campo com vírgula/aspas/quebra de
 * linha vai entre aspas, aspas internas dobradas. BOM UTF-8 no início para o
 * Excel abrir acentos corretamente sem configuração extra.
 */
const UTF8_BOM = "﻿";

function escapeCsvField(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function buildTableCsv(headers: string[], rows: string[][]): string {
  const lines = [headers, ...rows].map((row) =>
    row.map(escapeCsvField).join(","),
  );
  return UTF8_BOM + lines.join("\r\n");
}
