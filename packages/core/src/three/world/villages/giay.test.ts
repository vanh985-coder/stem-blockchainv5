import { describe, expect, it } from 'vitest';
import manifest from '../../../../../../assets-build/manifest.json';
import { PLAYER_RADIUS, resolveCollisions, type Point2 } from '../../collision';
import { footprintOf, footprintRadiusOf } from '../../cho/footprints';
import { PROP_SIZES } from '../../cho/marketLayout';
import { sizeOf } from '../../modelSizes';
import { POND_BANK, assembleVillage } from '../../village/villageLayout';
import { INTERACT_RADIUS, nearestInteractable } from '../../interaction';
import { LANG_GIAY_LAYOUT as L } from './giay';

const layout = assembleVillage(L);
const FENCE_R = L.fence!.radius;
/** Có bị chặn không (không giới hạn biên: biên của cả thế giới là việc của WalkWorld). */
const blocked = (x: number, z: number, r = PLAYER_RADIUS): boolean => resolveCollisions({ x, z } as Point2, r, layout.obstacles);
const count = (m: string) => L.placements.filter((p) => p.model === m).length;
const props = (k: string) => L.props.filter((p) => p.kind === k);

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

/** Lưới ô 0,5 đi được từ chỗ xuất hiện (bước 4 hướng, người chơi bán kính 0,4). */
function reachableCells() {
  const step = 0.5;
  const R = Math.ceil(FENCE_R / step);
  const key = (i: number, j: number) => (j + R) * (2 * R + 1) + (i + R);
  const free = (i: number, j: number) => Math.hypot(i * step, j * step) <= FENCE_R - 0.5 && !blocked(i * step, j * step);
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
  const reach = (x: number, z: number, radius: number = INTERACT_RADIUS - 0.2) => {
    const n = Math.ceil(radius / step);
    for (let a = -n; a <= n; a++) for (let b = -n; b <= n; b++) {
      const i = Math.round(x / step) + a;
      const j = Math.round(z / step) + b;
      if (Math.hypot(i * step - x, j * step - z) <= radius && seen.has(key(i, j))) return true;
    }
    return false;
  };
  const standable = (x: number, z: number) => seen.has(key(Math.round(x / step), Math.round(z / step)));
  return { reach, standable, count: seen.size };
}

describe('bố cục Làng Giấy (bước W2: bán kính 35, mở ra phía sau cổng)', () => {
  it('đúng làng và cỡ: bán kính 35, cổng env/cong-lang-giay ở (0, −35), chỗ xuất hiện trên đại lộ trước các biển, nhìn vào làng', () => {
    expect(L.id).toBe('lang-giay');
    expect(L.radius).toBeGreaterThanOrEqual(33);
    expect(L.radius).toBeLessThanOrEqual(37);
    expect(L.gate.model).toBe('env/cong-lang-giay');
    expect([L.gate.x, L.gate.z]).toEqual([0, -35]); // cổng giữ ở chỗ cũ ngoài thế giới, tâm làng cách tâm chợ 72 + 35
    expect(L.start.z).toBeGreaterThan(L.gate.z);
    expect(L.start.yaw).toBe(0); // nhìn về +Z, vào làng
    const b = L.boards[0];
    expect(Math.hypot(L.start.x - b.x, L.start.z - b.z)).toBeLessThan(8); // cạnh ba biển
    expect(blocked(L.start.x, L.start.z)).toBe(false);
  });

  it('đủ 8 đến 14 nhà (cả nhà ngói và nhà tranh, đổi màu, tỉ lệ và góc xoay), ít nhất 12 phên phơi giấy (mỗi phên 4 chân), 3 bể ngâm dó, bếp nấu dó, cối giã dó, chồng giấy, đình, giếng, cây đa', () => {
    const houses = count('env/nha-mai-ngoi') + count('env/nha-mai-tranh');
    expect(houses).toBeGreaterThanOrEqual(8);
    expect(houses).toBeLessThanOrEqual(14);
    expect(count('env/nha-mai-ngoi')).toBeGreaterThanOrEqual(4);
    expect(count('env/nha-mai-tranh')).toBeGreaterThanOrEqual(4);
    const hs = L.placements.filter((p) => p.model.startsWith('env/nha-mai'));
    expect(new Set(hs.map((p) => p.scale.toFixed(2))).size).toBeGreaterThanOrEqual(5);
    expect(new Set(hs.map((p) => p.tint.join(','))).size).toBeGreaterThanOrEqual(5);
    expect(new Set(hs.map((p) => p.yaw.toFixed(2))).size).toBe(hs.length);
    expect(count('env/bui-tre')).toBeGreaterThanOrEqual(8);
    expect(count('env/phen-phoi-giay')).toBeGreaterThanOrEqual(12);
    expect(props('chan')).toHaveLength(count('env/phen-phoi-giay') * 4);
    expect(props('be-ngam')).toHaveLength(3);
    expect(props('nuoc')).toHaveLength(3);
    expect(props('bep-do').length).toBeGreaterThanOrEqual(2);
    expect(props('coi-gia').length).toBeGreaterThanOrEqual(2);
    expect(props('giay').length).toBeGreaterThanOrEqual(8);
    expect(props('chum').length).toBeGreaterThanOrEqual(8);
    expect(props('rom').length).toBeGreaterThanOrEqual(1);
    expect(props('hoa').length).toBeGreaterThanOrEqual(10);
    expect(props('dinh')).toHaveLength(1);
    expect(count('env/gieng-lang')).toBe(1);
    expect(count('env/cay-da')).toBe(1);
    expect(props('ban-chep')).toHaveLength(1);
    expect(props('so-chung')).toHaveLength(1);
    expect(L.guide.character).toBe('bacAn');
    // bác An gần bàn chép sổ, cuốn sổ nằm đúng trên bàn
    const desk = props('ban-chep')[0];
    expect(Math.hypot(L.guide.x - desk.x, L.guide.z - desk.z)).toBeLessThan(3);
    const book = props('so-chung')[0];
    expect([book.x, book.z]).toEqual([desk.x, desk.z]);
  });

  it('chia khu: giữa làng (biển, bác An) ở gần tâm; xưởng làm giấy ở phía đông; nhà ở phía tây; ao, đình, cây đa, giếng ở phía bắc; ruộng và bụi tre ở rìa', () => {
    for (const b of L.boards) expect(Math.hypot(b.x, b.z)).toBeLessThan(13);
    expect(Math.hypot(L.guide.x, L.guide.z)).toBeLessThan(10);
    const east = (p: { x: number }) => p.x > 5;
    for (const p of [...props('be-ngam'), ...props('bep-do'), ...props('coi-gia')]) expect(east(p), p.kind).toBe(true);
    for (const r of L.placements.filter((p) => p.model === 'env/phen-phoi-giay')) expect(east(r)).toBe(true);
    const west = L.placements.filter((p) => p.model.startsWith('env/nha-mai') && p.x < -8);
    expect(west.length).toBeGreaterThanOrEqual(6);
    for (const p of [props('dinh')[0], L.placements.find((q) => q.model === 'env/cay-da')!, ...L.ponds!]) expect(p.z).toBeGreaterThan(15);
    for (const f of L.fields!) expect(Math.hypot(f.x, f.z)).toBeGreaterThan(22);
    const rim = L.placements.filter((p) => p.model === 'env/bui-tre' && Math.hypot(p.x, p.z) > 28);
    expect(rim.length).toBeGreaterThanOrEqual(5);
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
    for (const s of list) if (Math.hypot(s.x, s.z) + s.r > FENCE_R - 0.3) bad.push(`ngoài hàng rào: ${s.name} (${s.x}, ${s.z}) r=${s.r.toFixed(2)} ra tới ${(Math.hypot(s.x, s.z) + s.r).toFixed(2)}`);
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

  it('ao, ruộng, đường: ao không đè đồ vật; mọi món đồ cách mặt nước ao ít nhất 0,4; ruộng không có nhà; đường không xuyên qua nhà', () => {
    for (const s of spots()) {
      for (const p of L.ponds!) expect(Math.hypot(s.x - p.x, s.z - p.z) - p.r - s.r, `${s.name} sát ao`).toBeGreaterThan(-0.2);
    }
    for (const f of L.fields!) {
      for (const p of L.placements.filter((q) => q.model.startsWith('env/nha-mai'))) {
        const d = Math.hypot(p.x - f.x, p.z - f.z);
        expect(d, `nhà (${p.x}, ${p.z}) trong ruộng`).toBeGreaterThan(Math.min(f.hx, f.hz) + footprintRadiusOf(p.model) * 0.6);
      }
    }
    for (const rd of L.roads) {
      const n = Math.ceil(Math.hypot(rd.x1 - rd.x0, rd.z1 - rd.z0) / 1);
      for (let i = 0; i <= n; i++) {
        const x = rd.x0 + ((rd.x1 - rd.x0) * i) / n;
        const z = rd.z0 + ((rd.z1 - rd.z0) * i) / n;
        for (const h of L.placements.filter((q) => q.model.startsWith('env/nha-mai'))) expect(Math.hypot(h.x - x, h.z - z), `đường qua nhà (${h.x}, ${h.z})`).toBeGreaterThan(2.2);
      }
    }
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

  it('có vật cản cho cổng, nhà, phên, bể ngâm, bếp, cối, đình, ao, bàn, biển, bác An, hàng rào và hàng rào ngắn; đồ nhỏ thấp thì không', () => {
    expect(layout.colliders.length).toBeGreaterThan(200);
    expect(blocked(L.guide.x, L.guide.z, 0.05)).toBe(true);
    for (const b of L.boards) expect(blocked(b.x, b.z, 0.05)).toBe(true);
    for (const k of ['be-ngam', 'ban-chep', 'bep-do', 'coi-gia', 'dinh'] as const) for (const p of props(k)) expect(blocked(p.x, p.z, 0.05), k).toBe(true);
    for (const p of L.placements.filter((q) => ['env/phen-phoi-giay', 'env/gieng-lang', 'env/nha-mai-ngoi', 'env/nha-mai-tranh'].includes(q.model))) expect(blocked(p.x, p.z, 0.05), p.model).toBe(true);
    // mặt nước và cuốn sổ không có vật cản riêng (nằm trên bể/bàn đã có); khóm hoa đi qua được
    for (const p of props('hoa')) expect(blocked(p.x, p.z, 0.05), 'hoa').toBe(false);
  });

  it('ao: mặt nước chặn từng vũng, bờ cỏ đi được; đình: nền đá chặn đúng hộp 6,2 × 5,0, sát ngoài nền đi được', () => {
    for (const p of L.ponds!) {
      expect(blocked(p.x, p.z, 0.05)).toBe(true);
      expect(blocked(p.x + p.r - 0.5, p.z, 0.05)).toBe(true); // gần mép nước vẫn trong nước
    }
    // bờ ao: cách mặt nước 0,5 về phía ngoài (xa các vũng khác) thì đi được
    const north = { x: -9, z: 20.5 + 4.8 + 0.6 };
    expect(blocked(north.x, north.z)).toBe(false);
    expect(POND_BANK).toBeGreaterThan(0.5);
    const d = props('dinh')[0];
    const k = PROP_SIZES.dinh.box!;
    expect(blocked(d.x + 0.5, d.z + 0.5, 0.05)).toBe(true);
    expect(blocked(d.x, d.z - k.hz - 0.45)).toBe(false); // trước nền (phía nam, mặt đình quay ra ao)
    expect(blocked(d.x - k.hx - 0.45, d.z)).toBe(false);
  });

  it('đi được từ chỗ xuất hiện tới trước từng biển, bác An, cổng, giếng, đình, bể ngâm, bếp, cối, sân phơi, ao, hàng cây đa (tìm đường trên lưới 0,5)', () => {
    const { reach, count: cells } = reachableCells();
    expect(cells).toBeGreaterThan(6000); // làng rộng, phần lớn đi được
    const targets = [
      ...L.boards.map((b) => ({ id: `board:${b.level}`, x: b.x, z: b.z })),
      { id: 'guide', x: L.guide.x, z: L.guide.z },
      { id: 'gate', x: L.gate.x, z: L.gate.z },
      ...props('be-ngam').map((p, i) => ({ id: `be ${i}`, x: p.x, z: p.z })),
      ...props('bep-do').map((p, i) => ({ id: `bep ${i}`, x: p.x, z: p.z })),
      ...props('coi-gia').map((p, i) => ({ id: `coi ${i}`, x: p.x, z: p.z })),
      { id: 'dinh', x: props('dinh')[0].x, z: props('dinh')[0].z },
      ...L.placements.filter((p) => p.model === 'env/gieng-lang' || p.model === 'env/cay-da').map((p) => ({ id: p.model, x: p.x, z: p.z })),
      ...L.placements.filter((p) => p.model === 'env/phen-phoi-giay').map((p, i) => ({ id: `phen ${i}`, x: p.x, z: p.z })),
      ...L.placements.filter((p) => p.model.startsWith('env/nha-mai')).map((p, i) => ({ id: `nha ${i}`, x: p.x, z: p.z })),
    ];
    for (const it of targets) expect(reach(it.x, it.z, it.id === 'dinh' || it.id === 'env/cay-da' || it.id.startsWith('nha') ? 6 : INTERACT_RADIUS - 0.2), it.id).toBe(true);
    for (const p of L.ponds!) expect(reach(p.x, p.z, p.r + 2), 'ao').toBe(true);
    // và đi xuyên lối giữa cổng không bị chặn
    for (let z = L.gate.z - 3; z <= L.gate.z + 4; z += 0.25) expect(blocked(L.gate.x, z), `z=${z}`).toBe(false);
  });

  it('dân làng: 2 đến 3 người, mỗi vòng ít nhất 3 điểm, mọi điểm đi được và mọi đoạn nối không xuyên vật cản; có cả bà cụ và chú nông dân (xen kẽ theo thứ tự)', () => {
    expect(L.villagers!.length).toBeGreaterThanOrEqual(2);
    expect(L.villagers!.length).toBeLessThanOrEqual(3);
    const { standable } = reachableCells();
    for (const [vi, loop] of L.villagers!.entries()) {
      expect(loop.length, `dân ${vi}`).toBeGreaterThanOrEqual(3);
      for (let i = 0; i < loop.length; i++) {
        const [ax, az] = loop[i];
        const [bx, bz] = loop[(i + 1) % loop.length];
        expect(blocked(ax, az, 0.45 + 0.1), `dân ${vi} điểm ${i}`).toBe(false);
        expect(standable(ax, az), `dân ${vi} điểm ${i} nối với chỗ xuất hiện`).toBe(true);
        const n = Math.ceil(Math.hypot(bx - ax, bz - az) / 0.25);
        for (let k = 0; k <= n; k++) expect(blocked(ax + ((bx - ax) * k) / n, az + ((bz - az) * k) / n, 0.45), `dân ${vi} đoạn ${i} bước ${k}`).toBe(false);
      }
    }
  });

  it('đường đi cho mũi tên: các nút đều trống, mọi đoạn nối đi được, có nút vào, nút cho các biển, chỗ đứng trước bác An', () => {
    const p = L.paths!;
    const byId = new Map(p.nodes.map((n) => [n.id, n]));
    expect(byId.has(p.entry)).toBe(true);
    expect(byId.has(p.boardJoin)).toBe(true);
    expect(byId.has(p.guideStand!.join)).toBe(true);
    for (const n of p.nodes) expect(blocked(n.x, n.z), `nút ${n.id}`).toBe(false);
    for (const [a, b] of p.links) {
      const A = byId.get(a)!;
      const B = byId.get(b)!;
      const n = Math.ceil(Math.hypot(B.x - A.x, B.z - A.z) / 0.25);
      for (let k = 0; k <= n; k++) expect(blocked(A.x + ((B.x - A.x) * k) / n, A.z + ((B.z - A.z) * k) / n), `đoạn ${a}-${b} bước ${k}`).toBe(false);
    }
    const g = p.guideStand!;
    expect(blocked(g.x, g.z)).toBe(false);
    expect(Math.hypot(g.x - L.guide.x, g.z - L.guide.z)).toBeLessThanOrEqual(INTERACT_RADIUS - 0.2); // đứng đó là bấm E được vào bác An
    const comp = new Set([p.entry]);
    for (let pass = 0; pass < p.nodes.length; pass++) for (const [a, b] of p.links) if (comp.has(a) || comp.has(b)) (comp.add(a), comp.add(b));
    expect(comp.size).toBe(p.nodes.length); // một mạng liền
  });

  it('vật tương tác (biển, người dẫn, cổng): đứng trước biển 1 thì biển 1 được chọn, trước người dẫn thì người dẫn', () => {
    const list = [...L.boards.map((b) => ({ id: `board:${b.level}`, x: b.x, z: b.z })), { id: 'guide', x: L.guide.x, z: L.guide.z }, { id: 'gate', x: L.gate.x, z: L.gate.z }];
    expect(list.map((i) => i.id)).toEqual(['board:1', 'board:2', 'board:3', 'guide', 'gate']);
    const b1 = L.boards[0];
    expect(list[nearestInteractable(b1.x, b1.z - 1.2, list)].id).toBe('board:1');
    expect(list[nearestInteractable(L.guide.x + 1.4, L.guide.z, list)].id).toBe('guide');
    expect(list[nearestInteractable(L.gate.x, L.gate.z + 1, list)].id).toBe('gate');
  });
});
