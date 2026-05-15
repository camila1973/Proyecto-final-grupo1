// RFC-4180 CSV cell escape: wrap in quotes if it contains comma, quote, or
// newline; double any embedded quotes. Numbers pass through as-is.
function escapeCell(value: string | number): string {
  if (typeof value === "number") return String(value);
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function csvRow(cells: (string | number)[]): string {
  return cells.map(escapeCell).join(",") + "\r\n";
}
