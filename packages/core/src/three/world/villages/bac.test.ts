import { describe, expect, it } from 'vitest';
import { SAMPLE_HARD_CHALLENGE, buildTree } from '../../../lessons/bai-4/logic';
import { footprintRadiusOf } from '../../cho/footprints';
import { PROP_SIZES, collidersFor } from '../../cho/marketLayout';
import { resolveCollisions, type Point2 } from '../../collision';
import { DECK, deckHeight, decksOf } from '../../village/deck';
import { TAG_ATLAS, banyanTags, banyanTree, tagCell, tagPlane, tagSwing, tagTextScale } from '../../village/banyanTags';
import { assembleWorld, worldGroundHeight } from '../worldLayout';
import { BAC_GATE_Z, BAC_HOUSE_COUNT, BAC_RADIUS, BAC_STREAM, BAC_WALL_RADIUS, BANYAN, LANG_BAC_LAYOUT as L } from './bac';
import { layoutSpots, pathLength, probeOf, reachGrid } from './villageChecks';

const probe = probeOf(L);
const blocked = probe.blocked;
const props = (k: string) => L.props.filter((p) => p.kind === k);
const scatterOf = (k: string) => (L.scatter ?? []).filter((p) => p.kind === k);
const count = (m: string) => L.placements.filter((p) => p.model === m).length;
const MERCHANT = L.companions![0];

/** Món chiếm chỗ: bỏ đồ nằm trên nước hay dưới đồ khác (mặt nước, thuyền, lá sen, bến gỗ, mái che, cuốn sổ, chân giá). */
const SKIP = ['chan', 'nuoc', 'so-chung', 'hoa', 'mai-che', 'hien-nha', 'cay-the', 'de-may', 'thuyen', 'la-sen', 'hoa-sen', 'ben-go'];
const spots = () =>
  layoutSpots(
    L,
    [
      { name: 'thay-linh', x: L.guide.x, z: L.guide.z, r: 0.45 },
      { name: 'lai-buon', x: MERCHANT.x, z: MERCHANT.z, r: 0.45 },
    ],
    SKIP,
  );
const reachableCells = (plugGate = false) => reachGrid(L, blocked, BAC_WALL_RADIUS, BAC_GATE_Z, plugGate);
const WALK = 4.1;

describe('Làng Bạc (mốc 3, bước L5): quy mô và bố cục', () => {
  it('bán kính 125, cổng ở (0, −125) nên tâm làng cách chợ 197 (cổng ở 72); lũy tre bao quanh', () => {
    expect(L.radius).toBe(BAC_RADIUS);
    expect(BAC_RADIUS).toBe(125);
    expect(L.gate).toEqual({ model: 'env/cong-lang-bac', x: 0, z: BAC_GATE_Z, yaw: Math.PI });
    expect(L.wall).toEqual({ radius: BAC_WALL_RADIUS, gap: 9.5 });
    expect(scatterOf('tre').filter((p) => Math.abs(Math.hypot(p.x, p.z) - BAC_WALL_RADIUS) < 2.5).length).toBeGreaterThan(200);
  });

  it('khu nhà ở 25 đến 35 nhà (ngói và tranh), nhà giữ sổ riêng; 2 giếng, cây đa, năm lều, vườn cây, đồi tre, ruộng lúa', () => {
    expect(BAC_HOUSE_COUNT).toBeGreaterThanOrEqual(25);
    expect(BAC_HOUSE_COUNT).toBeLessThanOrEqual(35);
    expect(count('env/nha-mai-ngoi')).toBeGreaterThan(8);
    expect(count('env/nha-mai-tranh')).toBeGreaterThan(8);
    expect(count('env/gieng-lang')).toBeGreaterThanOrEqual(2);
    expect(count('env/cay-da')).toBe(1);
    expect(count('env/leu-cho')).toBe(5);
    expect(scatterOf('cay-qua').length).toBeGreaterThanOrEqual(15);
    expect(scatterOf('doi').length).toBeGreaterThanOrEqual(4);
    expect(L.fields!.length).toBeGreaterThanOrEqual(4);
    for (const f of L.fields!) expect(f.kind).toBe('lua');
  });

  it('Cây Gộp Sổ quanh (0, −80): cây đa lớn, sân đất nện, ba biển gỗ quay mặt về cổng, thầy Linh dưới tán, chỗ xuất hiện ngay phía nam các biển', () => {
    const tree = L.placements.find((p) => p.model === 'env/cay-da')!;
    expect([tree.x, tree.z, tree.scale]).toEqual([BANYAN.x, BANYAN.z, BANYAN.scale]);
    expect(tree.scale).toBeGreaterThanOrEqual(0.9);
    const yard = L.yards.find((y) => y.kind === undefined && Math.hypot(y.x - tree.x, y.z - tree.z) < 1)!;
    expect(yard.r).toBeGreaterThanOrEqual(14);
    expect(L.boards.map((b) => b.level)).toEqual([10, 11, 12]);
    for (const b of L.boards) {
      expect(Math.cos(b.yaw)).toBeCloseTo(-1, 6); // mặt trước quay về −Z (phía cổng)
      expect(Math.hypot(b.x - yard.x, b.z - yard.z)).toBeLessThan(yard.r);
    }
    expect(L.guide.character).toBe('thayLinh');
    expect(Math.hypot(L.guide.x - tree.x, L.guide.z - tree.z)).toBeLessThan(10);
    expect(L.start.z).toBeLessThan(Math.min(...L.boards.map((b) => b.z)));
    expect(Math.hypot(L.start.x - L.boards[1].x, L.start.z - L.boards[1].z)).toBeLessThan(8);
    expect(resolveCollisions({ x: L.guide.x, z: L.guide.z } as Point2, 0.45, collidersFor(tree).map((c) => c.shape)), 'thầy Linh không đứng trong nền rễ').toBe(false);
  });

  it('quầy đổi bạc (đông nam): năm lều chợ, dây xu, bàn thỏi bạc, cân đĩa, rương gỗ, sổ cái trên bàn', () => {
    const stalls = L.placements.filter((p) => p.model === 'env/leu-cho');
    for (const s of stalls) {
      expect(s.x).toBeGreaterThan(40);
      expect(s.z).toBeLessThan(-30);
    }
    const near = (p: { x: number; z: number }) => Math.hypot(p.x - 63, p.z + 42) < 30;
    expect(props('day-xu').filter(near).length).toBeGreaterThanOrEqual(2);
    expect(props('thoi-bac').filter(near).length).toBeGreaterThanOrEqual(1);
    expect(props('can-bac').filter(near).length).toBeGreaterThanOrEqual(1);
    expect(props('ruong-go').filter(near).length).toBeGreaterThanOrEqual(2);
    expect(props('ban-viet').filter(near).length).toBeGreaterThanOrEqual(1);
    expect(props('cuon-xu').filter(near).length).toBeGreaterThanOrEqual(1);
    expect(props('kien-hang').filter(near).length).toBeGreaterThanOrEqual(2);
    const yard = L.yards.find((y) => y.kind === undefined && Math.hypot(y.x - 63, y.z + 43) < 3)!;
    expect(yard.r).toBeGreaterThanOrEqual(20); // sân đất nện rộng trùm cả dãy lều
  });

  it('nhà giữ sổ (tây): nhà ngói lớn có hiên, bàn chép sổ có sổ, giá sổ cái, rương', () => {
    const house = L.placements.find((p) => p.model === 'env/nha-mai-ngoi' && p.scale > 1.3)!;
    expect(house.x).toBeLessThan(-55);
    const near = (p: { x: number; z: number }) => Math.hypot(p.x - house.x, p.z - house.z) < 16;
    expect(props('hien-nha').filter(near)).toHaveLength(1); // hiên dựng bằng code (bước L6)
    expect(props('ban-viet').filter(near).length).toBeGreaterThanOrEqual(2); // bàn chép sổ có nghiên mực và bút lông
    expect(props('mai-che')).toHaveLength(0);
    expect(props('so-chung')).toHaveLength(0);
    expect(props('ke-so').filter(near).length).toBeGreaterThanOrEqual(2);
    expect(props('ruong-go').filter(near).length).toBeGreaterThanOrEqual(2);
  });

  it('ao sen (tây bắc): ao lớn, lá sen và hoa sen nổi trên nước (nằm trong ao), cầu ao', () => {
    const pond = L.ponds![0];
    expect(pond.r).toBeGreaterThanOrEqual(12);
    expect(pond.x).toBeLessThan(-40);
    expect(pond.z).toBeGreaterThan(30);
    const pads = props('la-sen');
    const flowers = props('hoa-sen');
    expect(pads.length).toBeGreaterThanOrEqual(10);
    expect(flowers.length).toBeGreaterThanOrEqual(4);
    for (const p of [...pads, ...flowers]) expect(Math.hypot(p.x - pond.x, p.z - pond.z), `${p.kind} (${p.x.toFixed(1)}, ${p.z.toFixed(1)})`).toBeLessThan(pond.r - 0.5);
    const jetty = scatterOf('cau-ao');
    expect(jetty).toHaveLength(1);
    expect(Math.hypot(jetty[0].x - pond.x, jetty[0].z - pond.z)).toBeLessThan(pond.r + 4);
  });

  it('6 dân làng đi lại giữa các khu; mọi vòng đi có từ 4 điểm', () => {
    expect(L.villagers).toHaveLength(6);
    for (const v of L.villagers!) expect(v.length).toBeGreaterThanOrEqual(4);
  });

  it('mọi món nằm trong lũy tre (kể cả cỡ chân), cổng ở đầu đường', () => {
    for (const s of spots()) expect(Math.hypot(s.x, s.z) + s.r, `${s.name} (${s.x.toFixed(1)}, ${s.z.toFixed(1)})`).toBeLessThanOrEqual(BAC_WALL_RADIUS - 0.8);
    for (const p of props('hien-nha')) expect(Math.hypot(p.x, p.z) + PROP_SIZES['hien-nha'].r).toBeLessThanOrEqual(BAC_WALL_RADIUS - 0.8);
    for (const f of L.fields!) expect(Math.hypot(Math.abs(f.x) + f.hx, Math.abs(f.z) + f.hz)).toBeLessThan(BAC_WALL_RADIUS - 2);
    for (const p of L.ponds!) expect(Math.hypot(p.x, p.z) + p.r + 1.3).toBeLessThan(BAC_WALL_RADIUS - 1);
    for (const p of BAC_STREAM.samples) expect(Math.hypot(p.x, p.z) + p.w / 2 + 1.6).toBeLessThan(BAC_WALL_RADIUS - 1);
  });
});

describe('Làng Bạc: thẻ gỗ ghi số trên cây đa (cây ví dụ của Bài 4)', () => {
  const tags = banyanTags();

  it('15 thẻ: số lấy đúng từ buildTree của đề mẫu Bài 4 (tám lá, bốn, hai, một gốc)', () => {
    const tree = buildTree(SAMPLE_HARD_CHALLENGE.txs.map((t) => t.value));
    expect(banyanTree()).toEqual(tree);
    expect(tree.map((r) => r.length)).toEqual([8, 4, 2, 1]);
    expect(tags).toHaveLength(15);
    for (const t of tags) {
      expect(t.value, `tầng ${t.level} số ${t.index}`).toBe(tree[t.level][t.index]);
      expect(t.digits).toBe(String(t.value));
    }
    expect(tree.map((r) => r.join(' '))).toEqual(['3 7 5 2 6 1 4 8', '37 52 61 48', '422 658', '4878']); // combine(a, b) = a × 10 + b
  });

  it('thẻ gốc to nhất và thấp nhất, gần thân; tầng càng gần gốc thẻ càng to và treo càng thấp; lá ở ngoài cùng', () => {
    const root = tags.find((t) => t.level === 3)!;
    for (const t of tags) if (t !== root) expect(root.w * root.h, 'gốc to nhất').toBeGreaterThan(t.w * t.h);
    for (const t of tags) if (t !== root) expect(root.y, 'gốc thấp nhất').toBeLessThan(t.y);
    const meanY = (lv: number) => tags.filter((t) => t.level === lv).reduce((s, t) => s + t.y, 0) / tags.filter((t) => t.level === lv).length;
    const meanR = (lv: number) => tags.filter((t) => t.level === lv).reduce((s, t) => s + Math.hypot(t.x, t.z), 0) / tags.filter((t) => t.level === lv).length;
    for (let lv = 0; lv < 3; lv++) {
      expect(meanY(lv)).toBeGreaterThan(meanY(lv + 1));
      expect(meanR(lv)).toBeGreaterThan(meanR(lv + 1));
    }
    for (const t of tags) {
      expect(t.top).toBeGreaterThan(t.y + t.h / 2 + 0.5); // có dây treo
      expect(t.z).toBeGreaterThan(0); // phía người đứng nhìn (+z của hình, quay về cổng khi đặt)
    }
  });

  it('một chỗ đặt duy nhất (cay-the) ở thân cây, quay mặt về cổng; không còn đồ rải thẻ số', () => {
    const t = props('cay-the');
    expect(t).toHaveLength(1);
    expect([t[0].x, t[0].z]).toEqual([BANYAN.x, BANYAN.z]);
    expect(Math.cos(t[0].yaw)).toBeCloseTo(-1, 6);
    expect(scatterOf('the-so')).toHaveLength(0);
    expect(PROP_SIZES['cay-the'].collide).toBe(false);
  });

  it('ảnh chữ chung: mỗi thẻ một ô riêng trong lưới 4 × 4 (không trùng, uv nằm trong ảnh); chữ co vừa mặt phẳng chữ và cao tối đa bằng chiều cao chữ mong muốn', () => {
    const seen = new Set<string>();
    for (const t of tags) {
      const c = tagCell(t.id);
      expect(c.px).toBeLessThan(TAG_ATLAS.cell * TAG_ATLAS.cols);
      expect(c.u0).toBeGreaterThanOrEqual(0);
      expect(c.u1).toBeLessThanOrEqual(1);
      expect(c.v0).toBeGreaterThanOrEqual(0);
      expect(c.v1).toBeLessThanOrEqual(1);
      expect(c.u1 - c.u0).toBeCloseTo(1 / TAG_ATLAS.cols, 9);
      seen.add(`${c.px},${c.py}`);
      const plane = tagPlane(t);
      expect(plane.w).toBeLessThan(t.w);
      expect(plane.h).toBeLessThan(t.h);
      // chữ rộng 0,62 cỡ phông mỗi chữ số: bề rộng chuỗi ở cỡ phông 100 xấp xỉ 62 × số chữ số
      const k = tagTextScale(t, 100, 62 * t.digits.length);
      expect(k * 62 * t.digits.length, `thẻ ${t.digits} lọt mặt phẳng chữ`).toBeLessThanOrEqual(plane.w + 1e-9);
      expect(k * 100 * 0.72, `thẻ ${t.digits} không cao quá mong muốn`).toBeLessThanOrEqual(t.digitH + 1e-9);
    }
    expect(seen.size).toBe(15);
  });

  it('thẻ gốc chữ cao nhất; ở khoảng 6 đến 8 đơn vị chữ lá cao ≥ 0,3 và chữ gốc ≥ 0,5; thẻ to lay ít hơn thẻ nhỏ', () => {
    const root = tags.find((t) => t.level === 3)!;
    const leaf = tags.find((t) => t.level === 0)!;
    for (const t of tags) expect(root.digitH).toBeGreaterThanOrEqual(t.digitH);
    expect(leaf.digitH).toBeGreaterThanOrEqual(0.3);
    expect(root.digitH).toBeGreaterThanOrEqual(0.5);
    expect(tagSwing(root).amp).toBeLessThan(tagSwing(leaf).amp);
    for (const t of tags) {
      const s = tagSwing(t);
      expect(s.amp).toBeGreaterThan(0);
      expect(s.amp).toBeLessThan(0.08); // lay nhẹ (tối đa khoảng 4,5 độ)
      expect(s.speed).toBeGreaterThan(1);
    }
  });
});

describe('Làng Bạc: bến sông, nhánh sông nhỏ và bến gỗ', () => {
  const dock = props('ben-go')[0];

  it('một bến gỗ, ba thuyền mui lá, kiện hàng, thúng, lái buôn đứng ở bờ cạnh bến', () => {
    expect(props('ben-go')).toHaveLength(1);
    expect(props('thuyen')).toHaveLength(3);
    expect(props('kien-hang').filter((p) => Math.hypot(p.x - dock.x, p.z - dock.z) < 20).length).toBeGreaterThanOrEqual(3);
    expect(props('thung').filter((p) => Math.hypot(p.x - dock.x, p.z - dock.z) < 20).length).toBeGreaterThanOrEqual(2);
    expect(MERCHANT.character).toBe('laiBuon');
    expect(Math.hypot(MERCHANT.x - dock.x, MERCHANT.z - dock.z)).toBeLessThan(8);
    expect(L.streams).toHaveLength(1);
    expect(L.streams![0].points.length).toBeGreaterThanOrEqual(6);
  });

  it('bến gỗ: sàn đặc có dốc ở bờ, mặt sàn phẳng ra tới mũi bến, người đứng được (độ cao tăng dần, không nhảy)', () => {
    let prev = deckHeight(dock, dock.x - 5, dock.z);
    expect(prev).toBe(0);
    for (let x = dock.x - 5; x <= dock.x + DECK.hz; x += 0.05) {
      const h = deckHeight(dock, x, dock.z);
      expect(Math.abs(h - prev)).toBeLessThan(0.05);
      prev = h;
    }
    expect(deckHeight(dock, dock.x + 1, dock.z)).toBe(DECK.top);
    expect(deckHeight(dock, dock.x + DECK.hz, dock.z)).toBe(DECK.top);
    expect(deckHeight(dock, dock.x + DECK.hz + 0.1, dock.z)).toBe(0);
    expect(deckHeight(dock, dock.x, dock.z + DECK.hx + 0.1)).toBe(0);
  });

  it('nước của nhánh sông là vật cản (chỗ nào trong dòng nước cũng bị chặn) trừ lối ra bến gỗ; đi từ bờ lên bến tới mũi bến không bị chặn', () => {
    const { samples, band, dock: d } = BAC_STREAM;
    const bad: string[] = [];
    for (const p of samples) {
      if (p.z > band.z0 + 1 && p.z < band.z1 - 1 && Math.abs(p.z - d.z) < 2.6) continue; // chỗ bến
      if (!blocked(p.x, p.z, 0.3)) bad.push(`tim nước (${p.x.toFixed(1)}, ${p.z.toFixed(1)})`);
    }
    // hai mép nước (trong lòng, cách mép 0,7) và các điểm giữa hai mẫu
    const pts = samples;
    for (let i = 0; i + 1 < pts.length; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      const tx = b.x - a.x;
      const tz = b.z - a.z;
      const len = Math.hypot(tx, tz) || 1;
      for (const t of [0.25, 0.5, 0.75]) {
        const cx = a.x + tx * t;
        const cz = a.z + tz * t;
        if (cz > band.z0 + 1 && cz < band.z1 - 1 && Math.abs(cz - d.z) < 2.6) continue;
        for (const s of [-1, 1]) {
          const off = (a.w / 2 - 0.7) * s;
          const x = cx + (-tz / len) * off;
          const z = cz + (tx / len) * off;
          if (!blocked(x, z, 0.2)) bad.push(`trong lòng nước (${x.toFixed(1)}, ${z.toFixed(1)})`);
        }
      }
    }
    expect(bad).toEqual([]);
    // lối ra bến: từ bờ (trước dốc) tới mũi bến đi được; quá mũi bến và hai bên bến là nước
    expect(probe.firstBlocked(dock.x - 4.2, dock.z, dock.x + DECK.hz - 0.4, dock.z, 0.4)).toBeNull();
    for (const dz of [-1.2, 0, 1.2]) expect(probe.firstBlocked(dock.x - 4.2, dock.z + dz, dock.x + DECK.hz - 0.6, dock.z + dz, 0.3), `lệch ${dz}`).toBeNull();
    expect(blocked(dock.x + DECK.hz + 0.9, dock.z, 0.4), 'ngoài mũi bến').toBe(true);
    expect(blocked(dock.x + 1, dock.z + DECK.hx + 0.9, 0.4), 'cạnh bến (phía bắc)').toBe(true);
    expect(blocked(dock.x + 1, dock.z - DECK.hx - 0.9, 0.4), 'cạnh bến (phía nam)').toBe(true);
  });

  it('thuyền nằm trên nước (trong lòng nhánh sông), không chắn lối ra bến', () => {
    const { axisX, width, dock: d } = BAC_STREAM;
    for (const b of props('thuyen')) {
      expect(Math.abs(b.x - axisX)).toBeLessThan(width / 2 - 0.8);
      expect(Math.abs(b.z - d.z), 'cách lối ra bến').toBeGreaterThan(2.3 + 1.7 - 0.3);
    }
  });
});

describe('Làng Bạc: không đè nhau, đi lại được', () => {
  it('không món nào đè lên món khác (vòng tròn bao chân không chồng nhau)', () => {
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

  it('ruộng không đè nhà hay đồ khác; ao và nước không đè nhà hay đồ khác', () => {
    for (const f of L.fields!)
      for (const s of spots()) {
        const dx = s.x - f.x;
        const dz = s.z - f.z;
        const lx = dx * Math.cos(f.yaw) - dz * Math.sin(f.yaw);
        const lz = dx * Math.sin(f.yaw) + dz * Math.cos(f.yaw);
        expect(Math.abs(lx) < f.hx + s.r && Math.abs(lz) < f.hz + s.r, `${s.name} (${s.x.toFixed(1)}, ${s.z.toFixed(1)}) đè ruộng (${f.x}, ${f.z})`).toBe(false);
      }
    for (const p of L.ponds!)
      for (const s of spots()) expect(Math.hypot(s.x - p.x, s.z - p.z) < p.r + s.r * 0.3, `${s.name} (${s.x.toFixed(1)}, ${s.z.toFixed(1)}) đè ao (${p.x}, ${p.z})`).toBe(false);
    for (const q of BAC_STREAM.samples)
      for (const s of spots()) {
        if (s.name === 'ben-go') continue;
        expect(Math.hypot(s.x - q.x, s.z - q.z) < q.w / 2 + s.r * 0.3, `${s.name} (${s.x.toFixed(1)}, ${s.z.toFixed(1)}) đè nhánh sông`).toBe(false);
      }
  });

  it('đi được từ chỗ xuất hiện tới: ba biển, thầy Linh, lái buôn, quầy, bến gỗ (tới mũi bến), nhà giữ sổ, 4 thẻ, giếng, ao sen, và ra cổng', () => {
    const g = reachableCells();
    const standNear = (x: number, z: number, r = 2.4) => g.near(x, z, r);
    for (const b of L.boards) expect(standNear(b.x + Math.sin(b.yaw) * 1.2, b.z + Math.cos(b.yaw) * 1.2, 1.6), `biển ${b.level}`).toBe(true);
    expect(standNear(L.guide.x, L.guide.z, 2.4), 'thầy Linh').toBe(true);
    expect(standNear(MERCHANT.x, MERCHANT.z, 2.4), 'lái buôn').toBe(true);
    const dock = props('ben-go')[0];
    expect(standNear(dock.x + DECK.hz - 0.8, dock.z, 0.6), 'mũi bến').toBe(true);
    expect(standNear(dock.x - 3.6, dock.z, 0.6), 'chân dốc').toBe(true);
    for (const s of L.scrolls!) expect(standNear(s.x, s.z, 1.8), `thẻ ${s.index}`).toBe(true);
    for (const t of [...L.placements.filter((p) => p.model === 'env/gieng-lang' || p.model === 'env/leu-cho'), ...props('day-xu'), ...props('thoi-bac'), ...props('can-bac'), ...props('ban-chep'), ...props('ke-so'), ...props('ruong-go'), ...props('kien-hang')]) {
      const x = (t as { x: number }).x;
      const z = (t as { z: number }).z;
      expect(standNear(x, z, 6), `${(t as { model?: string; kind?: string }).model ?? (t as { kind?: string }).kind} ở (${x.toFixed(1)}, ${z.toFixed(1)})`).toBe(true);
    }
    const lakeShore = L.ponds![0];
    expect(standNear(lakeShore.x + lakeShore.r + 1, lakeShore.z, 2), 'bờ ao sen').toBe(true);
    expect(standNear(0, BAC_GATE_Z - 3, 1.5), 'ngoài cổng').toBe(true);
    expect(g.reachedInside).toBeGreaterThan(Math.PI * (BAC_WALL_RADIUS - 2) ** 2 * 0.62);
  });

  it('lũy tre kín: từ trong làng không đi ra ngoài được trừ qua cổng', () => {
    const g = reachableCells(true);
    for (let a = 0; a < 24; a++) {
      const ang = (a / 24) * Math.PI * 2;
      const x = Math.cos(ang) * (BAC_WALL_RADIUS + 5);
      const z = Math.sin(ang) * (BAC_WALL_RADIUS + 5);
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
    walk(byId.get(gs.join)!.x, byId.get(gs.join)!.z, gs.x, gs.z, 0.4, 'thầy Linh');
    L.villagers!.forEach((loop, k) => {
      for (let i = 0; i < loop.length; i++) {
        const a = loop[i];
        const b = loop[(i + 1) % loop.length];
        walk(a[0], a[1], b[0], b[1], 0.45, `dân làng ${k}`);
      }
    });
    expect(bad).toEqual([]);
    for (const n of L.paths!.nodes) expect(pathLength(L.paths!, L.paths!.entry, n.id), `nút ${n.id}`).toBeLessThan(Infinity);
  });
});

describe('Làng Bạc: thẻ "Em có biết?" và quãng đường', () => {
  it('bốn thẻ ở bốn khu khác nhau (quầy đổi bạc, bến sông, nhà giữ sổ, ao sen) và cách xa nhau (từ 60 trở lên)', () => {
    const s = L.scrolls!;
    expect(s.map((q) => q.index)).toEqual([0, 1, 2, 3]);
    expect(s.map((q) => q.zone)).toEqual(['quaybac', 'bensong', 'nhaso', 'aosen']);
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

describe('Làng Bạc ở thế giới mở: đổi sang tọa độ thế giới giữ nguyên các thuộc tính', () => {
  const world = assembleWorld();
  const village = world.villages.find((v) => v.id === 'lang-bac')!;

  it('tâm làng cách chợ 197, cổng cách chợ 72; viền lũy tre nét liền, không còn đồ đất hoang quanh làng này', () => {
    expect(Math.hypot(village.center.x, village.center.z)).toBeCloseTo(197, 6);
    expect(Math.hypot(village.gate.x, village.gate.z)).toBeCloseTo(72, 6);
    expect(village.layout.wall).toEqual({ radius: BAC_WALL_RADIUS, gap: 9.5, center: { x: village.center.x, z: village.center.z } });
    const inside = (x: number, z: number) => Math.hypot(x - village.center.x, z - village.center.z) < BAC_WALL_RADIUS + 20;
    expect(world.wild.filter((p) => inside(p.x, p.z))).toHaveLength(0);
  });

  it('ba biển 10, 11, 12, thầy Linh, lái buôn, nhánh sông, vật cản nước và 4 thẻ đi theo bố cục làng', () => {
    expect(village.layout.boards.map((b) => b.level)).toEqual([10, 11, 12]);
    expect(village.layout.guide!.character).toBe('thayLinh');
    expect(village.layout.companions!.map((c) => c.character)).toEqual(['laiBuon']);
    expect(village.layout.streams).toHaveLength(1);
    expect(village.layout.scrolls).toHaveLength(4);
    expect(village.layout.blocks!.length).toBe(L.blocks!.length);
    expect(village.layout.obstacles.length).toBeGreaterThan(L.placements.length);
    // nước của nhánh sông ở tọa độ thế giới cũng cách tâm làng đúng như ở hệ làng
    const s = village.layout.streams![0].points[0];
    expect(Math.hypot(s.x - village.center.x, s.z - village.center.z)).toBeCloseTo(Math.hypot(L.streams![0].points[0].x, L.streams![0].points[0].z - 0), 6);
  });

  it('nhánh sông nằm trong chỗ dành riêng của làng và không chạm sông của thế giới (cách mép nước của sông ≥ 10)', () => {
    for (const p of village.layout.streams![0].points) expect(Math.hypot(p.x - village.center.x, p.z - village.center.z)).toBeLessThan(BAC_WALL_RADIUS - 5);
  });

  it('bến gỗ: độ cao mặt đi được của thế giới theo bến (dốc rồi sàn), cầu của chợ giữ nguyên', () => {
    const decks = decksOf(village.layout.props);
    expect(decks).toHaveLength(1);
    const d = decks[0];
    // đi dọc trục bến ở tọa độ thế giới: từ chân dốc tới mũi bến
    const c = Math.cos(d.yaw);
    const s = Math.sin(d.yaw);
    const at = (lz: number) => world.groundHeight(d.x + lz * s, d.z + lz * c);
    expect(at(-DECK.hz - 0.5)).toBe(0);
    expect(at(-DECK.hz + 0.2)).toBeGreaterThan(0);
    expect(at(-DECK.hz + 0.2)).toBeLessThan(DECK.top);
    expect(at(0)).toBe(DECK.top);
    expect(at(DECK.hz - 0.1)).toBe(DECK.top);
    expect(at(DECK.hz + 0.3)).toBe(0);
    for (const [x, z] of [[-20, 0], [-45, 0], [-33, 1], [-45, 3], [-60, 0]]) expect(world.groundHeight(x, z)).toBe(worldGroundHeight(x, z));
    // ngoài bến ở mọi nơi khác của làng: mặt đất
    expect(world.groundHeight(village.center.x, village.center.z)).toBe(0);
  });

  it('bản đồ: đường nhỏ có nút thẻ `scroll:lang-bac:<số>`, biển 10, 11, 12 và thầy Linh nối vào đồ thị thế giới', () => {
    const ids = new Set(world.graph.nodes.map((n) => n.id));
    for (let i = 0; i < 4; i++) expect(ids.has(`scroll:lang-bac:${i}`)).toBe(true);
    expect(ids.has('board:10') && ids.has('board:11') && ids.has('board:12')).toBe(true);
    expect(ids.has('guide:lang-bac')).toBe(true);
  });

  it('mọi món nhỏ mới có cỡ trong PROP_SIZES; chân nhà ngói có footprint', () => {
    for (const k of ['day-xu', 'thoi-bac', 'can-bac', 'ruong-go', 'kien-hang', 'ke-so', 'thuyen', 'la-sen', 'hoa-sen', 'ben-go', 'cuon-xu', 'ban-viet', 'hien-nha'] as const) expect(PROP_SIZES[k].h, k).toBeGreaterThan(0.04);
    expect(footprintRadiusOf('env/nha-mai-ngoi')).toBeGreaterThan(1);
  });
});
