import { describe, expect, it } from 'vitest';
import { climaxPath, openClimax } from '../config/urls';
import { climaxUi } from '../content/climax';
import { CLIMAX_LEVEL, canWatchClimax, climaxPending } from './climaxState';
import { withClimaxSeen } from './gameTips';
import { recordLevelResult } from './record';
import { emptyProgress, type Progress } from './types';

const T0 = 1_700_000_000_000;
const play = (p: Progress, id: number, t = 0): Progress => {
  const lesson = [1, 4, 7, 10].includes(id);
  return recordLevelResult(p, id, lesson ? { stars: { de: 3, tb: 3, kho: 3 } } : { score: 100 }, T0 + t).progress;
};
const playAll = (p: Progress, ids: readonly number[]) => ids.reduce((a, id, i) => play(a, id, i), p);

describe('cao trào sau màn 12 khi các làng vào độc lập (P3a)', () => {
  it('chơi theo thứ tự: màn 12 là màn cuối, xong thì đủ 4 trang và cảnh xem được, chờ chiếu', () => {
    let p = playAll(emptyProgress(), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    expect(canWatchClimax(p)).toBe(false);
    p = play(p, CLIMAX_LEVEL, 20);
    expect(p.game.goldenPages).toBe(4);
    expect(canWatchClimax(p)).toBe(true);
    expect(climaxPending(p)).toBe(true);
  });

  it('màn 12 xong trước các làng khác: kết quả được ghi nhưng chưa đủ trang nên chưa xem được cảnh (không nói "đủ 4 trang" khi chưa đủ)', () => {
    const p = playAll(emptyProgress(), [10, 11, 12]);
    expect(p.levels[12].played).toBe(true);
    expect(p.game.goldenPages).toBe(0);
    expect(canWatchClimax(p)).toBe(false);
    expect(climaxPending(p)).toBe(false);
    const three = playAll(p, [1, 2, 3, 4, 5, 6, 7, 8]);
    expect(three.game.goldenPages).toBe(2);
    expect(canWatchClimax(three)).toBe(false);
  });

  it('đủ các làng còn thiếu về sau: cảnh xem được mà không phải chơi lại màn 12 (kết quả màn 12 giữ nguyên)', () => {
    let p = playAll(emptyProgress(), [10, 11, 12, 1, 2, 3, 4, 5, 7, 8, 9]);
    expect(p.game.goldenPages).toBe(1);
    const before12 = JSON.stringify(p.levels[12]);
    p = play(p, 6, 50); // làng Dệt xong: các trang 2, 3, 4 tới cùng lúc
    expect(p.game.goldenPages).toBe(4);
    expect(canWatchClimax(p)).toBe(true);
    expect(climaxPending(p)).toBe(true);
    expect(JSON.stringify(p.levels[12])).toBe(before12); // không chơi lại màn 12
  });

  it('đã chiếu (cờ climaxSeen): hết chờ nhưng vẫn xem lại được; trang không bị trao thêm', () => {
    let p = playAll(emptyProgress(), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(climaxPending(p)).toBe(true);
    p = { ...p, game: { ...p.game, data: withClimaxSeen(p.game.data) } };
    expect(climaxPending(p)).toBe(false);
    expect(canWatchClimax(p)).toBe(true);
    const again = play(p, 12, 99); // chơi lại màn 12
    expect(again.game.goldenPages).toBe(4);
    expect(climaxPending(again)).toBe(false);
  });

  it('chưa chơi màn 12 thì không xem được dù đã có 4 trang từ luật cũ', () => {
    const legacy = { ...emptyProgress(), game: { ...emptyProgress().game, goldenPages: 4 } };
    expect(canWatchClimax(legacy)).toBe(false);
  });

  it('đường dẫn và nút: mở thẳng cảnh ở màn 12, không phải chơi lại; chữ nằm trong content', () => {
    expect(climaxPath()).toBe('/lang/lang-bac/man/12?canh=cuoi');
    const calls: string[] = [];
    openClimax((to) => calls.push(to), true);
    expect(calls).toEqual(['/lang/lang-bac/man/12?canh=cuoi']);
    expect(climaxUi.xemCanhCuoi).toBe('Xem cảnh cuối');
    expect(climaxUi.canhCuoiCho).not.toMatch(/chơi lại màn 12 để/);
  });
});
