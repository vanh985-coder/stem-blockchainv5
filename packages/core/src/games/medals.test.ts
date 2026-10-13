import { describe, expect, it } from 'vitest';
import { LEVELS } from '../content/levels';
import { recordLevelResult } from '../progress/record';
import { emptyProgress } from '../progress/types';
import { gameResultOf, medalOf, summarizeGame, type MedalThresholds } from './medals';

const RUNNER: MedalThresholds = [200, 380, 520];
const REBUILD: MedalThresholds = [150, 250, 330];

describe('mốc điểm', () => {
  it('Đồng, Bạc, Vàng theo ngưỡng (≥ ngưỡng thì đạt); dưới Đồng là 0', () => {
    expect([0, 199, 200, 379, 380, 519, 520, 100000].map((s) => medalOf(s, RUNNER))).toEqual([0, 0, 1, 1, 2, 2, 3, 3]);
    expect([149, 150, 249, 250, 329, 330].map((s) => medalOf(s, REBUILD))).toEqual([0, 1, 1, 2, 2, 3]);
  });
  it('điểm không hợp lệ thì 0', () => {
    expect(medalOf(Number.NaN, RUNNER)).toBe(0);
    expect(medalOf(-5, RUNNER)).toBe(0);
  });
});

describe('kết quả đưa cho lớp tiến độ', () => {
  it('sao "game" theo mốc, điểm làm tròn xuống, completed khi đạt ít nhất Đồng', () => {
    expect(gameResultOf(478.9, RUNNER)).toEqual({ stars: { game: 2 }, score: 478, completed: true });
    expect(gameResultOf(150, RUNNER)).toEqual({ stars: { game: 0 }, score: 150, completed: false });
    expect(gameResultOf(520, RUNNER)).toEqual({ stars: { game: 3 }, score: 520, completed: true });
    expect(gameResultOf(-3, RUNNER)).toEqual({ stars: { game: 0 }, score: 0, completed: false });
  });
});

describe('ghi tiến độ khi chơi xong game phụ (màn 2) bằng lớp tiến độ có sẵn', () => {
  const now = 1000;
  const play = (p = emptyProgress(), score = 0) => recordLevelResult(p, 2, gameResultOf(score, RUNNER), now);

  it('chơi xong dù điểm 0 (thua) vẫn là đã chơi, chưa có sao', () => {
    const { progress } = play(emptyProgress(), 0);
    expect(progress.levels[2]).toMatchObject({ played: true, completed: false, bestScore: 0 });
    expect(progress.levels[2].stars.game ?? 0).toBe(0);
  });

  it('điểm cao nhất lấy số lớn hơn, sao lấy mốc cao hơn; chơi tệ hơn không làm mất kỷ lục', () => {
    let p = play(emptyProgress(), 400).progress;
    expect(p.levels[2]).toMatchObject({ played: true, bestScore: 400, stars: { game: 2 }, completed: true });
    p = play(p, 250).progress;
    expect(p.levels[2]).toMatchObject({ bestScore: 400, stars: { game: 2 } });
    p = play(p, 600).progress;
    expect(p.levels[2]).toMatchObject({ bestScore: 600, stars: { game: 3 } });
  });

  it('xu: +10 cho mỗi sao mới, chơi lại cùng mốc không cộng thêm', () => {
    const a = play(emptyProgress(), 400);
    expect(a.coinsEarned).toBe(20);
    const b = play(a.progress, 410);
    expect(b.coinsEarned).toBe(0);
    const c = play(b.progress, 540);
    expect(c.coinsEarned).toBe(10);
  });

  it('màn 2 chơi xong thì màn 3 mở (đã chơi là đủ, không chặn đường), kể cả khi thua', () => {
    const p = play(emptyProgress(), 0).progress;
    expect(p.levels[2].played).toBe(true);
    // màn 3 là game: unlock theo "đã chơi" của màn 2 (xem unlock.test.ts); ở đây chỉ khẳng định màn 2 là game
    expect(LEVELS.find((l) => l.id === 2)?.kind).toBe('game');
  });
});

describe('tóm tắt cho màn kết quả', () => {
  it('kỷ lục mới khi điểm vượt điểm cao nhất cũ', () => {
    expect(summarizeGame(478.7, RUNNER, 300)).toEqual({ score: 478, medal: 2, newBest: true });
    expect(summarizeGame(300, RUNNER, 300)).toEqual({ score: 300, medal: 1, newBest: false });
    expect(summarizeGame(100, RUNNER, 300)).toEqual({ score: 100, medal: 0, newBest: false });
  });
  it('lần chơi đầu tiên: điểm > 0 là kỷ lục, điểm 0 thì không', () => {
    expect(summarizeGame(50, RUNNER, 0).newBest).toBe(true);
    expect(summarizeGame(0, RUNNER, 0).newBest).toBe(false);
  });
});
