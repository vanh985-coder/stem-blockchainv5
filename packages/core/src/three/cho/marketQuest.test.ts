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

  it('làm xong bài học làng Giấy (các màn còn lại sắp ra mắt) thì cổng Dệt mở', () => {
    const unlock = computeUnlock({ doneLevels: [1] });
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
