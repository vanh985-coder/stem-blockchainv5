import { describe, expect, it } from 'vitest';
import { BI_NHAC_NHIEM, MARKET_TALKERS, NHIEM_VU } from '../../content/dialogues';
import { VILLAGE_ORDER } from '../../content/levels';
import { computeUnlock } from '../../progress/unlock';
import { GATES } from './marketLayout';
import {
  ARROW_HIDE_DISTANCE,
  GATE_ORDER,
  GATE_VILLAGE,
  bearingTo,
  clampPages,
  gateStates,
  guideArrow,
  isGateOpen,
  previousVillage,
  questGate,
  questIndex,
  type GuideArrowState,
} from './marketQuest';

describe('cổng theo tiến độ', () => {
  it('thứ tự cổng và làng khớp nhau (Giấy, Dệt, Khắc Dấu, Bạc) và khớp bố cục chợ', () => {
    expect(GATE_ORDER.map((g) => GATE_VILLAGE[g])).toEqual([...VILLAGE_ORDER]);
    expect(new Set(GATES.map((g) => g.id))).toEqual(new Set(GATE_ORDER));
  });

  it('0 trang: chỉ cổng Giấy mở; mỗi trang mở thêm một cổng (tính từ computeUnlock)', () => {
    const want: Record<number, boolean[]> = {
      0: [true, false, false, false],
      1: [true, true, false, false],
      2: [true, true, true, false],
      3: [true, true, true, true],
      4: [true, true, true, true],
    };
    for (const pages of [0, 1, 2, 3, 4]) {
      const unlock = computeUnlock({ doneLevels: [], goldenPages: pages });
      const s = gateStates(unlock.villageOpen, false);
      expect(GATE_ORDER.map((g) => s[g]), `${pages} trang`).toEqual(want[pages]);
    }
  });

  it('tài khoản giáo viên mở hết dù chưa có trang nào', () => {
    const unlock = computeUnlock({ doneLevels: [], goldenPages: 0, isTeacher: true });
    const s = gateStates(unlock.villageOpen, true);
    expect(GATE_ORDER.every((g) => s[g])).toBe(true);
  });

  it('cổng đầu luôn mở, kể cả khi thiếu dữ liệu', () => {
    expect(isGateOpen('giay', [], false)).toBe(true);
    expect(isGateOpen('det', [], false)).toBe(false);
  });

  it('xong bài học làng Giấy chưa mở cổng Dệt; chơi xong màn 2 (màn sẵn sàng cuối, màn 3 sắp ra mắt) thì cổng Dệt mở', () => {
    expect(gateStates(computeUnlock({ doneLevels: [1] }).villageOpen, false).det).toBe(false);
    const unlock = computeUnlock({ doneLevels: [1, 2] });
    expect(unlock.goldenPages).toBe(1);
    expect(gateStates(unlock.villageOpen, false).det).toBe(true);
    expect(gateStates(unlock.villageOpen, false)['khac-dau']).toBe(false);
  });

  it('làng cần giúp trước: Dệt → Giấy, Khắc Dấu → Dệt, Bạc → Khắc Dấu; Giấy không có', () => {
    expect(previousVillage('giay')).toBeNull();
    expect(previousVillage('det')).toBe('lang-giay');
    expect(previousVillage('khac-dau')).toBe('lang-det');
    expect(previousVillage('bac')).toBe('lang-khac-dau');
  });
});

describe('nhiệm vụ theo số Trang Sổ Vàng', () => {
  it('đưa số trang về 0–4', () => {
    expect([-3, 0, 1.9, 4, 9, NaN, Infinity].map(clampPages)).toEqual([0, 0, 1, 4, 4, 0, 0]);
  });

  it('có đủ 5 dòng nhiệm vụ và 5 câu Bi nói, 0 trang là "Đến Làng Giấy ở phía bắc gặp bác An."', () => {
    expect(NHIEM_VU).toHaveLength(5);
    expect(BI_NHAC_NHIEM).toHaveLength(5);
    expect(NHIEM_VU[0]).toBe('Đến Làng Giấy ở phía bắc gặp {bacAn}.');
    expect(questIndex(0)).toBe(0);
    expect(questIndex(7)).toBe(4);
  });

  it('cổng cần tới: 0 trang Giấy, 1 Dệt, 2 Khắc Dấu, 3 Bạc, 4 không còn cổng', () => {
    expect([0, 1, 2, 3, 4].map(questGate)).toEqual(['giay', 'det', 'khac-dau', 'bac', null]);
  });

  it('mỗi dòng nhiệm vụ nói đúng hướng của cổng cần tới (bắc, nam, tây, đông)', () => {
    const dir: Record<string, string> = { giay: 'bắc', det: 'nam', 'khac-dau': 'tây', bac: 'đông' };
    for (const g of GATE_ORDER) {
      const k = GATE_ORDER.indexOf(g);
      expect(NHIEM_VU[k]).toContain(`phía ${dir[g]}`);
      expect(GATES.find((q) => q.id === g)!.direction).toBe(dir[g] === 'bắc' ? 'bac' : dir[g] === 'nam' ? 'nam' : dir[g] === 'tây' ? 'tay' : 'dong');
    }
  });
});

describe('dân làng nói chuyện', () => {
  it('4 người, mỗi người 2–3 câu, chỉ bà cụ và chú nông dân', () => {
    expect(MARKET_TALKERS).toHaveLength(4);
    for (const t of MARKET_TALKERS) {
      expect(['baCu', 'nongDan']).toContain(t.speaker);
      expect(t.lines.length).toBeGreaterThanOrEqual(2);
      expect(t.lines.length).toBeLessThanOrEqual(3);
      for (const l of t.lines) expect(l.trim()).not.toBe('');
    }
  });
});

describe('mũi tên chỉ đường', () => {
  const out = (): GuideArrowState => ({ visible: false, yaw: 0 });

  it('hướng về đích theo góc quanh trục đứng (0 là +Z)', () => {
    expect(bearingTo(0, 0, 0, 10).yaw).toBeCloseTo(0, 9);
    expect(bearingTo(0, 0, 10, 0).yaw).toBeCloseTo(Math.PI / 2, 9);
    expect(Math.abs(bearingTo(0, 0, 0, -10).yaw)).toBeCloseTo(Math.PI, 9);
    expect(bearingTo(0, 0, -10, 0).yaw).toBeCloseTo(-Math.PI / 2, 9);
    expect(bearingTo(3, 4, 6, 8).distance).toBeCloseTo(5, 9);
  });

  it('từ chỗ xuất hiện (0, −10) chỉ về cổng Giấy ở (0, 30): thẳng về phía bắc', () => {
    const a = guideArrow(0, -10, { x: 0, z: 30 }, out());
    expect(a.visible).toBe(true);
    expect(a.yaw).toBeCloseTo(0, 9);
  });

  it('ẩn khi không có đích hoặc đã tới gần cổng', () => {
    expect(guideArrow(0, 0, null, out()).visible).toBe(false);
    expect(guideArrow(0, 30 - ARROW_HIDE_DISTANCE + 0.1, { x: 0, z: 30 }, out()).visible).toBe(false);
    expect(guideArrow(0, 30 - ARROW_HIDE_DISTANCE - 0.1, { x: 0, z: 30 }, out()).visible).toBe(true);
  });
});

describe('chỗ xuất hiện ở chợ khi từ làng về (?tu=<làng>)', () => {
  it('ngay trước cổng làng đó, về phía sân chợ, quay lưng về cổng; làng lạ thì không có', async () => {
    const { marketSpawn, SPAWN_FROM_GATE } = await import('./marketQuest');
    expect(marketSpawn(null)).toBeNull();
    expect(marketSpawn('lang-la')).toBeNull();
    for (const g of GATES) {
      const s = marketSpawn(GATE_VILLAGE[g.id])!;
      expect(s, g.id).not.toBeNull();
      expect(Math.hypot(s.x - g.x, s.z - g.z)).toBeCloseTo(SPAWN_FROM_GATE, 9);
      // cổng nằm phía sau lưng: hướng mặt (sin yaw, cos yaw) ngược với hướng từ người tới cổng
      const fx = Math.sin(s.yaw);
      const fz = Math.cos(s.yaw);
      const bx = (g.x - s.x) / SPAWN_FROM_GATE;
      const bz = (g.z - s.z) / SPAWN_FROM_GATE;
      expect(fx * bx + fz * bz, g.id).toBeCloseTo(-1, 9);
      // đứng ở đó không bị vật cản đẩy ra (trống)
    }
    const giay = marketSpawn('lang-giay')!;
    expect(giay.x).toBeCloseTo(0, 9);
    expect(giay.z).toBeCloseTo(30 - SPAWN_FROM_GATE, 9);
    expect(Math.abs(giay.yaw)).toBeCloseTo(Math.PI, 9); // nhìn về phía nam (vào chợ), lưng quay về cổng Bắc
  });

  it('chỗ xuất hiện trống: không đè lên vật cản nào của chợ', async () => {
    const { marketSpawn } = await import('./marketQuest');
    const { generateMarket, WORLD_RADIUS } = await import('./marketLayout');
    const { resolveCollisions, PLAYER_RADIUS } = await import('../collision');
    const L = generateMarket();
    for (const g of GATES) {
      const s = marketSpawn(GATE_VILLAGE[g.id])!;
      const p = { x: s.x, z: s.z };
      expect(resolveCollisions(p, PLAYER_RADIUS, L.obstacles, WORLD_RADIUS), g.id).toBe(false);
    }
  });
});
