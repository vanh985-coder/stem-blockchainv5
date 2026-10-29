import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { classifyAutoError } from '../progress/autoError';
import { buildCsv } from './csv';
import { buildProgressTable, progressHeaders, progressRowText, type ClassProgressRow } from './progress';

/**
 * Dữ liệu THẬT từ PostgreSQL biệt lập (scripts/db-test-p3b.sh): hàng class_progress sau migration 0003 và thông báo
 * lỗi thật của máy chủ chưa áp migration. Không đặt biến môi trường thì bỏ qua (test này không chạy trong `pnpm test` thường).
 */
const ROWS = process.env.P3B_ROWS_JSON;
const ERR = process.env.P3B_ERR_FILE;
const S1 = '00000000-0000-0000-0000-0000000000a1';
const T2 = '00000000-0000-0000-0000-0000000000b2';

describe.skipIf(!ROWS)('class_progress thật sau migration 0003', () => {
  const rows = (ROWS ? JSON.parse(readFileSync(ROWS, 'utf8').replace(/\\n/g, '')) : []) as ClassProgressRow[];
  const table = buildProgressTable(rows);

  it('có cờ của giáo viên 2 ở màn 5 và không che kết quả thật của học sinh 1', () => {
    const t2 = table.find((s) => s.id === T2);
    expect(t2?.levels[5]?.auto).toBe(true);
    expect(t2?.levels[5]?.completed).toBe(false);
    const s1 = table.find((s) => s.id === S1);
    expect(s1?.levels[1]?.completed).toBe(true);
    expect(s1?.levels[1]?.auto).toBe(false);
    expect(s1?.totalStars).toBeGreaterThan(0);
  });

  it('CSV có đủ cột, ô tự hoàn thành tách khỏi ô hoàn thành thật', () => {
    const headers = progressHeaders();
    const csv = buildCsv(headers, table.map((s) => progressRowText(s)));
    const lines = csv.split('\r\n').filter(Boolean);
    expect(lines.length).toBe(table.length + 1);
    const t2Line = progressRowText(table.find((s) => s.id === T2)!);
    expect(t2Line[5]).not.toBe('');
    const s1Line = progressRowText(table.find((s) => s.id === S1)!);
    expect(s1Line[1]).toContain('3');
    expect(s1Line.join('|')).not.toBe(t2Line.join('|'));
  });
});

describe.skipIf(!ERR)('lỗi thật của máy chủ chưa chạy migration 0003', () => {
  it('được nhận là thiếu cột', () => {
    const [, code, ...msg] = readFileSync(ERR!, 'utf8').trim().split(':');
    expect(classifyAutoError({ code, message: msg.join(':') })).toBe('missing-column');
  });
});
