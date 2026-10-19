import { describe, expect, it } from 'vitest';
import manifest from '../../../../../../assets-build/manifest.json';
import { PLAYER_RADIUS, resolveCollisions, type Point2 } from '../../collision';
import { footprintOf, footprintRadiusOf } from '../../cho/footprints';
import { PROP_SIZES } from '../../cho/marketLayout';
import { sizeOf } from '../../modelSizes';
import { assembleVillage } from '../../village/villageLayout';
import { INTERACT_RADIUS, nearestInteractable } from '../../interaction';
import { LANG_GIAY_LAYOUT as L } from './giay';

const layout = assembleVillage(L);
const blocked = (x: number, z: number, r = PLAYER_RADIUS): boolean => resolveCollisions({ x, z } as Point2, r, layout.obstacles, L.radius);

/** Vòng tròn bao chân của một món (giữ khoảng cách khi xếp). */
function spots() {
  const out: { name: string; x: number; z: number; r: number }[] = [];
  for (const p of L.placements) out.push({ name: p.model, x: p.x, z: p.z, r: footprintRadiusOf(p.model) * p.scale });
  for (const p of L.props) {
    const k = PROP_SIZES[p.kind];
    if (p.kind === 'chan' || p.kind === 'nuoc' || p.kind === 'so-chung' || p.kind === 'hoa') continue; // nằm dưới/trên vật khác hoặc đi qua được
    out.push({ name: p.kind, x: p.x, z: p.z, r: k.r * p.scale });
  }
  for (const b of L.boards) out.push({ name: `bien ${b.level}`, x: b.x, z: b.z, r: 1 });
  out.push({ name: 'bac-an', x: L.guide.x, z: L.guide.z, r: 0.45 });
  return out;
}

describe('bố cục Làng Giấy', () => {
  it('đúng làng và cỡ: bán kính khoảng 20, cổng env/cong-lang-giay, chỗ xuất hiện ngay trong cổng nhìn vào làng', () => {
    expect(L.id).toBe('lang-giay');
    expect(L.radius).toBeGreaterThanOrEqual(19);
    expect(L.radius).toBeLessThanOrEqual(22);
    expect(L.gate.model).toBe('env/cong-lang-giay');
    expect(L.start.z).toBeGreaterThan(L.gate.z); // trong làng, phía trong cổng
    expect(Math.hypot(L.start.x - L.gate.x, L.start.z - L.gate.z)).toBeLessThan(5);
    expect(L.start.yaw).toBe(0); // nhìn về +Z, vào làng
  });

  it('đủ nhà ngói, nhà tranh, bụi tre, ít nhất 6 phên phơi giấy (mỗi phên 4 chân), 3 bể ngâm, bàn chép sổ có cuốn Sổ Chung, chồng giấy, bác An', () => {
    const count = (m: string) => L.placements.filter((p) => p.model === m).length;
    expect(count('env/nha-mai-ngoi')).toBeGreaterThanOrEqual(2);
    expect(count('env/nha-mai-tranh')).toBeGreaterThanOrEqual(2);
    expect(count('env/bui-tre')).toBeGreaterThanOrEqual(6);
    expect(count('env/phen-phoi-giay')).toBeGreaterThanOrEqual(6);
    expect(L.props.filter((p) => p.kind === 'chan')).toHaveLength(count('env/phen-phoi-giay') * 4);
    expect(L.props.filter((p) => p.kind === 'be-ngam')).toHaveLength(3);
    expect(L.props.filter((p) => p.kind === 'nuoc')).toHaveLength(3);
    expect(L.props.filter((p) => p.kind === 'ban-chep')).toHaveLength(1);
    expect(L.props.filter((p) => p.kind === 'so-chung')).toHaveLength(1);
    expect(L.props.filter((p) => p.kind === 'giay').length).toBeGreaterThanOrEqual(5);
    expect(L.guide.character).toBe('bacAn');
    // bác An gần bàn chép sổ
    const desk = L.props.find((p) => p.kind === 'ban-chep')!;
    expect(Math.hypot(L.guide.x - desk.x, L.guide.z - desk.z)).toBeLessThan(3);
    // cuốn sổ nằm đúng trên bàn
    const book = L.props.find((p) => p.kind === 'so-chung')!;
    expect([book.x, book.z]).toEqual([desk.x, desk.z]);
  });

  it('mọi model đặt trong làng có cỡ thật, chân tường và nằm trong manifest (kèm bản xa)', () => {
    const m = manifest as Record<string, unknown>;
    for (const id of layout.models) {
      expect(sizeOf(id), id).toBeDefined();
      expect(footprintOf(id).length, id).toBeGreaterThan(0);
      expect(m[`models/${id}`], id).toBeDefined();
      expect(m[`models/${id}-xa`], `${id}-xa`).toBeDefined();
    }
    for (const b of L.boards) expect(m[b.icon], b.icon).toBeDefined();
  });

  it('mọi món nằm trong hàng rào và không chồng lên nhau', () => {
    const list = spots();
    const bad: string[] = [];
    for (const s of list) if (Math.hypot(s.x, s.z) + s.r > L.fence!.radius - 0.3) bad.push(`ngoài hàng rào: ${s.name} (${s.x}, ${s.z}) r=${s.r.toFixed(2)} ra tới ${(Math.hypot(s.x, s.z) + s.r).toFixed(2)}`);
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i];
        const b = list[j];
        const d = Math.hypot(a.x - b.x, a.z - b.z);
        if (d < a.r + b.r - 0.05) bad.push(`chồng: ${a.name} (${a.x}, ${a.z}) r=${a.r.toFixed(2)} và ${b.name} (${b.x}, ${b.z}) r=${b.r.toFixed(2)} cách ${d.toFixed(2)}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('ba biển gỗ: màn 1, 2, 3 theo thứ tự trái sang phải trên màn hình, mặt quay về người vào làng, mỗi biển có icon', () => {
    expect(L.boards.map((b) => b.level)).toEqual([1, 2, 3]);
    for (const b of L.boards) {
      // mặt trước (sin yaw, cos yaw) hướng về phía nam (−Z)
      expect(Math.cos(b.yaw)).toBeLessThan(-0.9);
      expect(b.icon).toMatch(/^ui\/icons\//);
    }
    // nhìn về +Z thì bên trái màn hình là +X: màn 1 ở bên trái nhất
    expect(L.boards[0].x).toBeGreaterThan(L.boards[1].x);
    expect(L.boards[1].x).toBeGreaterThan(L.boards[2].x);
  });

  it('có vật cản cho cổng, nhà, phên, bể ngâm, bàn, biển, bác An và hàng rào; vật cản nằm trong khu', () => {
    expect(layout.colliders.length).toBeGreaterThan(40);
    expect(blocked(L.guide.x, L.guide.z, 0.05)).toBe(true);
    for (const b of L.boards) expect(blocked(b.x, b.z, 0.05)).toBe(true);
    const be = L.props.find((p) => p.kind === 'be-ngam')!;
    expect(blocked(be.x, be.z, 0.05)).toBe(true);
    const desk = L.props.find((p) => p.kind === 'ban-chep')!;
    expect(blocked(desk.x, desk.z, 0.05)).toBe(true);
    // mặt nước và cuốn sổ không có vật cản riêng (nằm trên bể/bàn đã có)
    for (const p of L.placements.filter((q) => q.model === 'env/phen-phoi-giay')) expect(blocked(p.x, p.z, 0.05)).toBe(true);
  });

  it('đi được từ chỗ xuất hiện tới trước từng biển, người dẫn và cổng (tìm đường trên lưới 0,5)', () => {
    const step = 0.5;
    const R = Math.ceil(L.radius / step);
    const key = (i: number, j: number) => (j + R) * (2 * R + 1) + (i + R);
    const free = (i: number, j: number) => Math.hypot(i * step, j * step) <= L.radius - 0.5 && !blocked(i * step, j * step);
    const seen = new Set<number>();
    const q: [number, number][] = [[Math.round(L.start.x / step), Math.round(L.start.z / step)]];
    seen.add(key(q[0][0], q[0][1]));
    for (let h = 0; h < q.length; h++) {
      const [i, j] = q[h];
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const a = i + di;
        const b = j + dj;
        if (seen.has(key(a, b)) || !free(a, b)) continue;
        seen.add(key(a, b));
        q.push([a, b]);
      }
    }
    const reach = (x: number, z: number) => {
      for (let a = -5; a <= 5; a++) for (let b = -5; b <= 5; b++) {
        const i = Math.round(x / step) + a;
        const j = Math.round(z / step) + b;
        if (Math.hypot(i * step - x, j * step - z) <= INTERACT_RADIUS - 0.2 && seen.has(key(i, j))) return true;
      }
      return false;
    };
    const targets = [...L.boards.map((b) => ({ id: `board:${b.level}`, x: b.x, z: b.z })), { id: 'guide', x: L.guide.x, z: L.guide.z }, { id: 'gate', x: L.gate.x, z: L.gate.z }];
    for (const it of targets) expect(reach(it.x, it.z), it.id).toBe(true);
    // và đi xuyên lối giữa cổng không bị chặn
    for (let z = L.gate.z - 3; z <= L.gate.z + 4; z += 0.25) expect(blocked(L.gate.x, z), `z=${z}`).toBe(false);
  });

  it('vật tương tác (biển, người dẫn, cổng): đứng trước biển 1 thì biển 1 được chọn, trước người dẫn thì người dẫn', () => {
    const list = [...L.boards.map((b) => ({ id: `board:${b.level}`, x: b.x, z: b.z })), { id: 'guide', x: L.guide.x, z: L.guide.z }, { id: 'gate', x: L.gate.x, z: L.gate.z }];
    expect(list.map((i) => i.id)).toEqual(['board:1', 'board:2', 'board:3', 'guide', 'gate']);
    const b1 = L.boards[0];
    expect(list[nearestInteractable(b1.x, b1.z - 1.2, list)].id).toBe('board:1');
    expect(list[nearestInteractable(L.guide.x, L.guide.z - 1.4, list)].id).toBe('guide');
    expect(list[nearestInteractable(L.gate.x, L.gate.z + 1, list)].id).toBe('gate');
  });
});
