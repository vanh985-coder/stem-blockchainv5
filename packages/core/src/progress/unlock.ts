import { LEVELS, VILLAGE_ORDER, type LevelDef, type LevelStatus } from '../content/levels';

/** Trạng thái hiện của một màn. */
export type LevelState = 'locked' | 'open' | 'done' | 'coming-soon';

export interface UnlockInput {
  /**
   * Các màn đã xong: bài học khi đủ 3 trạm, game khi đã chơi (thắng hay thua đều tính).
   * Số màn nằm trong 1 đến 12.
   */
  doneLevels: readonly number[];
  /** Số Trang Sổ Vàng đã lưu (golden_pages). Đã trao thì không bao giờ thu lại. */
  goldenPages?: number;
  /** Tài khoản giáo viên/admin: mở mọi màn (màn 'coming-soon' vẫn không vào được). */
  isTeacher?: boolean;
  /** Ghi đè trạng thái của từng màn (dùng trong test và khi một màn đổi sang 'ready'). Không có thì dùng LEVELS. */
  statuses?: Readonly<Partial<Record<number, LevelStatus>>>;
  /** Bảng màn thay thế (mặc định LEVELS). */
  levels?: readonly LevelDef[];
}

export interface LevelUnlock {
  id: number;
  state: LevelState;
  /** Chỉ có khi state = 'locked': số màn cần hoàn thành để mở, hiện "Hoàn thành … để mở". */
  lockedBy?: number;
}

export interface UnlockResult {
  levels: LevelUnlock[];
  /** max(đã lưu, số tính được), từ 0 đến 4 */
  goldenPages: number;
  /** Làng nào đang mở, theo VILLAGE_ORDER */
  villageOpen: boolean[];
}

/**
 * Hàm thuần: tính trạng thái mở khóa 12 màn (spec 03 mục 6).
 * - Trong làng: bài học, rồi game 1, rồi game 2. Màn 'coming-soon' được tính như đã qua.
 * - Trang Sổ Vàng của làng được trao khi xong màn 'ready' cuối cùng của làng; làng kế tiếp mở khi có trang đó.
 * - Số Trang Sổ Vàng = max(đã lưu, tính được); không bao giờ giảm.
 */
export function computeUnlock(input: UnlockInput): UnlockResult {
  const levels = input.levels ?? LEVELS;
  const done = new Set(input.doneLevels);
  const statusOf = (l: LevelDef): LevelStatus => input.statuses?.[l.id] ?? l.status;
  const isPassed = (l: LevelDef) => statusOf(l) === 'coming-soon' || done.has(l.id);

  const villages = VILLAGE_ORDER.map((id) => levels.filter((l) => l.lang === id));

  // Số Trang Sổ Vàng: duyệt từng làng theo thứ tự.
  let golden = Math.max(0, Math.min(VILLAGE_ORDER.length, Math.floor(input.goldenPages ?? 0)));
  villages.forEach((list, v) => {
    const open = v === 0 || golden >= v;
    if (open && golden < v + 1 && list.every(isPassed)) golden = v + 1;
  });
  const villageOpen = villages.map((_, v) => v === 0 || golden >= v);

  /** Màn cần xong đầu tiên để làng v mở: màn chưa qua đầu tiên của làng trước (đệ quy nếu làng trước cũng khóa). */
  const gateOfVillage = (v: number): number | undefined => {
    if (v === 0) return undefined;
    const first = villages[v - 1].find((l) => !isPassed(l));
    if (first && villageOpen[v - 1]) return first.id;
    return gateOfVillage(v - 1) ?? first?.id;
  };

  const out: LevelUnlock[] = [];
  villages.forEach((list, v) => {
    list.forEach((l, i) => {
      if (statusOf(l) === 'coming-soon') {
        out.push({ id: l.id, state: 'coming-soon' });
      } else if (done.has(l.id)) {
        out.push({ id: l.id, state: 'done' });
      } else if (input.isTeacher) {
        out.push({ id: l.id, state: 'open' });
      } else if (!villageOpen[v]) {
        out.push({ id: l.id, state: 'locked', lockedBy: gateOfVillage(v) });
      } else {
        const blocker = list.slice(0, i).find((p) => !isPassed(p));
        out.push(blocker ? { id: l.id, state: 'locked', lockedBy: blocker.id } : { id: l.id, state: 'open' });
      }
    });
  });
  out.sort((a, b) => a.id - b.id);
  return { levels: out, goldenPages: golden, villageOpen };
}
