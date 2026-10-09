import { describe, expect, it } from 'vitest';
import { buildTree } from './logic';
import {
  TOP_LEVEL,
  canInspect,
  cellKey,
  initialInspectState,
  inspectCell,
  inspectCount,
  isTamperedLeafHit,
  recomputedTree,
  type InspectCell,
  type InspectState,
} from './inspect';

// Ví dụ của spec: lá 6, 3, 2, 1; sổ ghi T12 = 63, T34 = 21, gốc = 651; T3 bị sửa từ 2 thành 3.
const LEAVES = [6, 3, 2, 1];
const RECORDED = buildTree(LEAVES);
const RECOMPUTED = recomputedTree(LEAVES, 2, 3);

const ROOT: InspectCell = { level: 2, index: 0 };
const T12: InspectCell = { level: 1, index: 0 };
const T34: InspectCell = { level: 1, index: 1 };
const T1: InspectCell = { level: 0, index: 0 };
const T2: InspectCell = { level: 0, index: 1 };
const T3: InspectCell = { level: 0, index: 2 };
const T4: InspectCell = { level: 0, index: 3 };

function soi(state: InspectState, cell: InspectCell): InspectState {
  return { ...state, [cellKey(cell)]: inspectCell(RECORDED, RECOMPUTED, cell) };
}

describe('soi ô ở cây 4 giao dịch (T3: 2 → 3)', () => {
  it('cây sổ và cây bây giờ đúng số của ví dụ', () => {
    expect(RECORDED).toEqual([[6, 3, 2, 1], [63, 21], [651]]);
    expect(RECOMPUTED).toEqual([[6, 3, 3, 1], [63, 31], [661]]);
    expect(LEAVES).toEqual([6, 3, 2, 1]); // không sửa mảng đầu vào
  });

  it('gốc, T34 và T3 khác', () => {
    expect(inspectCell(RECORDED, RECOMPUTED, ROOT)).toEqual({ recorded: 651, recomputed: 661, match: false });
    expect(inspectCell(RECORDED, RECOMPUTED, T34)).toEqual({ recorded: 21, recomputed: 31, match: false });
    expect(inspectCell(RECORDED, RECOMPUTED, T3)).toEqual({ recorded: 2, recomputed: 3, match: false });
  });

  it('T12, T1, T2 và T4 giống', () => {
    for (const cell of [T12, T1, T2, T4]) {
      const r = inspectCell(RECORDED, RECOMPUTED, cell);
      expect(r.match, cellKey(cell)).toBe(true);
      expect(r.recomputed).toBe(r.recorded);
    }
  });

  it('chỉ soi trúng lá bị sửa (lá khác) thì xong', () => {
    const hit = (cell: InspectCell) => isTamperedLeafHit(cell, 2, inspectCell(RECORDED, RECOMPUTED, cell));
    expect(hit(T3)).toBe(true);
    expect(hit(ROOT)).toBe(false); // gốc khác nhưng chưa phải lá
    expect(hit(T34)).toBe(false);
    expect(hit(T1)).toBe(false); // lá giống
    expect(hit(T12)).toBe(false);
  });
});

describe('ô nào bấm được theo trạng thái soi', () => {
  it('lúc đầu gốc đã hiện sẵn "khác"; chỉ T12 và T34 bấm được, lá thì chưa', () => {
    const s0 = initialInspectState(RECORDED, RECOMPUTED);
    expect(s0[cellKey(ROOT)].match).toBe(false);
    expect(canInspect(ROOT, s0)).toBe(false); // gốc không cần soi
    expect(canInspect(T12, s0)).toBe(true);
    expect(canInspect(T34, s0)).toBe(true);
    for (const leaf of [T1, T2, T3, T4]) expect(canInspect(leaf, s0), cellKey(leaf)).toBe(false);
  });

  it('ô cha "khác" mở hai lá con; ô cha "giống" thì hai lá con vẫn khóa', () => {
    let s = initialInspectState(RECORDED, RECOMPUTED);
    s = soi(s, T12); // giống
    for (const leaf of [T1, T2]) expect(canInspect(leaf, s), cellKey(leaf)).toBe(false);
    s = soi(s, T34); // khác
    expect(canInspect(T3, s)).toBe(true);
    expect(canInspect(T4, s)).toBe(true);
    expect(canInspect(T1, s)).toBe(false);
    expect(canInspect(T2, s)).toBe(false);
  });

  it('ô đã soi không bấm lại được', () => {
    let s = initialInspectState(RECORDED, RECOMPUTED);
    s = soi(s, T34);
    expect(canInspect(T34, s)).toBe(false);
    s = soi(s, T4);
    expect(canInspect(T4, s)).toBe(false);
    expect(canInspect(T3, s)).toBe(true);
  });

  it('đi từ gốc xuống theo nhánh khác thì đến được lá bị sửa sau 3 ô: T12, T34, T3', () => {
    let s = initialInspectState(RECORDED, RECOMPUTED);
    s = soi(s, T34);
    s = soi(s, T3);
    expect(isTamperedLeafHit(T3, 2, s[cellKey(T3)])).toBe(true);
    expect(inspectCount(s, TOP_LEVEL)).toBe(2);
  });
});

describe('đếm số lần soi', () => {
  it('gốc hiện sẵn không tính; mỗi ô đã soi tính một lần', () => {
    let s = initialInspectState(RECORDED, RECOMPUTED);
    expect(inspectCount(s, TOP_LEVEL)).toBe(0);
    s = soi(s, T12);
    s = soi(s, T34);
    s = soi(s, T34); // soi lại: không đếm thêm
    expect(inspectCount(s, TOP_LEVEL)).toBe(2);
    s = soi(s, T4);
    s = soi(s, T3);
    expect(inspectCount(s, TOP_LEVEL)).toBe(4);
  });

  it('không truyền tầng gốc thì đếm cả gốc', () => {
    expect(inspectCount(initialInspectState(RECORDED, RECOMPUTED))).toBe(1);
  });
});
