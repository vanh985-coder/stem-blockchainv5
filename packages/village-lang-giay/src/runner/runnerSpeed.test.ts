import { describe, expect, it } from 'vitest';
import { RUNNER_SPEC as SPEC, RUNNER_TUNING as T, SPEED_BOOST } from './runnerConfig';
import { createRunner, speedAt, stepRunner, type Row, type RunnerState } from './runnerLogic';
import { VIEW_AHEAD } from './runnerView';

/**
 * P4a: tăng tốc 20% ở mọi vòng. Các phép kiểm dưới đây bảo đảm tăng tốc không sinh tình huống không thể vượt:
 * khoảng sinh chướng ngại và quãng nhảy/trượt đều tính theo THỜI GIAN (tỉ lệ với tốc độ), còn rơm và trang rơi, vốn tính theo mét, được nới theo tốc độ.
 */
const DT = 1 / 60;

function ghostRun(rows: number, seed: number, onStep: (s: RunnerState) => void): RunnerState {
  const s = createRunner({ seed, rounds: 1_000_000, ghost: true, recordRows: true });
  let guard = 0;
  while (s.rowLog!.length < rows && guard++ < 2_000_000) {
    if (s.phase === 'quiz') stepRunner(s, s.quiz!.answered === null ? { answer: true } : { resume: true }, DT);
    else stepRunner(s, {}, DT);
    onStep(s);
  }
  return s;
}

const near = (r: Row) => Math.min(r.z - 0.5, ...r.cells.map((c) => (c ? c.z0 : Infinity)));
const end = (r: Row) => Math.max(r.z, ...r.cells.map((c) => (c ? c.z1 : r.z)));

describe('P4a: tăng tốc 20% mà vẫn vượt được', () => {
  it('tốc độ mới đúng 1,2 lần mức cũ (12 / 0,36 / 21,6) và các số khác của màn không đổi', () => {
    expect(SPEED_BOOST).toBe(1.2);
    expect(SPEC.speed.start).toBeCloseTo(10 * SPEED_BOOST, 9);
    expect(SPEC.speed.add).toBeCloseTo(0.3 * SPEED_BOOST, 9);
    expect(SPEC.speed.max).toBeCloseTo(18 * SPEED_BOOST, 9);
    expect(SPEC.speed.everySec).toBe(5);
    expect(SPEC.quizSec).toBe(15);
    expect(SPEC.hearts).toBe(3);
    expect(SPEC.rounds).toBe(4);
    expect(SPEC.roundSec).toBe(25);
    expect(SPEC.jump).toEqual({ v0: 7, v0Boots: 10, gravity: 22 });
    expect(SPEC.slide).toEqual({ sec: 0.6, height: 0.6 });
    expect(SPEC.score).toEqual({ perPage: 10, perCoin: 1, perMeters: 10, perCorrect: 30 });
  });

  it('khoảng thời gian giữa mép hai hàng liên tiếp đủ cho một cú nhảy kể cả khi có guốc mộc (0,91 giây) ở mọi tốc độ', () => {
    const jumpBoots = (2 * SPEC.jump.v0Boots) / SPEC.jump.gravity;
    expect(jumpBoots).toBeCloseTo(0.909, 2);
    for (const seed of [1, 2, 3, 4]) {
      const s = ghostRun(600, seed, () => {});
      const rows = s.rowLog!;
      let minTime = Infinity;
      for (let i = 1; i < rows.length; i++) {
        const t = (near(rows[i]) - end(rows[i - 1])) / rows[i].speedBasis;
        minTime = Math.min(minTime, t);
        expect(t, `seed ${seed} hàng ${rows[i].id}`).toBeGreaterThan(jumpBoots);
      }
      expect(minTime).toBeGreaterThan(0.95);
    }
  });

  it('tốc độ chạy thật không bao giờ vượt tốc độ dùng để tính khoảng cách hàng (không có đoạn ngắn hơn luật)', () => {
    for (const seed of [1, 2]) {
      const s = ghostRun(300, seed, () => {});
      for (const r of s.rowLog!) expect(r.speedBasis).toBeLessThanOrEqual(SPEC.speed.max + 1e-9);
    }
  });

  it('rơm {phanDien} ném: sau khi hạ xuống người chơi còn ≥ 0,52 giây tới nó (mức xấu nhất của tốc độ cũ), ở mọi tốc độ', () => {
    let throws = 0;
    let minLead = Infinity;
    for (const seed of [1, 2, 3]) {
      ghostRun(500, seed, (s) => {
        for (const e of s.events) {
          if (e.type !== 'throw') continue;
          throws++;
          const lead = (e.z - s.z) / speedAt(s.time) - T.throwFlightSec;
          minLead = Math.min(minLead, lead);
        }
      });
    }
    expect(throws).toBeGreaterThan(50);
    expect(minLead).toBeGreaterThanOrEqual(0.52 - 0.03); // 0,03: một bước mô phỏng (tốc độ × bước) giữa lúc ném và lúc đọc
  });

  it('trang {phanDien} làm rơi: người chơi còn ≥ 0,11 giây sau khi trang nằm xuống mới tới nơi', () => {
    let drops = 0;
    let minLead = Infinity;
    for (const seed of [1, 2, 3]) {
      ghostRun(500, seed, (s) => {
        for (const e of s.events) {
          if (e.type !== 'drop') continue;
          drops++;
          minLead = Math.min(minLead, (e.z - s.z) / speedAt(s.time) - SPEC_DROP_FLIGHT);
        }
      });
    }
    expect(drops).toBeGreaterThan(10);
    expect(minLead).toBeGreaterThanOrEqual(0.11 - 0.03);
  });

  it('khoảng báo trước: chướng ngại hiện ở mức Thấp (tầm nhìn 60 mét) cách ít nhất 2,5 giây ở tốc độ tối đa, đủ để nhảy hoặc trượt (≈ 0,6 giây)', () => {
    expect(VIEW_AHEAD.low / SPEC.speed.max).toBeGreaterThanOrEqual(2.5);
    expect(VIEW_AHEAD.low / SPEC.speed.max).toBeGreaterThan(4 * SPEC.slide.sec);
  });

  it('sau mỗi câu hỏi, đoạn chạy lại tăng tốc không gặp chướng ngại ngay (xóa 14 mét phía trước) ở tốc độ lớn nhất', () => {
    // chạy chậm dần 1,2 giây rồi dừng: quãng đường chậm dần = tốc độ × 1,2 ÷ 2 ≤ 13 mét < 14 mét xóa; tăng tốc lại 1 giây = tốc độ ÷ 2 ≤ 10,8 mét
    expect((SPEC.speed.max * T.slowSec) / 2).toBeLessThan(T.clearAhead);
    expect((SPEC.speed.max * T.resumeSec) / 2).toBeLessThan(T.clearAhead);
  });
});

const SPEC_DROP_FLIGHT = T.drop.flightSec;
