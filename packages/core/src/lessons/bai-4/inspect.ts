import { buildTree, combine } from './logic';

/**
 * Luật "soi ô" ở trạm Trung bình, phần 3 "Khám phá bí mật" (spec 08, mục "Màn 10").
 * Cây đã ghi trong sổ (`recorded`) giữ số cũ. Giao dịch bị sửa làm cây "tính lại" (`recomputed`) khác ở nhánh từ lá bị sửa lên gốc.
 * Học sinh soi từng ô: so số tính lại với số trong sổ. Chỉ dùng combine và buildTree có sẵn, không viết lại công thức.
 */

export interface InspectCell {
  level: number;
  index: number;
}

export interface InspectResult {
  /** Số đã ghi trong sổ */
  recorded: number;
  /** Số tính lại từ các giao dịch hiện tại */
  recomputed: number;
  /** Khớp (đúng) hay lệch */
  match: boolean;
}

export type InspectState = Record<string, InspectResult>;

export const cellKey = (c: InspectCell): string => `${c.level}-${c.index}`;

/** Cây tính lại sau khi giao dịch ở vị trí `tamperedLeafIndex` bị sửa thành `newValue`. Không sửa mảng đầu vào. */
export function recomputedTree(leaves: number[], tamperedLeafIndex: number, newValue: number): number[][] {
  const current = leaves.slice();
  current[tamperedLeafIndex] = newValue;
  return buildTree(current);
}

/**
 * Soi một ô. Lá: số tính lại là giá trị giao dịch hiện tại. Ô trên: ghép hai ô con ĐÃ tính lại bằng combine.
 * @param recorded cây đã ghi trong sổ
 * @param recomputed cây tính lại (từ recomputedTree)
 */
export function inspectCell(recorded: number[][], recomputed: number[][], cell: InspectCell): InspectResult {
  const { level, index } = cell;
  const before = recorded[level][index];
  const after = level === 0 ? recomputed[0][index] : combine(recomputed[level - 1][index * 2], recomputed[level - 1][index * 2 + 1]);
  return { recorded: before, recomputed: after, match: before === after };
}

/** Soi trúng đúng lá bị sửa (lá lệch) thì xong. */
export function isTamperedLeafHit(cell: InspectCell, tamperedLeafIndex: number, result: InspectResult): boolean {
  return cell.level === 0 && cell.index === tamperedLeafIndex && !result.match;
}

/** Số ô đã soi (mỗi ô tính một lần, soi lại ô cũ không đếm thêm). */
export function inspectCount(state: InspectState): number {
  return Object.keys(state).length;
}

/** Số ô đã soi mà khớp. */
export function matchedCount(state: InspectState): number {
  return Object.values(state).filter((r) => r.match).length;
}

/** Bi gợi ý "Bắt đầu từ gốc…" khi em đã soi trúng ô khớp lần thứ 2. */
export function shouldShowBiHint(state: InspectState): boolean {
  return matchedCount(state) >= 2;
}
