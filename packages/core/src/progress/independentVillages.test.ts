import { describe, expect, it } from 'vitest';
import { LEVELS, VILLAGE_ORDER, levelsOfVillage } from '../content/levels';
import { GATE_ORDER, gateStates } from '../three/cho/marketQuest';
import { decodeProgress, encodeProgress } from './compact';
import { mergeProgress } from './merge';
import { doneLevels, recordLevelResult, unlockOf } from './record';
import { emptyProgress, type Progress } from './types';

/**
 * P3a: cả 4 làng mở từ đầu, chơi không cần theo thứ tự làng. Trong làng vẫn đúng thứ tự (bài học → game 1 → game 2).
 * Ghi kết quả bằng đúng hàm của người chơi (`recordLevelResult`), không tự đặt cờ.
 */
const T0 = 1_700_000_000_000;
const play = (p: Progress, id: number, t: number): Progress => {
  const def = LEVELS.find((l) => l.id === id)!;
  const result = def.kind === 'lesson' ? { stars: { de: 3, tb: 3, kho: 3 } } : { score: 100 };
  return recordLevelResult(p, id, result, T0 + t).progress;
};
const playAll = (p: Progress, ids: readonly number[]): Progress => ids.reduce((acc, id, i) => play(acc, id, i), p);
const stateOf = (p: Progress, id: number, isTeacher = false) => unlockOf(p, { isTeacher }).levels.find((l) => l.id === id)!;
const firstIds = VILLAGE_ORDER.map((v) => levelsOfVillage(v)[0].id);

describe('P3a: vào độc lập cả 4 làng', () => {
  it('khách mới và học sinh mới (tiến độ trống): màn đầu mỗi làng mở, cả 4 cổng mở', () => {
    const p = emptyProgress();
    const r = unlockOf(p);
    expect(r.villageOpen).toEqual([true, true, true, true]);
    for (const id of firstIds) expect(stateOf(p, id).state, `màn ${id}`).toBe('open');
    const s = gateStates(r.villageOpen, false);
    expect(GATE_ORDER.map((g) => s[g])).toEqual([true, true, true, true]);
    expect(r.goldenPages).toBe(0);
  });

  it('mở cổng không tự hoàn thành màn, không tự trao sao, xu hay Trang Sổ Vàng', () => {
    const p = emptyProgress();
    expect(doneLevels(p)).toEqual([]);
    expect(unlockOf(p).levels.filter((l) => l.state === 'done')).toEqual([]);
    expect(p.game).toEqual({ goldenPages: 0, coins: 0, data: {}, updatedAt: 0 });
    expect(Object.keys(p.levels)).toEqual([]);
  });

  it('trong từng làng vẫn đúng thứ tự: chưa xong bài học thì hai game còn khóa, kèm lý do', () => {
    const p = emptyProgress();
    for (const v of VILLAGE_ORDER) {
      const [lesson, g1, g2] = levelsOfVillage(v).map((l) => l.id);
      expect(stateOf(p, lesson).state).toBe('open');
      expect(stateOf(p, g1)).toEqual({ id: g1, state: 'locked', lockedBy: lesson });
      expect(stateOf(p, g2)).toEqual({ id: g2, state: 'locked', lockedBy: lesson }); // màn chưa qua đầu tiên của làng
    }
  });

  it('xong bài học làng nào thì mở game 1 của làng đó, không đụng làng khác', () => {
    const p = play(emptyProgress(), 10, 1); // bài học Làng Bạc trước
    expect(stateOf(p, 10).state).toBe('done');
    expect(stateOf(p, 11).state).toBe('open');
    expect(stateOf(p, 12).state).toBe('locked');
    expect(stateOf(p, 2).state).toBe('locked'); // làng Giấy giữ nguyên
    expect(stateOf(p, 1).state).toBe('open');
  });

  it('hoàn thành làng sau trước làng trước: màn ghi đúng done, chưa có trang nào, cả 4 làng vẫn mở', () => {
    const p = playAll(emptyProgress(), [10, 11, 12]);
    expect(unlockOf(p).goldenPages).toBe(0);
    expect(p.game.goldenPages).toBe(0);
    expect(doneLevels(p)).toEqual([10, 11, 12]);
    expect(unlockOf(p).villageOpen).toEqual([true, true, true, true]);
    for (const id of [1, 4, 7]) expect(stateOf(p, id).state).toBe('open');
    expect(p.game.coins).toBeGreaterThan(0); // chỉ xu/sao của màn đã chơi thật
    expect(Object.keys(p.levels).map(Number)).toEqual([10, 11, 12]);
  });

  it('làm đủ 12 màn theo thứ tự đảo (Bạc → Khắc Dấu → Dệt → Giấy): trang tới đủ 4 khi xong làng cuối, không trao sớm', () => {
    let p = emptyProgress();
    const order = [10, 11, 12, 7, 8, 9, 4, 5, 6];
    const pages: number[] = [];
    for (const [i, id] of order.entries()) {
      p = play(p, id, i);
      pages.push(p.game.goldenPages);
    }
    expect(pages).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0]); // làng Giấy chưa xong: chưa có trang nào
    p = playAll(p, [1, 2]);
    expect(p.game.goldenPages).toBe(0);
    p = play(p, 3, 20); // xong làng Giấy: các trang tới cùng lúc
    expect(p.game.goldenPages).toBe(4);
    expect(unlockOf(p).levels.every((l) => l.state === 'done')).toBe(true);
  });

  it('đảo thứ tự một phần: Giấy rồi Bạc rồi Dệt: trang theo chuỗi liền từ làng đầu', () => {
    let p = playAll(emptyProgress(), [1, 2, 3]);
    expect(p.game.goldenPages).toBe(1);
    p = playAll(p, [10, 11, 12]);
    expect(p.game.goldenPages).toBe(1); // Bạc xong nhưng Dệt, Khắc Dấu chưa: chưa thêm trang
    p = playAll(p, [4, 5, 6]);
    expect(p.game.goldenPages).toBe(2);
    p = playAll(p, [7, 8, 9]);
    expect(p.game.goldenPages).toBe(4);
  });

  it('tiến độ đã lưu giữ nguyên: trang đã có không thu lại, màn đã xong vẫn done, nhập vào không đặt lại', () => {
    // người chơi cũ: xong làng Giấy và bài học Dệt, 1 trang, 70 xu
    let old = playAll(emptyProgress(), [1, 2, 3, 4]);
    old = { ...old, game: { ...old.game, coins: 70 } };
    expect(old.game.goldenPages).toBe(1);
    const r = unlockOf(old);
    expect(r.goldenPages).toBe(1);
    expect(stateOf(old, 4).state).toBe('done');
    expect(stateOf(old, 5).state).toBe('open');
    // làng khác mở thêm không đổi gì ở dữ liệu cũ; mã hóa cookie khách rồi đọc lại vẫn nguyên
    const back = decodeProgress(encodeProgress(old));
    expect(back.game.goldenPages).toBe(1);
    expect(doneLevels(back)).toEqual(doneLevels(old));
    // trộn với bản chơi Bạc: không mất gì của bản nào
    const bac = playAll(emptyProgress(), [10]);
    const merged = mergeProgress(old, bac);
    expect(doneLevels(merged)).toEqual([1, 2, 3, 4, 10]);
    expect(merged.game.goldenPages).toBe(1);
    // trang đã lưu từ luật cũ nhưng thiếu dữ liệu màn: không thu lại, không tự đánh dấu màn xong
    const legacy = { ...emptyProgress(), game: { ...emptyProgress().game, goldenPages: 3 } };
    expect(unlockOf(legacy).goldenPages).toBe(3);
    expect(unlockOf(legacy).levels.some((l) => l.state === 'done')).toBe(false);
  });

  it('giáo viên giữ quyền cũ: mọi màn mở, không bị chặn, kể cả màn đã làm', () => {
    const p = playAll(emptyProgress(), [10]);
    const r = unlockOf(p, { isTeacher: true });
    expect(r.levels.filter((l) => l.state === 'locked')).toEqual([]);
    expect(stateOf(p, 10, true).state).toBe('done');
    expect(r.levels.filter((l) => l.state === 'open')).toHaveLength(11);
    expect(gateStates(r.villageOpen, true)).toEqual({ giay: true, det: true, 'khac-dau': true, bac: true });
  });
});
