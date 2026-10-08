import { describe, expect, it } from 'vitest';
import { CHARACTER_IDS, EXTRA_VARS } from './characters';
import { ui } from './ui';

function allStrings(node: unknown, path = 'ui', out: [string, string][] = []): [string, string][] {
  if (typeof node === 'string') out.push([path, node]);
  else if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) allStrings(v, `${path}.${k}`, out);
  }
  return out;
}

const ALLOWED = new Set<string>([
  'ten',
  'Ten',
  ...CHARACTER_IDS.filter((id) => id !== 'hocSinh'),
  ...EXTRA_VARS,
]);

describe('content/ui.ts', () => {
  const strings = allStrings(ui);

  it('có chữ và không câu nào rỗng', () => {
    expect(strings.length).toBeGreaterThan(50);
    for (const [path, s] of strings) {
      expect(s.trim(), path).not.toBe('');
    }
  });

  it('chỉ dùng chỗ giữ tên hợp lệ', () => {
    for (const [path, s] of strings) {
      for (const m of s.matchAll(/\{([^}]*)\}/g)) {
        expect(ALLOWED.has(m[1]), `${path}: {${m[1]}}`).toBe(true);
      }
      expect(s.replace(/\{[^}]*\}/g, ''), `${path}: ngoặc nhọn lẻ`).not.toMatch(/[{}]/);
    }
  });
});
