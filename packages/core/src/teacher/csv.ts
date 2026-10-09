/**
 * Dựng file CSV cho Excel: UTF-8 có BOM để đọc đúng tiếng Việt, dòng cách nhau bằng CRLF.
 * Ô có dấu phẩy, dấu ngoặc kép hoặc xuống dòng được bao trong ngoặc kép, ngoặc kép bên trong nhân đôi.
 */

export const CSV_BOM = '﻿';

/**
 * Ô bắt đầu bằng = + - @ (hoặc tab, xuống dòng) bị Excel hiểu là công thức. Tên hiển thị do học sinh tự đặt nên
 * thêm một dấu nháy đơn ở đầu để Excel coi là chữ.
 */
function neutralizeFormula(value: string): string {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

export function csvField(value: string): string {
  const v = neutralizeFormula(value);
  return /[\x22,\r\n]/.test(v) ? `\x22${v.replace(/\x22/g, '\x22\x22')}\x22` : v;
}

export function csvLine(fields: readonly string[]): string {
  return fields.map(csvField).join(',');
}

/** Cả file: BOM, dòng tiêu đề, các dòng dữ liệu; kết thúc bằng CRLF. */
export function buildCsv(headers: readonly string[], rows: readonly (readonly string[])[]): string {
  return CSV_BOM + [headers, ...rows].map(csvLine).join('\r\n') + '\r\n';
}

/** Tên file an toàn từ tên lớp (bỏ ký tự cấm trong tên file). */
export function safeFileName(name: string, fallback = 'lop'): string {
  const cleaned = name.replace(/[\\/:*?\x22<>|\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim().replace(/ /g, '-');
  return cleaned || fallback;
}
