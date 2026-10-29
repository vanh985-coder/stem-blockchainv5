import { describe, expect, it } from 'vitest';
import { FESTIVAL_LAUNCHED } from '../../config/festival';
import { BI_NHAC_HOI_SAP_MO, BI_NHAC_NHIEM, MARKET_TALKERS, NHIEM_VU, NHIEM_VU_HOI_SAP_MO } from '../../content/dialogues';
import { VILLAGE_ORDER } from '../../content/levels';
import { computeUnlock } from '../../progress/unlock';
import { GATES } from './marketLayout';
import {
  GATE_ORDER,
  GATE_VILLAGE,
  biQuestLine,
  clampPages,
  gateOpenedAfter,
  gateStates,
  isGateOpen,
  previousVillage,
  questGate,
  questIndex,
  questLine,
} from './marketQuest';

describe('cổng theo tiến độ', () => {
  it('thứ tự cổng và làng khớp nhau (Giấy, Dệt, Khắc Dấu, Bạc) và khớp bố cục chợ', () => {
    expect(GATE_ORDER.map((g) => GATE_VILLAGE[g])).toEqual([...VILLAGE_ORDER]);
    expect(new Set(GATES.map((g) => g.id))).toEqual(new Set(GATE_ORDER));
  });

  it('P3a: cả 4 cổng mở từ đầu, ở mọi số Trang Sổ Vàng (tính từ computeUnlock), cho học sinh và khách', () => {
    for (const pages of [0, 1, 2, 3, 4]) {
      const unlock = computeUnlock({ doneLevels: [], goldenPages: pages });
      const s = gateStates(unlock.villageOpen, false);
      expect(GATE_ORDER.map((g) => s[g]), `${pages} trang`).toEqual([true, true, true, true]);
    }
  });

  it('tài khoản giáo viên mở hết dù chưa có trang nào', () => {
    const unlock = computeUnlock({ doneLevels: [], goldenPages: 0, isTeacher: true });
    const s = gateStates(unlock.villageOpen, true);
    expect(GATE_ORDER.every((g) => s[g])).toBe(true);
  });

  it('thiếu dữ liệu thì cổng mở; chỉ đóng khi nói rõ false', () => {
    expect(isGateOpen('giay', [], false)).toBe(true);
    expect(isGateOpen('det', [], false)).toBe(true);
    expect(isGateOpen('bac', [true, true, true, false], false)).toBe(false);
    expect(isGateOpen('bac', [true, true, true, false], true)).toBe(true);
  });

  it('xong làng sau trước làng trước không làm cổng nào đổi: Bạc mở ngay từ đầu, không cần Khắc Dấu', () => {
    expect(gateStates(computeUnlock({ doneLevels: [] }).villageOpen, false).bac).toBe(true);
    const bacOnly = computeUnlock({ doneLevels: [10, 11, 12] });
    expect(gateStates(bacOnly.villageOpen, false)).toEqual({ giay: true, det: true, 'khac-dau': true, bac: true });
    expect(bacOnly.goldenPages).toBe(0); // chưa trao trang nào sớm
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

describe('cổng nào mở sau Trang Sổ Vàng', () => {
  it('cổng vừa mở là cổng của làng kế tiếp; làng cuối không mở cổng nào', () => {
    expect(gateOpenedAfter('lang-giay')).toBe('det');
    expect(gateOpenedAfter('lang-det')).toBe('khac-dau');
    expect(gateOpenedAfter('lang-khac-dau')).toBe('bac');
    expect(gateOpenedAfter('lang-bac')).toBeNull();
  });
});

describe('dòng nhiệm vụ khi đủ 4 Trang Sổ Vàng (cờ hội làng đã ra mắt)', () => {
  it('cờ FESTIVAL_LAUNCHED mặc định false', () => {
    expect(FESTIVAL_LAUNCHED).toBe(false);
  });

  it('đủ 4 trang, hội làng chưa ra mắt: "Em đã có đủ 4 Trang Sổ Vàng! Hội làng sắp mở." và không còn cổng làm đích', () => {
    expect(questLine(4, false)).toBe('Em đã có đủ 4 Trang Sổ Vàng! Hội làng sắp mở.');
    expect(questLine(4)).toBe('Em đã có đủ 4 Trang Sổ Vàng! Hội làng sắp mở.');
    expect(questLine(7, false)).toBe(NHIEM_VU_HOI_SAP_MO);
    expect(questGate(4)).toBeNull();
    expect(biQuestLine(4, false)).toBe(BI_NHAC_HOI_SAP_MO);
    expect(biQuestLine(4, false)).not.toContain('đang mở hội');
  });

  it('hội làng đã ra mắt: mời dự hội như cũ', () => {
    expect(questLine(4, true)).toBe(NHIEM_VU[4]);
    expect(biQuestLine(4, true)).toBe(BI_NHAC_NHIEM[4]);
  });

  it('dưới 4 trang thì cờ không đổi gì', () => {
    for (const p of [0, 1, 2, 3]) {
      for (const launched of [false, true]) {
        expect(questLine(p, launched)).toBe(NHIEM_VU[p]);
        expect(biQuestLine(p, launched)).toBe(BI_NHAC_NHIEM[p]);
      }
    }
  });
});
