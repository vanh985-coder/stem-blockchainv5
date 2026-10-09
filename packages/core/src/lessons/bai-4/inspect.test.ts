import { describe, expect, it } from 'vitest';
import { buildTree } from './logic';
import {
  cellKey,
  inspectCell,
  inspectCount,
  isTamperedLeafHit,
  matchedCount,
  recomputedTree,
  shouldShowBiHint,
  type InspectState,
} from './inspect';

// Ví dụ của spec: lá 6, 3, 2, 1; sổ ghi T12 = 63, T34 = 21, gốc = 651; T3 bị sửa từ 2 thành 3.
const LEAVES = [6, 3, 2, 1];
const RECORDED = buildTree(LEAVES);
const RECOMPUTED = recomputedTree(LEAVES, 2, 3);

describe('soi ô ở cây 4 giao dịch (T3: 2 → 3)', () => {
  it('cây sổ và cây tính lại đúng số của ví dụ', () => {
    expect(RECORDED).toEqual([[6, 3, 2, 1], [63, 21], [651]]);
    expect(RECOMPUTED).toEqual([[6, 3, 3, 1], [63, 31], [661]]);
    expect(LEAVES).toEqual([6, 3, 2, 1]); // không sửa mảng đầu vào
  });

  it('gốc, T34 và T3 lệch', () => {
    expect(inspectCell(RECORDED, RECOMPUTED, { level: 2, index: 0 })).toEqual({ recorded: 651, recomputed: 661, match: false });
    expect(inspectCell(RECORDED, RECOMPUTED, { level: 1, index: 1 })).toEqual({ recorded: 21, recomputed: 31, match: false });
    expect(inspectCell(RECORDED, RECOMPUTED, { level: 0, index: 2 })).toEqual({ recorded: 2, recomputed: 3, match: false });
  });

  it('T12, T1, T2 và T4 khớp', () => {
    for (const cell of [
      { level: 1, index: 0 },
      { level: 0, index: 0 },
      { level: 0, index: 1 },
      { level: 0, index: 3 },
    ]) {
      const r = inspectCell(RECORDED, RECOMPUTED, cell);
      expect(r.match, cellKey(cell)).toBe(true);
      expect(r.recomputed).toBe(r.recorded);
    }
  });

  it('chỉ soi trúng lá bị sửa (lá lệch) thì xong', () => {
    const hit = (level: number, index: number) => isTamperedLeafHit({ level, index }, 2, inspectCell(RECORDED, RECOMPUTED, { level, index }));
    expect(hit(0, 2)).toBe(true);
    expect(hit(2, 0)).toBe(false); // gốc lệch nhưng chưa phải lá
    expect(hit(1, 1)).toBe(false);
    expect(hit(0, 0)).toBe(false); // lá khớp
    expect(hit(1, 0)).toBe(false);
  });

  it('đếm đúng số lần soi và số ô khớp; soi lại ô cũ không đếm thêm', () => {
    const state: InspectState = {};
    const soi = (level: number, index: number) => {
      state[cellKey({ level, index })] = inspectCell(RECORDED, RECOMPUTED, { level, index });
    };
    soi(2, 0);
    soi(1, 0);
    expect(inspectCount(state)).toBe(2);
    expect(matchedCount(state)).toBe(1);
    soi(2, 0); // soi lại gốc
    expect(inspectCount(state)).toBe(2);
    soi(1, 1);
    soi(0, 2);
    expect(inspectCount(state)).toBe(4);
    expect(matchedCount(state)).toBe(1);
  });

  it('Bi gợi ý khi đã soi trúng ô khớp lần thứ 2', () => {
    const state: InspectState = {};
    state[cellKey({ level: 1, index: 0 })] = inspectCell(RECORDED, RECOMPUTED, { level: 1, index: 0 });
    expect(shouldShowBiHint(state)).toBe(false);
    state[cellKey({ level: 0, index: 0 })] = inspectCell(RECORDED, RECOMPUTED, { level: 0, index: 0 });
    expect(shouldShowBiHint(state)).toBe(true);
  });

  it('đi theo nhánh đỏ: soi gốc, hai ô con, rồi hai lá của ô lệch', () => {
    // gốc (lệch) → T12 (khớp) + T34 (lệch) → T3 (lệch) + T4 (khớp): 5 ô nếu soi cả hai con ở mỗi tầng
    const path = [
      { level: 2, index: 0 },
      { level: 1, index: 0 },
      { level: 1, index: 1 },
      { level: 0, index: 2 },
      { level: 0, index: 3 },
    ];
    const results = path.map((c) => inspectCell(RECORDED, RECOMPUTED, c));
    expect(results.map((r) => r.match)).toEqual([false, true, false, false, true]);
  });
});
