import { describe, expect, it } from 'vitest';
import { FIXED_STEP, commandToInput } from './runnerCommands';
import { createRunner, makeCell, stepRunner, type RunnerInput } from './runnerLogic';
import { RunnerSession } from './runnerSession';

describe('RunnerSession: bước cố định và nội suy', () => {
  it('chạy khung hình dài ngắn khác nhau cho cùng kết quả như chạy thẳng các bước 1/60 giây (cùng hạt giống)', () => {
    const a = new RunnerSession({ seed: 5, rounds: 1_000_000 });
    const frames = [0.011, 0.023, 0.017, 0.009, 0.031, 0.016];
    let total = 0;
    for (let i = 0; i < 90; i++) {
      const dt = frames[i % frames.length];
      a.update(dt, false);
      total += dt;
    }
    const b = createRunner({ seed: 5, rounds: 1_000_000 });
    for (let i = 0; i < a.steps; i++) stepRunner(b, {}, FIXED_STEP);
    expect(a.state.z).toBeCloseTo(b.z, 9);
    expect(a.state.hearts).toBe(b.hearts);
    expect(a.steps).toBeGreaterThan(Math.floor(total * 60) - 2);
    expect(a.steps).toBeLessThanOrEqual(Math.ceil(total * 60));
  });

  it('mỗi bước dùng đúng một lệnh trong hàng đợi, theo thứ tự', () => {
    const s = new RunnerSession({ seed: 1, rounds: 1_000_000 });
    s.command('left');
    s.command('left');
    s.command('right');
    s.update(FIXED_STEP, false);
    expect(s.state.lane).toBe(2);
    s.update(FIXED_STEP, false);
    expect(s.state.lane).toBe(2); // lệnh thứ hai vẫn là +1 nhưng đã ở mép
    s.update(FIXED_STEP, false);
    expect(s.state.lane).toBe(1);
    expect(s.queue.length).toBe(0);
  });

  it('lệnh giống hệt gọi thẳng stepRunner với commandToInput', () => {
    const s = new RunnerSession({ seed: 2, rounds: 1_000_000 });
    const r = createRunner({ seed: 2, rounds: 1_000_000 });
    s.command('jump');
    s.update(FIXED_STEP, false);
    const input: RunnerInput = {};
    stepRunner(r, commandToInput('jump', input), FIXED_STEP);
    expect(s.state.y).toBeCloseTo(r.y, 12);
    expect(s.state.grounded).toBe(r.grounded);
  });

  it('tạm dừng thì không chạy gì và bỏ thời gian dồn; tiếp tục thì chạy tiếp, không nhảy vọt', () => {
    const s = new RunnerSession({ seed: 3, rounds: 1_000_000 });
    s.update(0.1, false);
    const z = s.state.z;
    const steps = s.steps;
    expect(s.update(5, true)).toBe(0);
    expect(s.state.z).toBe(z);
    expect(s.steps).toBe(steps);
    const n = s.update(FIXED_STEP, false);
    expect(n).toBeLessThanOrEqual(1);
  });

  it('vị trí vẽ nội suy nằm giữa bước trước và bước hiện tại, theo alpha', () => {
    const s = new RunnerSession({ seed: 4, rounds: 1_000_000 });
    s.update(FIXED_STEP * 2 + 0.004, false); // dư 0,004 giây (khoảng 24% bước)
    const v = s.refreshView();
    expect(v.z).toBeGreaterThanOrEqual(s.prev.z);
    expect(v.z).toBeLessThanOrEqual(s.cur.z);
    const a = s.stepper.alpha;
    expect(v.z).toBeCloseTo(s.prev.z + (s.cur.z - s.prev.z) * a, 9);
    expect(a).toBeGreaterThan(0.1);
    expect(a).toBeLessThan(0.5);
    // vị trí {phanDien} luôn ở phía trước 12 đến 15 đơn vị
    expect(v.villainZ - v.z).toBeGreaterThanOrEqual(12 - 0.01);
    expect(v.villainZ - v.z).toBeLessThanOrEqual(15 + 0.01);
  });

  it('hết tim thì ván kết thúc: không chạy thêm, vị trí vẽ đứng yên, có điểm', () => {
    const s = new RunnerSession({ seed: 6, rounds: 1_000_000 });
    s.state.hearts = 1;
    s.state.autoSpawn = false;
    const c = s.state.z + 2;
    s.state.rows = [{ id: 1, z: c, cells: [null, makeCell('block', c, 1), null], pathLane: 1, speedBasis: 8, boots: false, gap: 10 }];
    for (let i = 0; i < 60 && !s.over; i++) s.update(FIXED_STEP, false);
    expect(s.over).toBe(true);
    expect(s.state.over).toBe('hearts');
    const z = s.state.z;
    expect(s.update(1, false)).toBe(0);
    expect(s.state.z).toBe(z);
    expect(s.refreshView().z).toBeCloseTo(s.cur.z, 12);
    expect(s.score).toBeGreaterThanOrEqual(0);
  });

  it('quá 25 giây thì hết vòng và vào pha hỏi (bước 12: đủ 4 vòng)', () => {
    const s = new RunnerSession({ seed: 7, rounds: 1_000_000 });
    s.state.ghost = true;
    for (let i = 0; i < 60 * 27; i++) s.update(FIXED_STEP, false);
    expect(s.state.phase).toBe('quiz');
    expect(s.state.time).toBeGreaterThanOrEqual(25);
    expect(s.state.time).toBeLessThan(25.1);
  });
});

describe('RunnerSession: câu hỏi giữa ván và sự kiện', () => {
  const toQuiz = (s: RunnerSession) => {
    s.state.ghost = true;
    for (let i = 0; i < 60 * 40 && s.state.phase !== 'quiz'; i++) s.update(FIXED_STEP, false);
    s.state.ghost = false;
  };

  it('sau 25 giây chạy chậm lại rồi vào pha hỏi; đúng được +3 trang, chạy tiếp sau khi xem giải thích', () => {
    const s = new RunnerSession({ seed: 11 });
    toQuiz(s);
    expect(s.state.phase).toBe('quiz');
    expect(s.state.quiz!.round).toBe(0);
    const pages = s.state.pages;
    s.answerQuiz(true);
    s.update(FIXED_STEP, false);
    expect(s.state.pages).toBe(pages + 3);
    expect(s.state.quiz!.answered).toBe(true);
    s.update(0.5, false);
    expect(s.state.phase).toBe('quiz'); // chưa bấm "chạy tiếp"
    s.resumeQuiz();
    s.update(FIXED_STEP, false);
    expect(s.state.phase).toBe('resume');
    expect(s.state.round).toBe(1);
  });

  it('sai: mất 1 tim; chỉ nhận câu trả lời đầu tiên; hết 15 giây không trả lời cũng mất 1 tim', () => {
    const a = new RunnerSession({ seed: 12 });
    toQuiz(a);
    a.answerQuiz(false);
    a.answerQuiz(true);
    a.update(FIXED_STEP * 2, false);
    expect(a.state.hearts).toBe(2);
    expect(a.state.correct).toBe(0);
    const b = new RunnerSession({ seed: 13 });
    toQuiz(b);
    for (let i = 0; i < 60 * 15 + 5; i++) b.update(FIXED_STEP, false);
    expect(b.state.quiz!.timedOut).toBe(true);
    expect(b.state.hearts).toBe(2);
  });

  it('sự kiện của mọi bước trong một lần update được gom lại (không chỉ bước cuối)', () => {
    const s = new RunnerSession({ seed: 14 });
    s.state.ghost = true;
    s.command('jump');
    s.update(FIXED_STEP * 3, false);
    expect(s.frameEvents.some((e) => e.type === 'jump')).toBe(true);
    s.update(FIXED_STEP, false);
    expect(s.frameEvents.every((e) => e.type !== 'jump')).toBe(true);
  });

  it('hết 4 vòng (trả lời đủ) thì kết thúc "done"; điểm tính đủ phần', () => {
    const s = new RunnerSession({ seed: 15 });
    s.state.ghost = true;
    let guard = 0;
    while (!s.over && guard++ < 60 * 400) {
      if (s.state.phase === 'quiz') {
        if (s.state.quiz!.answered === null) s.answerQuiz(true);
        else s.resumeQuiz();
      }
      s.update(FIXED_STEP, false);
    }
    expect(s.state.over).toBe('done');
    expect(s.state.correct).toBe(4);
    expect(s.score).toBeGreaterThanOrEqual(4 * 30 + 12 * 10);
  });
});
