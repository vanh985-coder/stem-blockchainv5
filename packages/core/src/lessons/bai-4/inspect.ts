import { buildTree, combine } from './logic';

/**
 * Luật "soi ô" ở trạm Trung bình, phần 3 "Khám phá bí mật" (spec 08, mục "Màn 10").
 * Cây đã ghi trong sổ (`recorded`) giữ số cũ. Giao dịch bị sửa làm cây "bây giờ" (`recomputed`) khác ở nhánh từ lá bị sửa lên gốc.
 * Gốc cây mới hiện sẵn là "khác". Học sinh đi từ gốc xuống: chỉ soi được ô mà ô cha đã soi và "khác".
 * Chỉ dùng combine và buildTree có sẵn, không viết lại công thức.
 */

export interface InspectCell {
  level: number;
  index: number;
}

export interface InspectResult {
  /** Số đã ghi trong sổ (lúc em dựng cây) */
  recorded: number;
  /** Số tính lại bây giờ */
  recomputed: number;
  /** Giống (đúng) hay khác */
  match: boolean;
}

export type InspectState = Record<string, InspectResult>;

export const cellKey = (c: InspectCell): string => `${c.level}-${c.index}`;

/** Tầng của gốc trong cây 4 giao dịch (lá = 0, T12 và T34 = 1, gốc = 2) */
export const TOP_LEVEL = 2;

/** Cây tính lại sau khi giao dịch ở vị trí `tamperedLeafIndex` bị sửa thành `newValue`. Không sửa mảng đầu vào. */
export function recomputedTree(leaves: number[], tamperedLeafIndex: number, newValue: number): number[][] {
  const current = leaves.slice();
  current[tamperedLeafIndex] = newValue;
  return buildTree(current);
}

/**
 * Soi một ô. Lá: số bây giờ là giá trị giao dịch hiện tại. Ô trên: ghép hai ô con ĐÃ tính lại bằng combine.
 * @param recorded cây đã ghi trong sổ
 * @param recomputed cây bây giờ (từ recomputedTree)
 */
export function inspectCell(recorded: number[][], recomputed: number[][], cell: InspectCell): InspectResult {
  const { level, index } = cell;
  const before = recorded[level][index];
  const after = level === 0 ? recomputed[0][index] : combine(recomputed[level - 1][index * 2], recomputed[level - 1][index * 2 + 1]);
  return { recorded: before, recomputed: after, match: before === after };
}

/** Trạng thái lúc bắt đầu: gốc cây mới hiện sẵn (luôn "khác", vì sửa một lá thì gốc đổi). */
export function initialInspectState(recorded: number[][], recomputed: number[][], topLevel: number = TOP_LEVEL): InspectState {
  const root: InspectCell = { level: topLevel, index: 0 };
  return { [cellKey(root)]: inspectCell(recorded, recomputed, root) };
}

/**
 * Ô này bấm được không? Chỉ khi chưa soi, không phải gốc (đã hiện sẵn), và ô cha đã soi và "khác".
 * Nhờ vậy học sinh đi từ gốc xuống theo nhánh khác, không soi lung tung.
 */
export function canInspect(cell: InspectCell, state: InspectState, topLevel: number = TOP_LEVEL): boolean {
  if (cell.level >= topLevel) return false;
  if (state[cellKey(cell)]) return false;
  const parent = state[cellKey({ level: cell.level + 1, index: Math.floor(cell.index / 2) })];
  return Boolean(parent) && !parent.match;
}

/** Soi trúng đúng lá bị sửa (lá khác) thì xong. */
export function isTamperedLeafHit(cell: InspectCell, tamperedLeafIndex: number, result: InspectResult): boolean {
  return cell.level === 0 && cell.index === tamperedLeafIndex && !result.match;
}

/**
 * Số ô đã soi (mỗi ô tính một lần). Gốc hiện sẵn không tính: truyền `givenLevel` (tầng gốc) để bỏ nó ra.
 */
export function inspectCount(state: InspectState, givenLevel?: number): number {
  const keys = Object.keys(state);
  return givenLevel === undefined ? keys.length : keys.filter((k) => Number(k.split('-')[0]) !== givenLevel).length;
}
