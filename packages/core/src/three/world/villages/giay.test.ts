import { describe, expect, it } from 'vitest';
import { GIAY_GATE_Z, GIAY_HOUSE_COUNT, GIAY_RADIUS, GIAY_WALL_RADIUS, LANG_GIAY_LAYOUT as L } from './giay';
import { fnv1a, layoutSpots, probeOf, reachGrid } from './villageChecks';

const probe = probeOf(L);
const blocked = probe.blocked;
const props = (k: string) => L.props.filter((p) => p.kind === k);
const scatterOf = (k: string) => (L.scatter ?? []).filter((p) => p.kind === k);
const count = (m: string) => L.placements.filter((p) => p.model === m).length;

/** Vòng tròn bao chân của một món (giữ khoảng cách khi xếp). */
const spots = () => layoutSpots(L, [{ name: 'bac-an', x: L.guide.x, z: L.guide.z, r: 0.45 }]);

/** Lưới ô 1,0 đi được từ chỗ xuất hiện (bước 4 hướng, người chơi bán kính 0,4); trả hàm hỏi một điểm có đứng tới được không. */
const reachableCells = (plugGate = false) => reachGrid(L, blocked, GIAY_WALL_RADIUS, GIAY_GATE_Z, plugGate);

describe('Làng Giấy: bố cục không đổi sau khi tách bộ dụng cụ dùng chung (mốc 3, bước L1)', () => {
  it('băm của cả bố cục khớp bản trước khi tách: không món nào đổi vị trí, cỡ, màu hay thứ tự (đổi Làng Giấy một cách chủ ý thì cập nhật số này)', () => {
    expect(L.placements).toHaveLength(46);
    expect(L.props).toHaveLength(151);
    expect(L.scatter).toHaveLength(649);
    expect(fnv1a(JSON.stringify(L))).toBe('e7bc8260');
  });
});

describe('Làng Giấy (bước X3): quy mô và bố cục', () => {
  it('bán kính 125, cổng ở (0, −125) nên tâm làng cách chợ 197 (cổng ở 72); lũy tre bao quanh', () => {
    expect(L.radius).toBe(GIAY_RADIUS);
    expect(GIAY_RADIUS).toBe(125);
    expect(L.gate.z).toBe(GIAY_GATE_Z);
    expect(L.wall).toEqual({ radius: GIAY_WALL_RADIUS, gap: 9.5 });
    expect(scatterOf('tre').filter((p) => Math.abs(Math.hypot(p.x, p.z) - GIAY_WALL_RADIUS) < 2.5).length).toBeGreaterThan(200);
  });

  it('khu nhà ở 25 đến 35 nhà (nhà ngói và nhà tranh), thêm 3 nhà xưởng; đình, giếng, chợ làng, ao lớn, vườn cây, đồi tre, ruộng lúa', () => {
    expect(GIAY_HOUSE_COUNT).toBeGreaterThanOrEqual(25);
    expect(GIAY_HOUSE_COUNT).toBeLessThanOrEqual(35);
    expect(count('env/nha-mai-ngoi')).toBeGreaterThan(8);
    expect(count('env/nha-mai-tranh')).toBeGreaterThan(8);
    expect(props('dinh')).toHaveLength(1);
    expect(count('env/gieng-lang')).toBeGreaterThanOrEqual(2);
    expect(count('env/leu-cho')).toBeGreaterThanOrEqual(4);
    expect(count('env/cay-da')).toBeGreaterThanOrEqual(2);
    expect(L.ponds!.length).toBeGreaterThanOrEqual(3);
    expect(L.ponds!.reduce((a, p) => a + Math.PI * p.r * p.r, 0)).toBeGreaterThan(1200); // ao lớn
    expect(scatterOf('cau-ao')).toHaveLength(1);
    expect(scatterOf('cay-qua').length).toBeGreaterThanOrEqual(30);
    expect(scatterOf('doi').length).toBeGreaterThanOrEqual(4);
    expect(L.fields!.length).toBeGreaterThanOrEqual(5);
  });

  it('xưởng làm giấy lớn: nhiều bể ngâm, cối giã, bếp nấu, sân phơi 40 phên, chồng giấy', () => {
    expect(props('be-ngam')).toHaveLength(8);
    expect(props('coi-gia').length).toBeGreaterThanOrEqual(5);
    expect(props('bep-do').length).toBeGreaterThanOrEqual(4);
    expect(scatterOf('phen').length).toBeGreaterThanOrEqual(36);
    expect(props('giay').length).toBeGreaterThanOrEqual(10);
    const yard = L.yards.reduce((m, y) => Math.max(m, y.r), 0);
    expect(yard).toBeGreaterThanOrEqual(25); // sân phơi rộng
  });

  it('ba biển gỗ quay mặt về cổng, bác An và bàn chép sổ ở khu trung tâm; chỗ xuất hiện ngay phía nam các biển', () => {
    expect(L.boards.map((b) => b.level)).toEqual([1, 2, 3]);
    for (const b of L.boards) {
      expect(Math.cos(b.yaw)).toBeCloseTo(-1, 6); // mặt trước quay về −Z (phía cổng)
      expect(Math.hypot(b.x, b.z + 88)).toBeLessThan(10);
    }
    expect(Math.hypot(L.guide.x, L.guide.z + 88)).toBeLessThan(10);
    expect(L.start.z).toBeLessThan(Math.min(...L.boards.map((b) => b.z)));
    expect(Math.hypot(L.start.x - L.boards[1].x, L.start.z - L.boards[1].z)).toBeLessThan(8);
    expect(props('ban-chep')).toHaveLength(1);
  });

  it('6 dân làng đi lại giữa các khu; mọi vòng đi có từ 4 điểm', () => {
    expect(L.villagers).toHaveLength(6);
    for (const v of L.villagers!) expect(v.length).toBeGreaterThanOrEqual(4);
  });

  it('mọi món nằm trong lũy tre (kể cả cỡ chân), cổng ở đầu đường', () => {
    for (const s of spots()) expect(Math.hypot(s.x, s.z) + s.r, `${s.name} (${s.x.toFixed(1)}, ${s.z.toFixed(1)})`).toBeLessThanOrEqual(GIAY_WALL_RADIUS - 0.8);
    for (const p of L.ponds!) expect(Math.hypot(p.x, p.z) + p.r + 1.3).toBeLessThan(GIAY_WALL_RADIUS);
    for (const f of L.fields!) expect(Math.hypot(Math.abs(f.x) + f.hx, Math.abs(f.z) + f.hz)).toBeLessThan(GIAY_WALL_RADIUS - 2);
  });
});

describe('Làng Giấy: không đè nhau, đi lại được', () => {
  it('không món nào đè lên món khác (vòng tròn bao chân không chồng nhau, trừ khóm hoa)', () => {
    const list = spots();
    const bad: string[] = [];
    for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
      const a = list[i];
      const b = list[j];
      const d = Math.hypot(a.x - b.x, a.z - b.z);
      if (d < a.r + b.r - 0.35) bad.push(`${a.name} (${a.x.toFixed(1)}, ${a.z.toFixed(1)}) và ${b.name} (${b.x.toFixed(1)}, ${b.z.toFixed(1)}): cách ${d.toFixed(2)} < ${(a.r + b.r).toFixed(2)}`);
    }
    expect(bad).toEqual([]);
  });

  it('ao: các vũng nối liền nhau thành một khối; ruộng không đè ao hay nhà', () => {
    const ponds = L.ponds!;
    const adjacent = (a: (typeof ponds)[number], b: (typeof ponds)[number]) => Math.hypot(a.x - b.x, a.z - b.z) < a.r + b.r;
    const seen = new Set([0]);
    for (const q = [0]; q.length; ) {
      const i = q.pop()!;
      ponds.forEach((p, j) => {
        if (!seen.has(j) && adjacent(ponds[i], p)) (seen.add(j), q.push(j));
      });
    }
    expect(seen.size).toBe(ponds.length);
    for (const f of L.fields!) for (const s of spots()) expect(Math.abs(s.x - f.x) < f.hx + s.r && Math.abs(s.z - f.z) < f.hz + s.r, `${s.name} (${s.x.toFixed(1)}, ${s.z.toFixed(1)}) đè ruộng (${f.x}, ${f.z})`).toBe(false);
  });

  it('đi được từ chỗ xuất hiện tới: cả ba biển, bác An, bàn chép sổ, 4 thẻ, đình, giếng, chợ làng, cầu ao, xưởng, và ra cổng', () => {
    const g = reachableCells();
    const standNear = (x: number, z: number, r = 2.4) => g.near(x, z, r);
    for (const b of L.boards) expect(standNear(b.x + Math.sin(b.yaw) * 1.2, b.z + Math.cos(b.yaw) * 1.2, 1.6), `biển ${b.level}`).toBe(true);
    expect(standNear(L.guide.x, L.guide.z, 2.4), 'bác An').toBe(true);
    const desk = props('ban-chep')[0];
    expect(standNear(desk.x, desk.z, 3), 'bàn chép sổ').toBe(true);
    for (const s of L.scrolls!) expect(standNear(s.x, s.z, 1.8), `thẻ ${s.index}`).toBe(true);
    for (const t of [props('dinh')[0], ...L.placements.filter((p) => p.model === 'env/gieng-lang'), ...L.placements.filter((p) => p.model === 'env/leu-cho'), props('coi-gia')[0], props('bep-do')[0], props('be-ngam')[0]]) {
      const x = (t as { x: number }).x;
      const z = (t as { z: number }).z;
      expect(standNear(x, z, 6), `${(t as { model?: string; kind?: string }).model ?? (t as { kind?: string }).kind} ở (${x}, ${z})`).toBe(true);
    }
    const jetty = L.scatter!.find((p) => p.kind === 'cau-ao')!;
    expect(standNear(jetty.x, jetty.z, 3.4), 'cầu ao').toBe(true);
    expect(standNear(0, GIAY_GATE_Z - 3, 1.5), 'ngoài cổng').toBe(true);
    // phần lớn mặt đất trong lũy tre (không tính ao, nhà, đồi) đi được và liên thông: ít nhất 70% ô trong làng
    expect(g.reachedInside).toBeGreaterThan(Math.PI * (GIAY_WALL_RADIUS - 2) ** 2 * 0.62);
  });

  it('lũy tre kín: từ trong làng không đi ra ngoài được trừ qua cổng (điểm ngoài lũy cách xa cổng không với tới)', () => {
    const g = reachableCells(true); // bịt cổng: coi như không có lối ra (người chơi ra ngoài qua cổng rồi đi vòng bên ngoài lũy)
    for (let a = 0; a < 24; a++) {
      const ang = (a / 24) * Math.PI * 2;
      const x = Math.cos(ang) * (GIAY_WALL_RADIUS + 5);
      const z = Math.sin(ang) * (GIAY_WALL_RADIUS + 5);
      expect(g.near(x, z, 1.2), `điểm ngoài lũy ở góc ${a * 15}°`).toBe(false);
    }
  });

  it('đường nhỏ của mũi tên và vòng đi của dân làng không xuyên vật cản', () => {
    const bad: string[] = [];
    const walk = (ax: number, az: number, bx: number, bz: number, r: number, label: string) => {
      const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / 0.5));
      for (let i = 0; i <= n; i++) {
        const x = ax + ((bx - ax) * i) / n;
        const z = az + ((bz - az) * i) / n;
        if (blocked(x, z, r)) {
          bad.push(`${label} tại (${x.toFixed(1)}, ${z.toFixed(1)})`);
          return;
        }
      }
    };
    const byId = new Map(L.paths!.nodes.map((n) => [n.id, n]));
    for (const [a, b] of L.paths!.links) walk(byId.get(a)!.x, byId.get(a)!.z, byId.get(b)!.x, byId.get(b)!.z, 0.4, `đường ${a}-${b}`);
    L.paths!.scrollStands!.forEach((s, i) => walk(byId.get(s.join)!.x, byId.get(s.join)!.z, s.x, s.z, 0.4, `thẻ ${i}`));
    const gs = L.paths!.guideStand!;
    walk(byId.get(gs.join)!.x, byId.get(gs.join)!.z, gs.x, gs.z, 0.4, 'bác An');
    L.villagers!.forEach((loop, k) => {
      for (let i = 0; i < loop.length; i++) {
        const a = loop[i];
        const b = loop[(i + 1) % loop.length];
        walk(a[0], a[1], b[0], b[1], 0.45, `dân làng ${k}`);
      }
    });
    expect(bad).toEqual([]);
  });

  it('bốn thẻ ở bốn khu khác nhau và cách xa nhau (từ 60 trở lên); mỗi khu có tên khóa riêng', () => {
    const s = L.scrolls!;
    expect(s.map((q) => q.index)).toEqual([0, 1, 2, 3]);
    expect(new Set(s.map((q) => q.zone)).size).toBe(4);
    for (let i = 0; i < s.length; i++) for (let j = i + 1; j < s.length; j++) expect(Math.hypot(s[i].x - s[j].x, s[i].z - s[j].z), `${s[i].zone}-${s[j].zone}`).toBeGreaterThanOrEqual(60);
    expect(L.paths!.scrollStands).toHaveLength(4);
  });
});
