import { describe, expect, it } from 'vitest';
import { footprintRadiusOf } from '../../cho/footprints';
import { MODEL_LOOM } from '../../cho/marketLayout';
import { assembleWorld } from '../worldLayout';
import { DET_GATE_Z, DET_HOUSE_COUNT, DET_RADIUS, DET_WALL_RADIUS, LANG_DET_LAYOUT as L } from './det';
import { layoutSpots, pathLength, probeOf, reachGrid } from './villageChecks';

const probe = probeOf(L);
const blocked = probe.blocked;
const props = (k: string) => L.props.filter((p) => p.kind === k);
const scatterOf = (k: string) => (L.scatter ?? []).filter((p) => p.kind === k);
const count = (m: string) => L.placements.filter((p) => p.model === m).length;

/** Vòng tròn bao chân của mọi món (kể cả cụ Bình và cô Chi). */
const spots = () => layoutSpots(L, [{ name: 'cu-binh', x: L.guide.x, z: L.guide.z, r: 0.45 }, ...(L.companions ?? []).map((c) => ({ name: c.character, x: c.x, z: c.z, r: 0.45 }))]);
const reachableCells = (plugGate = false) => reachGrid(L, blocked, DET_WALL_RADIUS, DET_GATE_Z, plugGate);

/** Tốc độ đi bộ và chạy của người chơi (đơn vị mỗi giây) để đổi quãng đường ra giây (khớp con số ở spec 05: 32,7 đơn vị = 8 giây). */
const WALK = 4.1;

describe('Làng Dệt (mốc 3, bước L1): quy mô và bố cục', () => {
  it('bán kính 125, cổng ở (0, −125) nên tâm làng cách chợ 197 (cổng ở 72); lũy tre bao quanh', () => {
    expect(L.radius).toBe(DET_RADIUS);
    expect(DET_RADIUS).toBe(125);
    expect(L.gate).toEqual({ model: 'env/cong-lang-det', x: 0, z: DET_GATE_Z, yaw: Math.PI });
    expect(L.wall).toEqual({ radius: DET_WALL_RADIUS, gap: 9.5 });
    expect(scatterOf('tre').filter((p) => Math.abs(Math.hypot(p.x, p.z) - DET_WALL_RADIUS) < 2.5).length).toBeGreaterThan(200);
  });

  it('khu nhà ở 25 đến 35 nhà (nhà ngói và nhà tranh); đình, 2 giếng, 5 lều chợ vải, cây đa, ao nhuộm, cầu ao, vườn cây, đồi tre', () => {
    expect(DET_HOUSE_COUNT).toBeGreaterThanOrEqual(25);
    expect(DET_HOUSE_COUNT).toBeLessThanOrEqual(35);
    expect(count('env/nha-mai-ngoi')).toBeGreaterThan(8);
    expect(count('env/nha-mai-tranh')).toBeGreaterThan(8);
    expect(props('dinh')).toHaveLength(1);
    expect(count('env/gieng-lang')).toBeGreaterThanOrEqual(2);
    expect(count('env/leu-cho')).toBeGreaterThanOrEqual(4);
    expect(count('env/leu-cho')).toBeLessThanOrEqual(5);
    expect(count('env/cay-da')).toBeGreaterThanOrEqual(2);
    expect(L.ponds!.length).toBeGreaterThanOrEqual(3);
    expect(L.ponds!.some((p) => p.water)).toBe(true); // nước chàm, nước đỏ
    expect(scatterOf('cau-ao')).toHaveLength(1);
    expect(scatterOf('cay-qua').length).toBeGreaterThanOrEqual(15);
    expect(scatterOf('doi').length).toBeGreaterThanOrEqual(4);
  });

  it('bãi phơi vải: 30 sào dựng bằng code, chum nhuộm chàm và đỏ, đống sợi, sào phơi sợi; sân phơi rộng', () => {
    expect(scatterOf('sao-vai')).toHaveLength(30);
    expect(props('chum-cham').length).toBeGreaterThanOrEqual(4);
    expect(props('chum-do').length).toBeGreaterThanOrEqual(3);
    expect(props('dong-soi').length).toBeGreaterThanOrEqual(3);
    expect(props('sao-soi').length).toBeGreaterThanOrEqual(4);
    expect(L.yards.reduce((m, y) => Math.max(m, y.r), 0)).toBeGreaterThanOrEqual(20);
  });

  it('xóm khung cửi: khung cửi tối đa 8 cả làng (trong làng 7, cộng 1 cái trang trí ngoài cổng), đặt trước hiên của nhà; có giá cuộn vải', () => {
    const looms = L.placements.filter((p) => p.model === MODEL_LOOM);
    expect(looms.length).toBeGreaterThanOrEqual(5);
    expect(looms.length).toBeLessThanOrEqual(7);
    // mỗi khung cửi nằm sát một nhà (cách tâm nhà không quá 6,5): "dưới hiên"
    const houses = L.placements.filter((p) => p.model.startsWith('env/nha-mai'));
    for (const lm of looms) expect(Math.min(...houses.map((h) => Math.hypot(h.x - lm.x, h.z - lm.z) - footprintRadiusOf(h.model) * h.scale)), `khung cửi (${lm.x.toFixed(1)}, ${lm.z.toFixed(1)})`).toBeLessThan(2.4);
    expect(props('gia-vai').length).toBeGreaterThanOrEqual(5);
    // cả thế giới (kể cả đồ trang trí ngoài cổng) không quá 8 khung cửi
    const det = assembleWorld().villages.find((v) => v.id === 'lang-det')!;
    expect(det.layout.placements.filter((p) => p.model === MODEL_LOOM).length).toBeLessThanOrEqual(8);
  });

  it('chợ vải nhỏ và ruộng dâu: sạp vải có cuộn nằm ngang, không còn cuộn đứng; 6 ruộng dâu, mỗi ruộng nhiều luống bụi thấp (đi qua được)', () => {
    expect(props('sap-vai').length).toBeGreaterThanOrEqual(2);
    expect(props('vai')).toHaveLength(0);
    expect(L.fields!.length).toBeGreaterThanOrEqual(5);
    for (const f of L.fields!) expect(f.kind).toBe('dau');
    const rows = scatterOf('luong-dau');
    expect(rows.length).toBeGreaterThanOrEqual(40);
    for (const r of rows) expect(r.collide).toBe(false);
    // mỗi luống nằm trong ruộng của nó
    for (const r of rows) {
      const inField = L.fields!.some((f) => {
        const dx = r.x - f.x;
        const dz = r.z - f.z;
        const lx = dx * Math.cos(f.yaw) - dz * Math.sin(f.yaw);
        const lz = dx * Math.sin(f.yaw) + dz * Math.cos(f.yaw);
        return Math.abs(lx) <= f.hx + 0.01 && Math.abs(lz) <= f.hz + 0.01;
      });
      expect(inField, `luống (${r.x.toFixed(1)}, ${r.z.toFixed(1)})`).toBe(true);
    }
  });

  it('sân đình lát gạch quanh (0, −85); ba biển gỗ quay mặt về cổng, bàn đặt Sổ Chung, cụ Bình và cô Chi ở sân; chỗ xuất hiện ngay phía nam các biển', () => {
    const yard = L.yards.find((y) => y.kind === 'gach')!;
    expect(yard).toBeDefined();
    expect(Math.hypot(yard.x, yard.z + 85)).toBeLessThan(1);
    expect(yard.r).toBeGreaterThanOrEqual(13);
    expect(L.boards.map((b) => b.level)).toEqual([4, 5, 6]);
    for (const b of L.boards) {
      expect(Math.cos(b.yaw)).toBeCloseTo(-1, 6); // mặt trước quay về −Z (phía cổng)
      expect(Math.hypot(b.x - yard.x, b.z - yard.z)).toBeLessThan(yard.r);
    }
    expect(L.guide.character).toBe('cuBinh');
    expect(L.companions!.map((c) => c.character)).toEqual(['coChi']);
    for (const q of [L.guide, ...L.companions!]) expect(Math.hypot(q.x - yard.x, q.z - yard.z)).toBeLessThan(yard.r);
    expect(L.start.z).toBeLessThan(Math.min(...L.boards.map((b) => b.z)));
    expect(Math.hypot(L.start.x - L.boards[1].x, L.start.z - L.boards[1].z)).toBeLessThan(8);
    expect(props('ban-chep')).toHaveLength(1);
    expect(props('so-chung')).toHaveLength(1);
  });

  it('6 dân làng đi lại giữa các khu; mọi vòng đi có từ 4 điểm', () => {
    expect(L.villagers).toHaveLength(6);
    for (const v of L.villagers!) expect(v.length).toBeGreaterThanOrEqual(4);
  });

  it('mọi món nằm trong lũy tre (kể cả cỡ chân), cổng ở đầu đường', () => {
    for (const s of spots()) expect(Math.hypot(s.x, s.z) + s.r, `${s.name} (${s.x.toFixed(1)}, ${s.z.toFixed(1)})`).toBeLessThanOrEqual(DET_WALL_RADIUS - 0.8);
    for (const p of L.ponds!) expect(Math.hypot(p.x, p.z) + p.r + 1.3).toBeLessThan(DET_WALL_RADIUS);
    for (const f of L.fields!) expect(Math.hypot(Math.abs(f.x) + f.hx, Math.abs(f.z) + f.hz)).toBeLessThan(DET_WALL_RADIUS - 2);
  });
});

describe('Làng Dệt: không đè nhau, đi lại được', () => {
  it('không món nào đè lên món khác (vòng tròn bao chân không chồng nhau, trừ khóm hoa)', () => {
    const list = spots();
    const bad: string[] = [];
    for (let i = 0; i < list.length; i++)
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i];
        const b = list[j];
        const d = Math.hypot(a.x - b.x, a.z - b.z);
        if (d < a.r + b.r - 0.35) bad.push(`${a.name} (${a.x.toFixed(1)}, ${a.z.toFixed(1)}) và ${b.name} (${b.x.toFixed(1)}, ${b.z.toFixed(1)}): cách ${d.toFixed(2)} < ${(a.r + b.r).toFixed(2)}`);
      }
    expect(bad).toEqual([]);
  });

  it('ao: các vũng nối liền nhau thành một khối; ruộng không đè ao, nhà hay đồ khác', () => {
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
    for (const f of L.fields!)
      for (const s of spots()) {
        // ruộng xoay `yaw` nhỏ: đủ chính xác khi so trong hệ ruộng
        const dx = s.x - f.x;
        const dz = s.z - f.z;
        const lx = dx * Math.cos(f.yaw) - dz * Math.sin(f.yaw);
        const lz = dx * Math.sin(f.yaw) + dz * Math.cos(f.yaw);
        expect(Math.abs(lx) < f.hx + s.r && Math.abs(lz) < f.hz + s.r, `${s.name} (${s.x.toFixed(1)}, ${s.z.toFixed(1)}) đè ruộng (${f.x}, ${f.z})`).toBe(false);
      }
    for (const p of ponds) for (const f of L.fields!) expect(Math.hypot(p.x - f.x, p.z - f.z), 'ao và ruộng').toBeGreaterThan(p.r);
  });

  it('đi được từ chỗ xuất hiện tới: cả ba biển, cụ Bình, cô Chi, bàn, 4 thẻ, đình, giếng, lều, từng khung cửi, cầu ao, từng sào vải, ao, và ra cổng', () => {
    const g = reachableCells();
    const standNear = (x: number, z: number, r = 2.4) => g.near(x, z, r);
    for (const b of L.boards) expect(standNear(b.x + Math.sin(b.yaw) * 1.2, b.z + Math.cos(b.yaw) * 1.2, 1.6), `biển ${b.level}`).toBe(true);
    expect(standNear(L.guide.x, L.guide.z, 2.4), 'cụ Bình').toBe(true);
    for (const c of L.companions!) expect(standNear(c.x, c.z, 2.4), 'cô Chi').toBe(true);
    const desk = props('ban-chep')[0];
    expect(standNear(desk.x, desk.z, 3), 'bàn đặt Sổ Chung').toBe(true);
    for (const s of L.scrolls!) expect(standNear(s.x, s.z, 1.8), `thẻ ${s.index}`).toBe(true);
    for (const t of [props('dinh')[0], ...L.placements.filter((p) => p.model === 'env/gieng-lang'), ...L.placements.filter((p) => p.model === 'env/leu-cho'), ...L.placements.filter((p) => p.model === MODEL_LOOM)]) {
      const x = (t as { x: number }).x;
      const z = (t as { z: number }).z;
      expect(standNear(x, z, 6), `${(t as { model?: string; kind?: string }).model ?? (t as { kind?: string }).kind} ở (${x.toFixed(1)}, ${z.toFixed(1)})`).toBe(true);
    }
    for (const t of [...props('chum-cham'), ...props('chum-do'), ...props('dong-soi'), ...props('sao-soi'), ...props('gia-vai')]) expect(standNear(t.x, t.z, 5), `${t.kind} ở (${t.x.toFixed(1)}, ${t.z.toFixed(1)})`).toBe(true);
    for (const t of scatterOf('sao-vai')) expect(standNear(t.x, t.z, 5), `sào vải ở (${t.x.toFixed(1)}, ${t.z.toFixed(1)})`).toBe(true);
    const jetty = L.scatter!.find((p) => p.kind === 'cau-ao')!;
    expect(standNear(jetty.x, jetty.z, 3.4), 'cầu ao').toBe(true);
    for (const p of L.ponds!) expect(standNear(p.x + p.r + 0.5, p.z, 12) || standNear(p.x - p.r - 0.5, p.z, 12) || standNear(p.x, p.z + p.r + 0.5, 12), 'bờ ao').toBe(true);
    expect(standNear(0, DET_GATE_Z - 3, 1.5), 'ngoài cổng').toBe(true);
    // phần lớn mặt đất trong lũy tre (không tính ao, nhà, đồi) đi được và liên thông
    expect(g.reachedInside).toBeGreaterThan(Math.PI * (DET_WALL_RADIUS - 2) ** 2 * 0.62);
  });

  it('lũy tre kín: từ trong làng không đi ra ngoài được trừ qua cổng (điểm ngoài lũy cách xa cổng không với tới)', () => {
    const g = reachableCells(true);
    for (let a = 0; a < 24; a++) {
      const ang = (a / 24) * Math.PI * 2;
      const x = Math.cos(ang) * (DET_WALL_RADIUS + 5);
      const z = Math.sin(ang) * (DET_WALL_RADIUS + 5);
      expect(g.near(x, z, 1.2), `điểm ngoài lũy ở góc ${a * 15}°`).toBe(false);
    }
  });

  it('đường nhỏ của mũi tên và vòng đi của dân làng không xuyên vật cản; các nút liền nhau', () => {
    const bad: string[] = [];
    const walk = (ax: number, az: number, bx: number, bz: number, r: number, label: string) => {
      const hit = probe.firstBlocked(ax, az, bx, bz, r);
      if (hit) bad.push(`${label} tại (${hit.x.toFixed(1)}, ${hit.z.toFixed(1)})`);
    };
    const byId = new Map(L.paths!.nodes.map((n) => [n.id, n]));
    for (const [a, b] of L.paths!.links) walk(byId.get(a)!.x, byId.get(a)!.z, byId.get(b)!.x, byId.get(b)!.z, 0.4, `đường ${a}-${b}`);
    L.paths!.scrollStands!.forEach((s, i) => walk(byId.get(s.join)!.x, byId.get(s.join)!.z, s.x, s.z, 0.4, `thẻ ${i}`));
    const gs = L.paths!.guideStand!;
    walk(byId.get(gs.join)!.x, byId.get(gs.join)!.z, gs.x, gs.z, 0.4, 'cụ Bình');
    L.villagers!.forEach((loop, k) => {
      for (let i = 0; i < loop.length; i++) {
        const a = loop[i];
        const b = loop[(i + 1) % loop.length];
        walk(a[0], a[1], b[0], b[1], 0.45, `dân làng ${k}`);
      }
    });
    expect(bad).toEqual([]);
    // mọi nút nối được với nút vào làng
    for (const n of L.paths!.nodes) expect(pathLength(L.paths!, L.paths!.entry, n.id), `nút ${n.id}`).toBeLessThan(Infinity);
  });
});

describe('Làng Dệt: thẻ "Em có biết?" và quãng đường', () => {
  it('bốn thẻ ở bốn khu khác nhau (bãi phơi vải, xóm khung cửi, ao nhuộm, chợ vải) và cách xa nhau (từ 60 trở lên)', () => {
    const s = L.scrolls!;
    expect(s.map((q) => q.index)).toEqual([0, 1, 2, 3]);
    expect(s.map((q) => q.zone)).toEqual(['phoi', 'khungcui', 'aonhuom', 'chovai']);
    for (let i = 0; i < s.length; i++) for (let j = i + 1; j < s.length; j++) expect(Math.hypot(s[i].x - s[j].x, s[i].z - s[j].z), `${s[i].zone}-${s[j].zone}`).toBeGreaterThanOrEqual(60);
    expect(L.paths!.scrollStands).toHaveLength(4);
  });

  it('đường đi từ cổng tới sân đình khoảng 8 giây đi bộ; thẻ xa nhất không quá 240 đơn vị đường đi', () => {
    const gate = L.gate;
    const byId = new Map(L.paths!.nodes.map((n) => [n.id, n]));
    const entry = byId.get(L.paths!.entry)!;
    const toEntry = Math.hypot(entry.x - gate.x, entry.z - gate.z);
    // từ cổng tới chỗ đứng trước biển giữa (đường đi thật qua nút vào, đại lộ và nút trước biển)
    const stand = { x: L.boards[1].x + Math.sin(L.boards[1].yaw) * 1.2, z: L.boards[1].z + Math.cos(L.boards[1].yaw) * 1.2 };
    const join = byId.get(L.paths!.boardJoin)!;
    const toBoards = toEntry + pathLength(L.paths!, L.paths!.entry, L.paths!.boardJoin) + Math.hypot(stand.x - join.x, stand.z - join.z);
    expect(toBoards / WALK).toBeGreaterThan(6);
    expect(toBoards / WALK).toBeLessThan(10);
    let far = 0;
    L.paths!.scrollStands!.forEach((st) => {
      const j = byId.get(st.join)!;
      far = Math.max(far, toEntry + pathLength(L.paths!, L.paths!.entry, st.join) + Math.hypot(st.x - j.x, st.z - j.z));
    });
    expect(far).toBeLessThanOrEqual(240);
  });
});

describe('Làng Dệt ở thế giới mở: đổi sang tọa độ thế giới giữ nguyên các thuộc tính', () => {
  const det = assembleWorld().villages.find((v) => v.id === 'lang-det')!;
  const toWorld = (lx: number, lz: number) => ({ x: -lx, z: -lz - 197 }); // Làng Dệt quay 180° (cổng ở phía nam của chợ)

  it('tâm làng cách chợ 197 về phía nam, cổng cách chợ 72; viền lũy tre nét liền (có `wall`)', () => {
    expect(det.center.x).toBeCloseTo(0, 6);
    expect(det.center.z).toBeCloseTo(-197, 6);
    expect(det.gate.z).toBeCloseTo(-72, 6);
    expect(det.layout.wall).toEqual({ radius: DET_WALL_RADIUS, gap: 9.5, center: { x: det.center.x, z: det.center.z } });
  });

  it('sân gạch, ruộng dâu, nước ao nhuộm, người đứng yên và 3 biển đi theo bố cục làng', () => {
    const yard = det.layout.yards.find((y) => y.kind === 'gach')!;
    const p = toWorld(0, -85);
    expect(yard.x).toBeCloseTo(p.x, 6);
    expect(yard.z).toBeCloseTo(p.z, 6);
    expect(det.layout.fields!.every((f) => f.kind === 'dau')).toBe(true);
    expect(det.layout.ponds!.filter((q) => q.water).length).toBe(L.ponds!.filter((q) => q.water).length);
    const chi = det.layout.companions![0];
    const c = toWorld(L.companions![0].x, L.companions![0].z);
    expect(chi.x).toBeCloseTo(c.x, 6);
    expect(chi.z).toBeCloseTo(c.z, 6);
    expect(chi.character).toBe('coChi');
    // cô Chi có vật cản (người chơi không đi xuyên)
    expect(det.layout.obstacles.length).toBeGreaterThan(0);
    expect(det.layout.scrolls).toHaveLength(4);
    expect(det.layout.boards.map((b) => b.level)).toEqual([4, 5, 6]);
  });

  it('bản đồ: đường nhỏ có nút thẻ `scroll:lang-det:<số>` nối vào đồ thị thế giới', () => {
    const w = assembleWorld();
    const ids = new Set(w.graph.nodes.map((n) => n.id));
    for (let i = 0; i < 4; i++) expect(ids.has(`scroll:lang-det:${i}`)).toBe(true);
    expect(ids.has('board:4') && ids.has('board:5') && ids.has('board:6')).toBe(true);
    expect(ids.has('guide:lang-det')).toBe(true);
  });
});
