import { describe, expect, it } from 'vitest';
import { PEOPLE, modPow, publicKey } from '../../../lessons/bai-3/logic';
import { footprintRadiusOf } from '../../cho/footprints';
import { PROP_SIZES } from '../../cho/marketLayout';
import { assembleWorld } from '../worldLayout';
import { KHAC_DAU_GATE_Z, KHAC_DAU_HOUSE_COUNT, KHAC_DAU_RADIUS, KHAC_DAU_WALL_RADIUS, LANG_KHAC_DAU_LAYOUT as L, STAMP_BOARD_KEYS } from './khac-dau';
import { layoutSpots, pathLength, probeOf, reachGrid } from './villageChecks';

const probe = probeOf(L);
const blocked = probe.blocked;
const props = (k: string) => L.props.filter((p) => p.kind === k);
const scatterOf = (k: string) => (L.scatter ?? []).filter((p) => p.kind === k);
const count = (m: string) => L.placements.filter((p) => p.model === m).length;

/** Vòng tròn bao chân của mọi món (kể cả chú Dũng). Mái che, gà và đồ không vật cản (chân, mặt nước, cuốn sổ, hoa) không tính chỗ chiếm: mái che phủ lên cả dãy bàn bên dưới. */
const spots = () => layoutSpots(L, [{ name: 'chu-dung', x: L.guide.x, z: L.guide.z, r: 0.45 }], ['chan', 'nuoc', 'so-chung', 'hoa', 'mai-che']);
const reachableCells = (plugGate = false) => reachGrid(L, blocked, KHAC_DAU_WALL_RADIUS, KHAC_DAU_GATE_Z, plugGate);

/** Tốc độ đi bộ của người chơi (đơn vị mỗi giây) để đổi quãng đường ra giây (khớp con số ở spec 05: 32,7 đơn vị = 8 giây). */
const WALK = 4.1;

describe('Làng Khắc Dấu (mốc 3, bước L3): quy mô và bố cục', () => {
  it('bán kính 125, cổng ở (0, −125) nên tâm làng cách chợ 197 (cổng ở 72); lũy tre bao quanh', () => {
    expect(L.radius).toBe(KHAC_DAU_RADIUS);
    expect(KHAC_DAU_RADIUS).toBe(125);
    expect(L.gate).toEqual({ model: 'env/cong-lang-khac-dau', x: 0, z: KHAC_DAU_GATE_Z, yaw: Math.PI });
    expect(L.wall).toEqual({ radius: KHAC_DAU_WALL_RADIUS, gap: 9.5 });
    expect(scatterOf('tre').filter((p) => Math.abs(Math.hypot(p.x, p.z) - KHAC_DAU_WALL_RADIUS) < 2.5).length).toBeGreaterThan(200);
  });

  it('khu nhà ở 25 đến 35 nhà (ngói và tranh); đình, 2 giếng, cây đa, vườn cây, đồi tre, ruộng', () => {
    expect(KHAC_DAU_HOUSE_COUNT).toBeGreaterThanOrEqual(25);
    expect(KHAC_DAU_HOUSE_COUNT).toBeLessThanOrEqual(35);
    expect(count('env/nha-mai-ngoi')).toBeGreaterThan(8);
    expect(count('env/nha-mai-tranh')).toBeGreaterThan(8);
    expect(props('dinh')).toHaveLength(1);
    expect(count('env/gieng-lang')).toBeGreaterThanOrEqual(2);
    expect(count('env/cay-da')).toBeGreaterThanOrEqual(2);
    expect(scatterOf('cay-qua').length).toBeGreaterThanOrEqual(15);
    expect(scatterOf('doi').length).toBeGreaterThanOrEqual(4);
    expect(L.fields!.length).toBeGreaterThanOrEqual(4);
    for (const f of L.fields!) expect(f.kind).toBe('lua'); // "dùng ruộng chung" (ruộng lúa)
  });

  it('sân máy soi dấu quanh (0, −85): máy bằng đồng ở giữa sân, ba biển gỗ quay mặt về cổng, chú Dũng đứng cạnh máy, chỗ xuất hiện ngay phía nam các biển', () => {
    const yard = L.yards.find((y) => y.kind === 'gach')!;
    expect(Math.hypot(yard.x, yard.z + 85)).toBeLessThan(1);
    expect(yard.r).toBeGreaterThanOrEqual(13);
    const machine = props('may-soi-dau');
    expect(machine).toHaveLength(1);
    expect(Math.hypot(machine[0].x - yard.x, machine[0].z - yard.z)).toBeLessThan(yard.r - 5);
    expect(Math.cos(machine[0].yaw)).toBeCloseTo(-1, 6); // mặt khe nhận thư quay về cổng
    expect(L.boards.map((b) => b.level)).toEqual([7, 8, 9]);
    for (const b of L.boards) {
      expect(Math.cos(b.yaw)).toBeCloseTo(-1, 6); // mặt trước quay về −Z (phía cổng)
      expect(Math.hypot(b.x - yard.x, b.z - yard.z)).toBeLessThan(yard.r);
    }
    expect(L.guide.character).toBe('chuDung');
    expect(Math.hypot(L.guide.x - machine[0].x, L.guide.z - machine[0].z)).toBeLessThan(6);
    expect(Math.hypot(L.guide.x - yard.x, L.guide.z - yard.z)).toBeLessThan(yard.r);
    expect(L.start.z).toBeLessThan(Math.min(...L.boards.map((b) => b.z)));
    expect(Math.hypot(L.start.x - L.boards[1].x, L.start.z - L.boards[1].z)).toBeLessThan(8);
    expect(props('ban-da').length).toBeGreaterThanOrEqual(8);
  });

  it('xưởng khắc dấu (đông nam): hai mái che với dãy bàn đá khắc, khối đá, phôi gỗ, hòm; ba nhà xưởng', () => {
    const shelters = props('mai-che');
    expect(shelters).toHaveLength(2);
    for (const s of shelters) {
      expect(s.x).toBeGreaterThan(40);
      expect(s.z).toBeLessThan(-50);
      // mỗi mái che phủ ít nhất ba bàn đá khắc
      const hx = PROP_SIZES['mai-che'].box!.hx;
      const hz = PROP_SIZES['mai-che'].box!.hz;
      expect(props('ban-da').filter((t) => Math.abs(t.x - s.x) < hx && Math.abs(t.z - s.z) < hz).length, `bàn dưới mái che (${s.x}, ${s.z})`).toBeGreaterThanOrEqual(3);
    }
    expect(props('khoi-da').length).toBeGreaterThanOrEqual(6);
    expect(props('phoi-go').length).toBeGreaterThanOrEqual(3);
    expect(props('hom').length).toBeGreaterThanOrEqual(3);
    const workshopHouses = L.placements.filter((p) => p.model.startsWith('env/nha-mai') && p.x > 40 && p.z < -50);
    expect(workshopHouses.length).toBeGreaterThanOrEqual(2);
    expect(workshopHouses.length).toBeLessThanOrEqual(3);
  });

  it('đình làng (bắc) có bảng gỗ treo 6 tấm mẫu dấu công khai, đúng 6 người và số lấy từ bảng khóa của Bài 3', () => {
    const dinh = props('dinh')[0];
    expect(dinh.z).toBeGreaterThan(50);
    const board = props('bang-mau');
    expect(board).toHaveLength(1);
    expect(Math.hypot(board[0].x - dinh.x, board[0].z - dinh.z)).toBeLessThan(30);
    const gach = L.yards.filter((y) => y.kind === 'gach');
    expect(gach.length).toBeGreaterThanOrEqual(2); // sân máy và sân đình
    expect(gach.some((y) => Math.hypot(y.x - dinh.x, y.z - dinh.z) < y.r)).toBe(true);
    // bảng quay mặt về phía đường (người đi tới từ phía nam nhìn thấy mặt có số)
    expect(Math.cos(board[0].yaw)).toBeLessThan(0);
    expect(STAMP_BOARD_KEYS).toHaveLength(6);
    expect(STAMP_BOARD_KEYS).toEqual(PEOPLE.map((p) => p.publicKey));
    expect(STAMP_BOARD_KEYS).toEqual([18, 19, 15, 7, 14, 21]); // đúng bảng khóa dùng chung cả làng (spec 07)
    for (const p of PEOPLE) expect(publicKey(p.privateKey), p.id).toBe(p.publicKey);
    for (const p of PEOPLE) expect(modPow(5, p.privateKey, 23), p.id).toBe(p.publicKey);
    expect(new Set(STAMP_BOARD_KEYS).size).toBe(6);
  });

  it('trạm đưa thư (tây): nhà trạm, hòm thư, giá xếp thư, bàn chép, chuồng bồ câu', () => {
    const near = (p: { x: number; z: number }) => Math.hypot(p.x + 62, p.z - 8) < 30;
    expect(props('hom-thu').filter(near).length).toBeGreaterThanOrEqual(2);
    expect(props('gia-thu').filter(near).length).toBeGreaterThanOrEqual(2);
    expect(props('chuong-bo-cau').filter(near).length).toBeGreaterThanOrEqual(2);
    expect(props('ban-chep').filter(near).length).toBeGreaterThanOrEqual(1);
    expect(L.placements.some((p) => p.model.startsWith('env/nha-mai') && Math.hypot(p.x + 62, p.z - 24) < 3 && p.scale > 1.1)).toBe(true); // nhà trạm to hơn nhà thường
  });

  it('bãi đá (tây bắc, gần rìa): khối đá lớn nhỏ, phiến đá đang xẻ, đồi đá thấp màu xám', () => {
    const near = (p: { x: number; z: number }) => Math.hypot(p.x + 82, p.z - 58) < 24;
    expect(props('phien-da').filter(near).length).toBeGreaterThanOrEqual(2);
    const rocks = props('khoi-da').filter(near);
    expect(rocks.length).toBeGreaterThanOrEqual(8);
    expect(Math.max(...rocks.map((r) => r.scale))).toBeGreaterThanOrEqual(2);
    expect(Math.min(...rocks.map((r) => r.scale))).toBeLessThanOrEqual(1);
    const grey = scatterOf('doi').filter((h) => Math.abs(h.tint[0] - h.tint[1]) < 0.05 && h.tint[0] > 0.4);
    expect(grey.length).toBeGreaterThanOrEqual(2);
    for (const h of grey) expect(Math.hypot(h.x, h.z)).toBeGreaterThan(95); // gần rìa
  });

  it('chuồng gà gần cổng, bên trong lũy tre: chuồng tre và đàn gà (đàn gà của màn 9)', () => {
    const coop = props('chuong-ga');
    expect(coop).toHaveLength(1);
    expect(Math.hypot(coop[0].x, coop[0].z - KHAC_DAU_GATE_Z)).toBeLessThan(40);
    expect(Math.hypot(coop[0].x, coop[0].z) + PROP_SIZES['chuong-ga'].r).toBeLessThan(KHAC_DAU_WALL_RADIUS - 1);
    const hens = props('ga');
    expect(hens.length).toBeGreaterThanOrEqual(3);
    for (const h of hens) expect(Math.hypot(h.x - coop[0].x, h.z - coop[0].z)).toBeLessThan(14);
  });

  it('6 dân làng đi lại giữa các khu; mọi vòng đi có từ 4 điểm', () => {
    expect(L.villagers).toHaveLength(6);
    for (const v of L.villagers!) expect(v.length).toBeGreaterThanOrEqual(4);
  });

  it('mọi món nằm trong lũy tre (kể cả cỡ chân), cổng ở đầu đường', () => {
    for (const s of spots()) expect(Math.hypot(s.x, s.z) + s.r, `${s.name} (${s.x.toFixed(1)}, ${s.z.toFixed(1)})`).toBeLessThanOrEqual(KHAC_DAU_WALL_RADIUS - 0.8);
    for (const p of props('mai-che')) expect(Math.hypot(p.x, p.z) + PROP_SIZES['mai-che'].r).toBeLessThanOrEqual(KHAC_DAU_WALL_RADIUS - 0.8);
    for (const f of L.fields!) expect(Math.hypot(Math.abs(f.x) + f.hx, Math.abs(f.z) + f.hz)).toBeLessThan(KHAC_DAU_WALL_RADIUS - 2);
  });
});

describe('Làng Khắc Dấu: không đè nhau, đi lại được', () => {
  it('không món nào đè lên món khác (vòng tròn bao chân không chồng nhau, trừ khóm hoa và mái che)', () => {
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

  it('ruộng không đè nhà hay đồ khác', () => {
    for (const f of L.fields!)
      for (const s of spots()) {
        const dx = s.x - f.x;
        const dz = s.z - f.z;
        const lx = dx * Math.cos(f.yaw) - dz * Math.sin(f.yaw);
        const lz = dx * Math.sin(f.yaw) + dz * Math.cos(f.yaw);
        expect(Math.abs(lx) < f.hx + s.r && Math.abs(lz) < f.hz + s.r, `${s.name} (${s.x.toFixed(1)}, ${s.z.toFixed(1)}) đè ruộng (${f.x}, ${f.z})`).toBe(false);
      }
  });

  it('đi được từ chỗ xuất hiện tới: cả ba biển, chú Dũng, máy soi dấu, 4 thẻ, bảng mẫu dấu, đình, giếng, từng bàn thợ, chuồng gà, hòm thư, giá thư, chuồng bồ câu, phiến đá, và ra cổng', () => {
    const g = reachableCells();
    const standNear = (x: number, z: number, r = 2.4) => g.near(x, z, r);
    for (const b of L.boards) expect(standNear(b.x + Math.sin(b.yaw) * 1.2, b.z + Math.cos(b.yaw) * 1.2, 1.6), `biển ${b.level}`).toBe(true);
    expect(standNear(L.guide.x, L.guide.z, 2.4), 'chú Dũng').toBe(true);
    const machine = props('may-soi-dau')[0];
    expect(standNear(machine.x, machine.z, 4.2), 'máy soi dấu').toBe(true);
    for (const s of L.scrolls!) expect(standNear(s.x, s.z, 1.8), `thẻ ${s.index}`).toBe(true);
    const board = props('bang-mau')[0];
    expect(standNear(board.x + Math.sin(board.yaw) * 2.2, board.z + Math.cos(board.yaw) * 2.2, 2), 'trước bảng mẫu dấu').toBe(true);
    for (const t of [props('dinh')[0], ...L.placements.filter((p) => p.model === 'env/gieng-lang'), ...props('chuong-ga'), ...props('chuong-bo-cau'), ...props('hom-thu'), ...props('gia-thu'), ...props('phien-da'), ...props('ban-chep')]) {
      const x = (t as { x: number }).x;
      const z = (t as { z: number }).z;
      expect(standNear(x, z, 6), `${(t as { model?: string; kind?: string }).model ?? (t as { kind?: string }).kind} ở (${x.toFixed(1)}, ${z.toFixed(1)})`).toBe(true);
    }
    for (const t of props('ban-da')) expect(standNear(t.x, t.z, 4), `bàn đá ở (${t.x.toFixed(1)}, ${t.z.toFixed(1)})`).toBe(true);
    for (const t of props('mai-che')) expect(standNear(t.x, t.z, 6), `mái che ở (${t.x.toFixed(1)}, ${t.z.toFixed(1)})`).toBe(true);
    expect(standNear(0, KHAC_DAU_GATE_Z - 3, 1.5), 'ngoài cổng').toBe(true);
    // phần lớn mặt đất trong lũy tre (không tính nhà, đồi) đi được và liên thông
    expect(g.reachedInside).toBeGreaterThan(Math.PI * (KHAC_DAU_WALL_RADIUS - 2) ** 2 * 0.62);
  });

  it('lũy tre kín: từ trong làng không đi ra ngoài được trừ qua cổng (điểm ngoài lũy cách xa cổng không với tới)', () => {
    const g = reachableCells(true);
    for (let a = 0; a < 24; a++) {
      const ang = (a / 24) * Math.PI * 2;
      const x = Math.cos(ang) * (KHAC_DAU_WALL_RADIUS + 5);
      const z = Math.sin(ang) * (KHAC_DAU_WALL_RADIUS + 5);
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
    walk(byId.get(gs.join)!.x, byId.get(gs.join)!.z, gs.x, gs.z, 0.4, 'chú Dũng');
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

describe('Làng Khắc Dấu: thẻ "Em có biết?" và quãng đường', () => {
  it('bốn thẻ ở bốn khu khác nhau (xưởng khắc dấu, đình làng, trạm đưa thư, bãi đá) và cách xa nhau (từ 60 trở lên)', () => {
    const s = L.scrolls!;
    expect(s.map((q) => q.index)).toEqual([0, 1, 2, 3]);
    expect(s.map((q) => q.zone)).toEqual(['xuongdau', 'dinhlang', 'tramthu', 'baida']);
    for (let i = 0; i < s.length; i++) for (let j = i + 1; j < s.length; j++) expect(Math.hypot(s[i].x - s[j].x, s[i].z - s[j].z), `${s[i].zone}-${s[j].zone}`).toBeGreaterThanOrEqual(60);
    expect(L.paths!.scrollStands).toHaveLength(4);
  });

  it('đường đi từ cổng tới chỗ đứng trước biển giữa khoảng 8 giây đi bộ; thẻ xa nhất không quá 240 đơn vị đường đi', () => {
    const gate = L.gate;
    const byId = new Map(L.paths!.nodes.map((n) => [n.id, n]));
    const entry = byId.get(L.paths!.entry)!;
    const toEntry = Math.hypot(entry.x - gate.x, entry.z - gate.z);
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

describe('Làng Khắc Dấu ở thế giới mở: đổi sang tọa độ thế giới giữ nguyên các thuộc tính', () => {
  const world = assembleWorld();
  const village = world.villages.find((v) => v.id === 'lang-khac-dau')!;

  it('tâm làng cách chợ 197, cổng cách chợ 72; viền lũy tre nét liền (có `wall`), không còn đồ đất hoang quanh làng này', () => {
    expect(Math.hypot(village.center.x, village.center.z)).toBeCloseTo(197, 6);
    expect(Math.hypot(village.gate.x, village.gate.z)).toBeCloseTo(72, 6);
    expect(village.layout.wall).toEqual({ radius: KHAC_DAU_WALL_RADIUS, gap: 9.5, center: { x: village.center.x, z: village.center.z } });
    const inside = (x: number, z: number) => Math.hypot(x - village.center.x, z - village.center.z) < KHAC_DAU_WALL_RADIUS + 20;
    expect(world.wild.filter((p) => inside(p.x, p.z))).toHaveLength(0);
  });

  it('sân gạch, 3 biển, chú Dũng, máy soi dấu, bảng mẫu dấu, 4 thẻ đi theo bố cục làng', () => {
    expect(village.layout.yards.filter((y) => y.kind === 'gach').length).toBeGreaterThanOrEqual(2);
    expect(village.layout.boards.map((b) => b.level)).toEqual([7, 8, 9]);
    expect(village.layout.guide!.character).toBe('chuDung');
    expect(village.layout.props.filter((p) => p.kind === 'may-soi-dau')).toHaveLength(1);
    expect(village.layout.props.filter((p) => p.kind === 'bang-mau')).toHaveLength(1);
    expect(village.layout.scrolls).toHaveLength(4);
    // vật cản của máy soi dấu và bảng mẫu dấu có thật
    expect(village.layout.obstacles.length).toBeGreaterThan(L.placements.length);
  });

  it('bản đồ: đường nhỏ có nút thẻ `scroll:lang-khac-dau:<số>` và biển 7, 8, 9 nối vào đồ thị thế giới', () => {
    const ids = new Set(world.graph.nodes.map((n) => n.id));
    for (let i = 0; i < 4; i++) expect(ids.has(`scroll:lang-khac-dau:${i}`)).toBe(true);
    expect(ids.has('board:7') && ids.has('board:8') && ids.has('board:9')).toBe(true);
    expect(ids.has('guide:lang-khac-dau')).toBe(true);
  });

  it('mọi món nhỏ mới có cỡ trong PROP_SIZES; chân nhà (nhà ngói, nhà tranh) có footprint', () => {
    for (const k of ['may-soi-dau', 'bang-mau', 'phien-da', 'mai-che', 'phoi-go', 'hom-thu', 'gia-thu', 'chuong-bo-cau', 'chuong-ga', 'ga'] as const) expect(PROP_SIZES[k].h, k).toBeGreaterThan(0.5);
    expect(footprintRadiusOf('env/nha-mai-ngoi')).toBeGreaterThan(1);
  });
});
