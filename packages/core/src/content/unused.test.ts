import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { bai1Texts } from './lessons/bai-1';
import { bai2Texts } from './lessons/bai-2';
import { bai3Texts } from './lessons/bai-3';
import { bai4Texts } from './lessons/bai-4';
import { teacherTexts } from './teacher';
import { ui } from './ui';
import { villageIntroTexts } from './villageIntro';

/**
 * Báo chuỗi thừa trong content/: mỗi chuỗi chữ (lá của các bảng chữ) phải được tham chiếu ở đâu đó trong mã
 * (dạng `.<khóa>` hoặc `['<khóa>']`) ngoài file test. Chuỗi không còn ai dùng thì xóa khỏi content/.
 * Kiểm tra theo tên khóa cuối, nên khóa trùng tên với một khóa khác đang dùng thì không bị bắt (chỉ bắt thừa chắc chắn).
 */
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');

const TABLES: Record<string, unknown> = {
  ui,
  teacherTexts,
  villageIntroTexts,
  bai1Texts,
  bai2Texts,
  bai3Texts,
  bai4Texts,
};

/**
 * Các bảng được tra bằng khóa động (ví dụ ui.lang[id], T.loai[kind], loi[code]) nên không thể tìm `.<khóa>`.
 * Mỗi mục là đường dẫn bắt đầu bằng tên bảng.
 */
export const DYNAMIC_TABLES: readonly string[] = ['ui.lang', 'teacherTexts.datLai.loi', 'villageIntroTexts.loai', 'bai2Texts.kho.nghi'];

/** Mọi lá là chuỗi (hoặc mảng) trong bảng, kèm đường dẫn dạng "ui.banDo.hoSo". Mảng được coi là một lá. */
export function leafPaths(value: unknown, prefix: string): string[] {
  if (typeof value === 'string' || Array.isArray(value)) return [prefix];
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([k, v]) => leafPaths(v, `${prefix}.${k}`));
  }
  return [];
}

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === 'dist' || name.startsWith('.')) continue;
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) sourceFiles(full, out);
    else if (/\.(ts|tsx)$/.test(name) && !/\.test\.(ts|tsx)$/.test(name)) out.push(full);
  }
  return out;
}

/** Các khóa được tham chiếu dạng `.khóa` hoặc `['khóa']` trong mã nguồn (không tính test). */
export function referencedKeys(): Set<string> {
  const text = ['apps', 'packages'].flatMap((d) => sourceFiles(path.join(ROOT, d))).map((f) => readFileSync(f, 'utf8')).join('\n');
  const keys = new Set<string>();
  for (const m of text.matchAll(/(?:\?\.|\.|\[['"])([A-Za-z_][A-Za-z0-9_-]*)/g)) keys.add(m[1]);
  return keys;
}

describe('chuỗi thừa trong content/', () => {
  const used = referencedKeys();
  const all = Object.entries(TABLES).flatMap(([name, table]) => leafPaths(table, name));

  it('mọi chuỗi chữ đều được tham chiếu ở đâu đó trong mã (chuỗi thừa thì xóa khỏi content/)', () => {
    const unused = all
      .filter((p) => !DYNAMIC_TABLES.some((d) => p === d || p.startsWith(`${d}.`)))
      .filter((p) => !used.has(p.split('.').pop() as string));
    expect(unused, `Chuỗi không còn được dùng:\n${unused.join('\n')}`).toEqual([]);
  });

  it('các bảng tra bằng khóa động trong danh sách ngoại lệ vẫn còn tồn tại', () => {
    for (const d of DYNAMIC_TABLES) {
      expect(
        all.some((p) => p === d || p.startsWith(`${d}.`)),
        `${d} không còn trong content/, bỏ khỏi DYNAMIC_TABLES`,
      ).toBe(true);
    }
  });

  it('không còn ui.truyen.veTrangChu (đã bỏ khi /truyen chuyển sang VnDialog)', () => {
    expect(Object.keys(ui.truyen)).not.toContain('veTrangChu');
  });
});
