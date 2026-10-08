import { describe, expect, it } from 'vitest';
import type { LevelStatus } from '../content/levels';
import { computeUnlock, type LevelUnlock, type UnlockInput } from './unlock';

const ALL_READY: Record<number, LevelStatus> = Object.fromEntries(
  Array.from({ length: 12 }, (_, i) => [i + 1, 'ready' as const]),
);
/** Mọi màn 'ready', trừ các màn được chỉ ra là 'coming-soon'. */
const statuses = (...soon: number[]): Record<number, LevelStatus> => ({
  ...ALL_READY,
  ...Object.fromEntries(soon.map((n) => [n, 'coming-soon' as const])),
});
const run = (input: Partial<UnlockInput> & { statuses?: Record<number, LevelStatus> }) =>
  computeUnlock({ doneLevels: [], statuses: ALL_READY, ...input });
const state = (r: ReturnType<typeof run>, id: number): LevelUnlock => r.levels.find((l) => l.id === id)!;
const openIds = (r: ReturnType<typeof run>) => r.levels.filter((l) => l.state === 'open').map((l) => l.id);

describe('unlock: 9 tình huống của spec 03 mục 6', () => {
  it('1. mới bắt đầu: chỉ màn 1 mở', () => {
    const r = run({});
    expect(openIds(r)).toEqual([1]);
    expect(r.goldenPages).toBe(0);
    expect(r.levels).toHaveLength(12);
  });

  it('2. xong màn 1: màn 2 mở', () => {
    const r = run({ doneLevels: [1] });
    expect(state(r, 1).state).toBe('done');
    expect(openIds(r)).toEqual([2]);
  });

  it('3. đã chơi màn 2: màn 3 mở', () => {
    const r = run({ doneLevels: [1, 2] });
    expect(openIds(r)).toEqual([3]);
    expect(r.goldenPages).toBe(0);
  });

  it('4. đã chơi màn 3: golden_pages = 1, màn 4 mở', () => {
    const r = run({ doneLevels: [1, 2, 3] });
    expect(r.goldenPages).toBe(1);
    expect(openIds(r)).toEqual([4]);
  });

  it('5. tài khoản giáo viên: mở cả 12 màn', () => {
    const r = run({ isTeacher: true });
    expect(openIds(r)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(r.levels.some((l) => l.state === 'locked')).toBe(false);
  });

  it('6. màn 3 là coming-soon; đã chơi màn 2: nhận Trang Sổ Vàng 1, màn 4 mở', () => {
    const r = run({ statuses: statuses(3), doneLevels: [1, 2] });
    expect(state(r, 3).state).toBe('coming-soon');
    expect(r.goldenPages).toBe(1);
    expect(openIds(r)).toEqual([4]);
  });

  it('7. màn 2 và 3 đều coming-soon; xong màn 1: nhận Trang Sổ Vàng 1, màn 4 mở', () => {
    const r = run({ statuses: statuses(2, 3), doneLevels: [1] });
    expect(r.goldenPages).toBe(1);
    expect(openIds(r)).toEqual([4]);
  });

  it('8. đã có Trang Sổ Vàng 1, sau đó màn 3 đổi sang ready: vẫn giữ trang; màn 3 mở để chơi', () => {
    // Trước đó màn 3 là coming-soon nên đã nhận trang 1; bây giờ màn 3 là ready và chưa chơi.
    const r = run({ statuses: ALL_READY, doneLevels: [1, 2], goldenPages: 1 });
    expect(r.goldenPages).toBe(1);
    expect(state(r, 3).state).toBe('open');
    expect(state(r, 4).state).toBe('open'); // làng Dệt vẫn mở
  });

  it('9. màn 11 coming-soon, màn 12 ready; xong màn 10: màn 12 mở', () => {
    const r = run({ statuses: statuses(11), doneLevels: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] });
    expect(state(r, 11).state).toBe('coming-soon');
    expect(state(r, 12).state).toBe('open');
    expect(r.goldenPages).toBe(3);
  });
});

describe('unlock: các trường hợp bổ sung', () => {
  it('bảng status mặc định của mốc 1: chỉ màn 1, 4, 7, 10 là ready', () => {
    const r = computeUnlock({ doneLevels: [] });
    expect(r.levels.map((l) => l.state)).toEqual([
      'open', 'coming-soon', 'coming-soon',
      'locked', 'coming-soon', 'coming-soon',
      'locked', 'coming-soon', 'coming-soon',
      'locked', 'coming-soon', 'coming-soon',
    ]);
    const after = computeUnlock({ doneLevels: [1] });
    expect(after.goldenPages).toBe(1);
    expect(after.levels.find((l) => l.id === 4)!.state).toBe('open');
    const all = computeUnlock({ doneLevels: [1, 4, 7, 10] });
    expect(all.goldenPages).toBe(4);
  });

  it('lý do khóa: id màn cần hoàn thành để mở', () => {
    const r = run({ doneLevels: [1] });
    expect(state(r, 3)).toEqual({ id: 3, state: 'locked', lockedBy: 2 });
    expect(state(r, 4)).toEqual({ id: 4, state: 'locked', lockedBy: 2 }); // làng Dệt cần xong làng Giấy
    expect(state(r, 12).lockedBy).toBe(2);
    const r2 = run({ doneLevels: [1, 2, 3] });
    expect(state(r2, 5)).toEqual({ id: 5, state: 'locked', lockedBy: 4 });
    expect(state(r2, 7).lockedBy).toBe(4);
    expect(state(run({}), 1).lockedBy).toBeUndefined();
  });

  it('lý do khóa bỏ qua màn coming-soon', () => {
    const r = run({ statuses: statuses(2), doneLevels: [1] });
    expect(state(r, 3).state).toBe('open'); // màn 2 coming-soon được tính đã qua
    const r2 = run({ statuses: statuses(3), doneLevels: [] });
    expect(state(r2, 4).lockedBy).toBe(1);
  });

  it('Trang Sổ Vàng không bao giờ bị thu lại', () => {
    // Đã lưu 2 trang nhưng tiến độ trống: vẫn là 2, làng Khắc Dấu mở.
    const r = run({ goldenPages: 2 });
    expect(r.goldenPages).toBe(2);
    expect(r.villageOpen).toEqual([true, true, true, false]);
    expect(state(r, 7).state).toBe('open');
    expect(run({ goldenPages: 9 }).goldenPages).toBe(4);
    expect(run({ goldenPages: -3 }).goldenPages).toBe(0);
  });

  it('làng sau chỉ mở khi có Trang Sổ Vàng của làng trước, theo thứ tự Giấy, Dệt, Khắc Dấu, Bạc', () => {
    // Xong hết làng Dệt nhưng chưa xong làng Giấy: làng Dệt vẫn khóa, không có trang 2.
    const r = run({ doneLevels: [4, 5, 6] });
    expect(r.goldenPages).toBe(0);
    expect(state(r, 4).state).toBe('done');
    expect(state(r, 5).state).toBe('done');
    expect(r.villageOpen).toEqual([true, false, false, false]);
    expect(state(r, 7).state).toBe('locked');
  });

  it('giáo viên: màn đã xong hiện done, màn coming-soon vẫn không vào được', () => {
    const r = computeUnlock({ doneLevels: [1], isTeacher: true });
    expect(state(r, 1).state).toBe('done');
    expect(state(r, 2).state).toBe('coming-soon');
    expect(state(r, 4).state).toBe('open');
    expect(state(r, 10).state).toBe('open');
  });

  it('không thay đổi dữ liệu đầu vào', () => {
    const done = [1, 2];
    const copy = [...done];
    run({ doneLevels: done });
    expect(done).toEqual(copy);
  });
});
