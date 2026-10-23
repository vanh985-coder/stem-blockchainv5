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
  it('bảng status mặc định (mốc 3 bước B7): màn 1, 2, 3, 4, 5, 7, 8, 10, 12 là ready; màn 2 khóa cho tới khi xong màn 1', () => {
    const r = computeUnlock({ doneLevels: [] });
    expect(r.levels.map((l) => l.state)).toEqual([
      'open', 'locked', 'locked',
      'locked', 'locked', 'coming-soon',
      'locked', 'locked', 'coming-soon',
      'locked', 'coming-soon', 'locked',
    ]);
    expect(computeUnlock({ doneLevels: [1] }).goldenPages).toBe(0); // xong bài học chưa đủ: còn màn 2 và 3
    expect(computeUnlock({ doneLevels: [1, 2] }).goldenPages).toBe(0); // chơi màn 2 xong còn màn 3
    const after = computeUnlock({ doneLevels: [1, 2, 3] });
    expect(after.goldenPages).toBe(1);
    expect(after.levels.find((l) => l.id === 4)!.state).toBe('open');
    // Làng Dệt (bước B7): màn 5 ready, màn 6 còn coming-soon nên Trang Sổ Vàng 2 trao sau khi chơi màn 5, chưa trao khi mới xong màn 4
    expect(computeUnlock({ doneLevels: [1, 2, 3, 4] }).goldenPages).toBe(1);
    expect(computeUnlock({ doneLevels: [1, 2, 3, 4, 5] }).goldenPages).toBe(2);
    // Làng Khắc Dấu: màn 9 còn coming-soon nên Trang Sổ Vàng 3 trao sau khi chơi màn 8 (spec 03 mục 6), chưa trao khi mới xong màn 7
    expect(computeUnlock({ doneLevels: [1, 2, 3, 4, 5, 7] }).goldenPages).toBe(2);
    expect(computeUnlock({ doneLevels: [1, 2, 3, 4, 5, 7] }).levels.find((l) => l.id === 8)!.state).toBe('open');
    expect(computeUnlock({ doneLevels: [1, 2, 3, 4, 5, 7, 8] }).goldenPages).toBe(3);
    // Làng Bạc (bước B5): màn 11 còn coming-soon, màn 12 ready nên Trang Sổ Vàng 4 chỉ có khi đã chơi màn 12, không phải khi mới xong màn 10
    const noClimb = computeUnlock({ doneLevels: [1, 2, 3, 4, 5, 7, 8, 10] });
    expect(noClimb.goldenPages).toBe(3);
    expect(noClimb.levels.find((l) => l.id === 12)!.state).toBe('open');
    expect(noClimb.levels.find((l) => l.id === 11)!.state).toBe('coming-soon');
    const all = computeUnlock({ doneLevels: [1, 2, 3, 4, 5, 7, 8, 10, 12] });
    expect(all.goldenPages).toBe(4);
  });

  it('Trang Sổ Vàng 4 (bước B5): chơi màn 12 là đủ (kể cả hết tim: game đã chơi là xong); xong màn 10 mà chưa chơi màn 12 thì chưa có; trang đã trao thì không thu lại', () => {
    const base = [1, 2, 3, 4, 5, 7, 8];
    expect(computeUnlock({ doneLevels: [...base, 10] }).goldenPages).toBe(3);
    expect(computeUnlock({ doneLevels: [...base, 12] }).goldenPages).toBe(3); // chưa xong bài học (màn 10)
    expect(computeUnlock({ doneLevels: [...base, 10, 12] }).goldenPages).toBe(4);
    // tài khoản đã có trang 4 từ trước (luật mốc 1: trao ngay sau màn 10): giữ nguyên, màn 12 mở, không thu lại
    const old = computeUnlock({ doneLevels: [...base, 10], goldenPages: 4 });
    expect(old.goldenPages).toBe(4);
    expect(old.levels.find((l) => l.id === 12)!.state).toBe('open');
    expect(computeUnlock({ doneLevels: [...base], goldenPages: 4 }).goldenPages).toBe(4);
  });

  it('Làng Dệt (bước B7): xong màn 4 mà chưa chơi màn 5 thì chưa có Trang Sổ Vàng 2 (màn 5 mở); chơi màn 5 thì có (màn 6 còn coming-soon); tài khoản đã có trang 2 từ trước giữ nguyên', () => {
    const lesson = computeUnlock({ doneLevels: [1, 2, 3, 4] });
    expect(lesson.goldenPages).toBe(1);
    expect(state(lesson, 5).state).toBe('open');
    expect(state(lesson, 6).state).toBe('coming-soon');
    expect(state(lesson, 7).state).toBe('locked');
    const played = computeUnlock({ doneLevels: [1, 2, 3, 4, 5] });
    expect(played.goldenPages).toBe(2);
    expect(state(played, 5).state).toBe('done');
    expect(state(played, 7).state).toBe('open');
    // tài khoản đã có trang 2 từ trước (luật mốc 1: trao ngay sau màn 4): giữ nguyên, màn 5 vẫn mở, không thu lại
    const old = computeUnlock({ doneLevels: [1, 2, 3, 4], goldenPages: 2 });
    expect(old.goldenPages).toBe(2);
    expect(state(old, 5).state).toBe('open');
    expect(state(old, 7).state).toBe('open');
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

  it('giáo viên: màn đã xong hiện done, màn sẵn sàng mở hết, màn coming-soon vẫn không vào được', () => {
    const r = computeUnlock({ doneLevels: [1], isTeacher: true });
    expect(state(r, 1).state).toBe('done');
    expect(state(r, 2).state).toBe('open');
    expect(state(r, 3).state).toBe('open');
    expect(state(r, 5).state).toBe('open'); // game làng Dệt đã ra mắt (bước B7)
    expect(state(r, 6).state).toBe('coming-soon'); // game còn lại của làng Dệt chưa làm: vẫn không vào được
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
