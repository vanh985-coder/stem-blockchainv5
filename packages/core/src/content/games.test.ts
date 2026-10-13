import { describe, expect, it } from 'vitest';
import { CHARACTER_IDS, EXTRA_VARS, fmt } from './characters';
import { GAMES, gameUi } from './games';
import { levelById } from './levels';

const ALLOWED = new Set<string>(['ten', 'Ten', ...CHARACTER_IDS.filter((id) => id !== 'hocSinh'), ...EXTRA_VARS]);

function allStrings(node: unknown, path: string, out: [string, string][] = []): [string, string][] {
  if (typeof node === 'string') out.push([path, node]);
  else if (Array.isArray(node)) node.forEach((v, i) => allStrings(v, `${path}[${i}]`, out));
  else if (node && typeof node === 'object') for (const [k, v] of Object.entries(node)) allStrings(v, `${path}.${k}`, out);
  return out;
}

describe('content/games.ts', () => {
  const strings = [...allStrings(GAMES, 'GAMES'), ...allStrings(gameUi, 'gameUi')];

  it('chỉ dùng chỗ giữ tên hợp lệ, không ngoặc nhọn lẻ', () => {
    for (const [path, s] of strings) {
      for (const m of s.matchAll(/\{([^}]*)\}/g)) expect(ALLOWED.has(m[1]), `${path}: {${m[1]}}`).toBe(true);
      expect(s.replace(/\{[^}]*\}/g, ''), `${path}: ngoặc nhọn lẻ`).not.toMatch(/[{}]/);
    }
  });

  it('không viết cứng tên phản diện (dùng {phanDien}) và không còn chỗ giữ tên sau fmt()', () => {
    const phanDien = fmt('{phanDien}');
    for (const [path, s] of strings) {
      expect(s, path).not.toContain(phanDien);
      expect(fmt(s, { diem: 1, so: 1, so2: 2, so3: 3, muc: 'Đồng' }), path).not.toMatch(/[{}]/);
    }
  });

  it('màn 2: tên khớp danh sách màn, luật 2 đến 3 dòng, có cách điều khiển cho máy tính và điện thoại', () => {
    const g = GAMES[2]!;
    expect(g.ten).toBe(levelById(2)!.ten);
    expect(g.luat.length).toBeGreaterThanOrEqual(2);
    expect(g.luat.length).toBeLessThanOrEqual(3);
    expect(g.dieuKhien.mayTinh.length).toBeGreaterThan(10);
    expect(g.dieuKhien.dienThoai.length).toBeGreaterThan(10);
    expect(g.luat.join(' ')).toContain('{phanDien}');
  });

  it('chữ xưng "em", có đủ ba tên mốc', () => {
    expect(gameUi.moc).toEqual(['Chưa đạt mốc', 'Đồng', 'Bạc', 'Vàng']);
    expect(gameUi.choiLai).toBe('Chơi lại');
    expect(gameUi.veLang).toBe('Về làng');
    expect(gameUi.batDau).toBe('Bắt đầu');
  });
});
