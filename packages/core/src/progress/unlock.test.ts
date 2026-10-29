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
  it('1. mới bắt đầu (P3a): màn đầu của cả 4 làng mở (1, 4, 7, 10), các màn sau trong làng còn khóa theo thứ tự', () => {
    const r = run({});
    expect(openIds(r)).toEqual([1, 4, 7, 10]);
    expect(r.goldenPages).toBe(0);
    expect(r.levels).toHaveLength(12);
  });

  it('2. xong màn 1: màn 2 mở', () => {
    const r = run({ doneLevels: [1] });
    expect(state(r, 1).state).toBe('done');
    expect(openIds(r)).toEqual([2, 4, 7, 10]);
  });

  it('3. đã chơi màn 2: màn 3 mở', () => {
    const r = run({ doneLevels: [1, 2] });
    expect(openIds(r)).toEqual([3, 4, 7, 10]);
    expect(r.goldenPages).toBe(0);
  });

  it('4. đã chơi màn 3: golden_pages = 1, màn 4 mở', () => {
    const r = run({ doneLevels: [1, 2, 3] });
    expect(r.goldenPages).toBe(1);
    expect(openIds(r)).toEqual([4, 7, 10]);
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
    expect(openIds(r)).toEqual([4, 7, 10]);
  });

  it('7. màn 2 và 3 đều coming-soon; xong màn 1: nhận Trang Sổ Vàng 1, màn 4 mở', () => {
    const r = run({ statuses: statuses(2, 3), doneLevels: [1] });
    expect(r.goldenPages).toBe(1);
    expect(openIds(r)).toEqual([4, 7, 10]);
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
  it('bảng status mặc định (mốc 3 bước B13, P3a): cả 12 màn là ready (không còn màn coming-soon); màn đầu mỗi làng mở, màn sau trong làng khóa cho tới khi xong màn trước', () => {
    const r = computeUnlock({ doneLevels: [] });
    expect(r.levels.map((l) => l.state)).toEqual([
      'open', 'locked', 'locked',
      'open', 'locked', 'locked',
      'open', 'locked', 'locked',
      'open', 'locked', 'locked',
    ]);
    expect(computeUnlock({ doneLevels: [1] }).goldenPages).toBe(0); // xong bài học chưa đủ: còn màn 2 và 3
    expect(computeUnlock({ doneLevels: [1, 2] }).goldenPages).toBe(0); // chơi màn 2 xong còn màn 3
    const after = computeUnlock({ doneLevels: [1, 2, 3] });
    expect(after.goldenPages).toBe(1);
    expect(after.levels.find((l) => l.id === 4)!.state).toBe('open');
    // Làng Dệt (bước B9): màn 5 và 6 đều ready nên Trang Sổ Vàng 2 trao sau khi chơi màn 6 (màn cuối đã ra mắt), chưa trao khi mới xong màn 4 hay 5
    expect(computeUnlock({ doneLevels: [1, 2, 3, 4] }).goldenPages).toBe(1);
    expect(computeUnlock({ doneLevels: [1, 2, 3, 4, 5] }).goldenPages).toBe(1);
    expect(computeUnlock({ doneLevels: [1, 2, 3, 4, 5, 6] }).goldenPages).toBe(2);
    // Làng Khắc Dấu (bước B11): màn 8 và 9 đều ready nên Trang Sổ Vàng 3 trao sau khi chơi màn 9 (màn cuối đã ra mắt), chưa trao khi mới xong màn 7 hay 8
    expect(computeUnlock({ doneLevels: [1, 2, 3, 4, 5, 6, 7] }).goldenPages).toBe(2);
    expect(computeUnlock({ doneLevels: [1, 2, 3, 4, 5, 6, 7] }).levels.find((l) => l.id === 8)!.state).toBe('open');
    expect(computeUnlock({ doneLevels: [1, 2, 3, 4, 5, 6, 7, 8] }).goldenPages).toBe(2);
    expect(computeUnlock({ doneLevels: [1, 2, 3, 4, 5, 6, 7, 8] }).levels.find((l) => l.id === 9)!.state).toBe('open');
    expect(computeUnlock({ doneLevels: [1, 2, 3, 4, 5, 6, 7, 8, 9] }).goldenPages).toBe(3);
    // Làng Bạc (bước B13): màn 11 và 12 đều ready nên xong màn 10 mở màn 11 (màn 12 còn khóa); Trang Sổ Vàng 4 chỉ có khi đã chơi màn 12 (màn cuối), như trước khi màn 11 ra mắt
    const noGames = computeUnlock({ doneLevels: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] });
    expect(noGames.goldenPages).toBe(3);
    expect(noGames.levels.find((l) => l.id === 11)!.state).toBe('open');
    expect(noGames.levels.find((l) => l.id === 12)!.state).toBe('locked');
    const noClimb = computeUnlock({ doneLevels: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] });
    expect(noClimb.goldenPages).toBe(3);
    expect(noClimb.levels.find((l) => l.id === 12)!.state).toBe('open');
    const all = computeUnlock({ doneLevels: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] });
    expect(all.goldenPages).toBe(4);
  });

  it('Trang Sổ Vàng 4 (bước B5, B13): chơi màn 12 (sau màn 11) là đủ (kể cả hết tim: game đã chơi là xong); xong màn 10 hay 11 mà chưa chơi màn 12 thì chưa có; trang đã trao thì không thu lại', () => {
    const base = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    expect(computeUnlock({ doneLevels: [...base, 10] }).goldenPages).toBe(3);
    expect(computeUnlock({ doneLevels: [...base, 10, 11] }).goldenPages).toBe(3);
    expect(computeUnlock({ doneLevels: [...base, 11, 12] }).goldenPages).toBe(3); // chưa xong bài học (màn 10)
    expect(computeUnlock({ doneLevels: [...base, 10, 12] }).goldenPages).toBe(3); // chưa chơi màn 11
    expect(computeUnlock({ doneLevels: [...base, 10, 11, 12] }).goldenPages).toBe(4);
    // tài khoản đã có trang 4 từ trước (luật mốc 1: trao ngay sau màn 10): giữ nguyên, màn 12 mở, không thu lại
    const old = computeUnlock({ doneLevels: [...base, 10], goldenPages: 4 });
    expect(old.goldenPages).toBe(4);
    expect(old.levels.find((l) => l.id === 11)!.state).toBe('open');
    expect(computeUnlock({ doneLevels: [...base], goldenPages: 4 }).goldenPages).toBe(4);
  });

  it('Làng Dệt (bước B9): xong màn 4 và 5 mà chưa chơi màn 6 thì chưa có Trang Sổ Vàng 2 (màn 6 mở); chơi màn 6 (màn cuối đã ra mắt của làng) thì có; tài khoản đã có trang 2 từ trước giữ nguyên', () => {
    const lesson = computeUnlock({ doneLevels: [1, 2, 3, 4] });
    expect(lesson.goldenPages).toBe(1);
    expect(state(lesson, 5).state).toBe('open');
    expect(state(lesson, 6).state).toBe('locked');
    expect(state(lesson, 7).state).toBe('open'); // P3a: làng Khắc Dấu mở từ đầu
    const fiveDone = computeUnlock({ doneLevels: [1, 2, 3, 4, 5] });
    expect(fiveDone.goldenPages).toBe(1);
    expect(state(fiveDone, 5).state).toBe('done');
    expect(state(fiveDone, 6).state).toBe('open');
    expect(state(fiveDone, 7).state).toBe('open');
    const played = computeUnlock({ doneLevels: [1, 2, 3, 4, 5, 6] });
    expect(played.goldenPages).toBe(2);
    expect(state(played, 6).state).toBe('done');
    expect(state(played, 7).state).toBe('open');
    // tài khoản đã có trang 2 từ trước (luật mốc 1 và B7): giữ nguyên, màn 5 và 6 vẫn mở, không thu lại
    const old = computeUnlock({ doneLevels: [1, 2, 3, 4], goldenPages: 2 });
    expect(old.goldenPages).toBe(2);
    expect(state(old, 5).state).toBe('open');
    expect(state(old, 7).state).toBe('open');
    const old2 = computeUnlock({ doneLevels: [1, 2, 3, 4, 5], goldenPages: 2 });
    expect(old2.goldenPages).toBe(2);
    expect(state(old2, 6).state).toBe('open');
  });

  it('lý do khóa: id màn cần hoàn thành để mở', () => {
    const r = run({ doneLevels: [1] });
    expect(state(r, 3)).toEqual({ id: 3, state: 'locked', lockedBy: 2 });
    expect(state(r, 4)).toEqual({ id: 4, state: 'open' }); // P3a: làng Dệt không cần xong làng Giấy
    expect(state(r, 12)).toEqual({ id: 12, state: 'locked', lockedBy: 10 }); // nhưng trong làng vẫn đúng thứ tự: bài học → game 1 → game 2
    expect(state(r, 11)).toEqual({ id: 11, state: 'locked', lockedBy: 10 });
    const r2 = run({ doneLevels: [1, 2, 3] });
    expect(state(r2, 5)).toEqual({ id: 5, state: 'locked', lockedBy: 4 });
    expect(state(r2, 7)).toEqual({ id: 7, state: 'open' }); // P3a: làng Khắc Dấu mở dù làng Dệt chưa xong
    expect(state(run({}), 1).lockedBy).toBeUndefined();
  });

  it('lý do khóa bỏ qua màn coming-soon', () => {
    const r = run({ statuses: statuses(2), doneLevels: [1] });
    expect(state(r, 3).state).toBe('open'); // màn 2 coming-soon được tính đã qua
    const r2 = run({ statuses: statuses(3), doneLevels: [] });
    expect(state(r2, 4).state).toBe('open');
  });

  it('Làng Khắc Dấu (bước B11): xong màn 7 và 8 mà chưa chơi màn 9 thì chưa có Trang Sổ Vàng 3 (màn 9 mở); chơi màn 9 (màn cuối đã ra mắt của làng) thì có và cổng Làng Bạc mở; tài khoản đã có trang 3 từ trước giữ nguyên', () => {
    const lesson = computeUnlock({ doneLevels: [1, 2, 3, 4, 5, 6, 7] });
    expect(lesson.goldenPages).toBe(2);
    expect(state(lesson, 8).state).toBe('open');
    expect(state(lesson, 9).state).toBe('locked'); // game thứ hai chỉ mở sau game thứ nhất
    const eight = computeUnlock({ doneLevels: [1, 2, 3, 4, 5, 6, 7, 8] });
    expect(eight.goldenPages).toBe(2);
    expect(state(eight, 9).state).toBe('open');
    expect(eight.villageOpen).toEqual([true, true, true, true]);
    const nine = computeUnlock({ doneLevels: [1, 2, 3, 4, 5, 6, 7, 8, 9] });
    expect(nine.goldenPages).toBe(3);
    expect(state(nine, 9).state).toBe('done');
    expect(nine.villageOpen).toEqual([true, true, true, true]);
    // tài khoản đã có trang 3 từ trước (luật cũ: trao sau màn 8): giữ nguyên, màn 9 mở để chơi, không thu lại
    const old = computeUnlock({ doneLevels: [1, 2, 3, 4, 5, 6, 7, 8], goldenPages: 3 });
    expect(old.goldenPages).toBe(3);
    expect(state(old, 9).state).toBe('open');
    expect(old.villageOpen).toEqual([true, true, true, true]);
  });

  it('Trang Sổ Vàng không bao giờ bị thu lại', () => {
    // Đã lưu 2 trang nhưng tiến độ trống: vẫn là 2, làng Khắc Dấu mở.
    const r = run({ goldenPages: 2 });
    expect(r.goldenPages).toBe(2);
    expect(r.villageOpen).toEqual([true, true, true, true]);
    expect(state(r, 7).state).toBe('open');
    expect(run({ goldenPages: 9 }).goldenPages).toBe(4);
    expect(run({ goldenPages: -3 }).goldenPages).toBe(0);
  });

  it('P3a: chơi làng sau trước làng trước: các màn được ghi done, không có trang trao sớm, làng trước vẫn mở nguyên', () => {
    // Xong hết làng Dệt nhưng chưa xong làng Giấy: màn Dệt là done, chưa có trang nào, cả 4 làng vẫn mở.
    const r = run({ doneLevels: [4, 5, 6] });
    expect(r.goldenPages).toBe(0);
    expect(state(r, 4).state).toBe('done');
    expect(state(r, 5).state).toBe('done');
    expect(state(r, 6).state).toBe('done');
    expect(r.villageOpen).toEqual([true, true, true, true]);
    expect(state(r, 1).state).toBe('open');
    expect(state(r, 7).state).toBe('open');
    expect(state(r, 10).state).toBe('open');
  });

  it('giáo viên: màn đã xong hiện done, màn sẵn sàng mở hết (cả màn 11 và 12 của làng Bạc); màn coming-soon (nếu có) vẫn không vào được', () => {
    const r = computeUnlock({ doneLevels: [1], isTeacher: true });
    expect(state(r, 1).state).toBe('done');
    expect(state(r, 2).state).toBe('open');
    expect(state(r, 3).state).toBe('open');
    expect(state(r, 5).state).toBe('open'); // game làng Dệt đã ra mắt (bước B7)
    expect(state(r, 6).state).toBe('open'); // game thứ hai của làng Dệt đã ra mắt (bước B9)
    expect(state(r, 9).state).toBe('open'); // game thứ hai của làng Khắc Dấu đã ra mắt (bước B11)
    expect(state(r, 11).state).toBe('open'); // game đầu của làng Bạc đã ra mắt (bước B13)
    expect(state(r, 12).state).toBe('open');
    expect(state(computeUnlock({ doneLevels: [1], isTeacher: true, statuses: statuses(11) }), 11).state).toBe('coming-soon'); // màn coming-soon (giả định) vẫn không vào được
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
