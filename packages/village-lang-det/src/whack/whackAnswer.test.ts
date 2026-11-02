import { describe, expect, it } from 'vitest';
import { WHACK_SPEC } from './whackConfig';
import { answerBoss, answerSpeed, bossClock, bossPoints, createWhackGame, hitLane, spawnMouse, stepWhack, type WhackState } from './whackLogic';

/** Ván trống, có khóa câu hỏi (đáp án đúng là C) và chuột câu hỏi đã đứng chờ giữa vùng đập. */
function atBoss(options = 4, correct = 2): WhackState {
  const s = createWhackGame(7, Array.from({ length: 10 }, () => ({ correct, options })));
  s.spawnIn = Infinity;
  s.coinIn = Infinity;
  s.ticks = Math.round(bossClock(0) / WHACK_SPEC.tick) - 1;
  stepWhack(s, WHACK_SPEC.tick);
  stepWhack(s, WHACK_SPEC.boss.runSeconds + 0.1);
  return s;
}

const laneOfOption = (s: WhackState, option: number): number => s.answer!.mice.find((m) => m.option === option)!.lane;

describe('P9: lượt đáp án (chuột đi từ dưới lên)', () => {
  it('chuột câu hỏi tới giữa vùng đập thì đứng chờ, không tự mở câu hỏi', () => {
    const s = atBoss();
    expect(s.phase).toBe('bossRun');
    expect(s.boss!.arrived).toBe(true);
    stepWhack(s, 20);
    expect(s.phase).toBe('bossRun');
    expect(s.boss!.pos).toBeCloseTo((WHACK_SPEC.zoneStart + WHACK_SPEC.zoneEnd) / 2, 9);
  });

  it('đập làn khác thì không mở; đập đúng làn của nó thì mở lượt đáp án, chuột thường đứng yên', () => {
    const s = atBoss();
    const m = spawnMouse(s, 'thuong', (s.boss!.lane + 1) % 4, 2);
    const other = hitLane(s, (s.boss!.lane + 2) % 4);
    expect(other[0].type).toBe('miss');
    expect(s.phase).toBe('bossRun');
    const ev = hitLane(s, s.boss!.lane);
    expect(ev[0].type).toBe('answerStart');
    expect(s.phase).toBe('answer');
    const pos = m.pos;
    stepWhack(s, 3);
    expect(m.pos).toBe(pos);
    expect(s.answer!.mice).toHaveLength(4);
    expect(s.answer!.mice.every((x) => x.pos > 0)).toBe(true);
  });

  it('4 chuột vàng ở 4 làn khác nhau, đi từ đầu làn, chậm hơn chuột thường nhiều', () => {
    const s = atBoss();
    hitLane(s, s.boss!.lane);
    const a = s.answer!;
    expect(new Set(a.mice.map((m) => m.lane)).size).toBe(4);
    expect(a.mice.every((m) => m.pos === 0)).toBe(true);
    expect(a.speed).toBeCloseTo(answerSpeed(18), 12);
    expect(a.speed).toBeLessThan(WHACK_SPEC.zoneStart / WHACK_SPEC.runSecondsStart / 3);
  });

  it('thứ tự A–D theo làn trộn theo seed: cùng seed cùng thứ tự, seed khác (thường) khác', () => {
    const lanes = (seed: number) => {
      const s = createWhackGame(seed);
      s.spawnIn = Infinity;
      s.coinIn = Infinity;
      s.ticks = Math.round(bossClock(0) / WHACK_SPEC.tick) - 1;
      stepWhack(s, WHACK_SPEC.tick);
      return s.boss!.laneOf.join('');
    };
    expect(lanes(5)).toBe(lanes(5));
    expect(new Set([1, 2, 3, 4, 5, 6, 7, 8].map(lanes)).size).toBeGreaterThan(3);
  });

  it('đập đúng chuột mang đáp án đúng trong vùng đập: kết quả đúng, điểm theo số giây còn lại, xoá 2 vết mực', () => {
    const s = atBoss();
    s.ink = 3;
    hitLane(s, s.boss!.lane);
    stepWhack(s, (WHACK_SPEC.zoneStart + 0.1) / s.answer!.speed);
    const m = s.answer!.mice.find((x) => x.option === 2)!;
    const ev = hitLane(s, m.lane);
    expect(ev[0]).toMatchObject({ type: 'bossQuiz' });
    expect(s.phase).toBe('quiz');
    expect(s.verdict).toMatchObject({ result: 'correct', option: 2, correct: 2 });
    const left = (WHACK_SPEC.laneLength - m.pos) / s.answer!.speed;
    expect(s.verdict!.secondsLeft).toBeCloseTo(left, 9);
    const out = answerBoss(s, s.verdict!.result, s.verdict!.secondsLeft);
    expect(out[0]).toMatchObject({ type: 'bossAnswer', result: 'correct', points: bossPoints(left), ink: 1 });
    expect(s.phase).toBe('play');
  });

  it('đập chuột mang đáp án sai: +1 vết mực, không điểm', () => {
    const s = atBoss();
    hitLane(s, s.boss!.lane);
    stepWhack(s, (WHACK_SPEC.zoneStart + 0.1) / s.answer!.speed);
    const m = s.answer!.mice.find((x) => x.option === 0)!;
    hitLane(s, m.lane);
    expect(s.verdict).toMatchObject({ result: 'wrong', option: 0 });
    const out = answerBoss(s, s.verdict!.result, s.verdict!.secondsLeft);
    expect(out[0]).toMatchObject({ result: 'wrong', points: 0, ink: 1 });
    expect(s.score).toBe(0);
  });

  it('đập chuột vàng khi chưa vào vùng đập: hụt, không phạt; để chuột chạy tới sổ: hết giờ, +1 vết mực', () => {
    const s = atBoss();
    hitLane(s, s.boss!.lane);
    stepWhack(s, 2);
    const miss = hitLane(s, laneOfOption(s, 2));
    expect(miss[0].type).toBe('miss');
    expect(s.phase).toBe('answer');
    stepWhack(s, 30);
    expect(s.phase).toBe('quiz');
    expect(s.verdict).toMatchObject({ result: 'timeout', option: null, secondsLeft: 0 });
    answerBoss(s, s.verdict!.result, s.verdict!.secondsLeft);
    expect(s.ink).toBe(1);
    expect(s.phase).toBe('play');
  });

  it('câu chỉ có 2 đáp án thì chỉ có 2 chuột vàng (A, B)', () => {
    const s = atBoss(2, 1);
    hitLane(s, s.boss!.lane);
    expect(s.answer!.mice.map((m) => m.option)).toEqual([0, 1]);
  });

  it('đồng hồ lịch, sinh chuột và đồng đứng yên trong lượt đáp án', () => {
    const s = atBoss();
    const clock = s.clock;
    hitLane(s, s.boss!.lane);
    stepWhack(s, 5);
    expect(s.clock).toBe(clock);
    expect(s.phase).toBe('answer');
  });
});
