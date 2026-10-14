import { describe, expect, it } from 'vitest';
import { FIXED_STEP, commandToInput } from './runnerCommands';
import { createRunner, stepRunner, type RunnerInput } from './runnerLogic';
import { RunnerSession } from './runnerSession';

describe('RunnerSession: bước cố định và nội suy', () => {
  it('chạy khung hình dài ngắn khác nhau cho cùng kết quả như chạy thẳng các bước 1/60 giây (cùng hạt giống)', () => {
    const a = new RunnerSession({ seed: 5, noRounds: true });
    const frames = [0.011, 0.023, 0.017, 0.009, 0.031, 0.016];
    let total = 0;
    for (let i = 0; i < 90; i++) {
      const dt = frames[i % frames.length];
      a.update(dt, false);
      total += dt;
    }
    const b = createRunner({ seed: 5, noRounds: true });
    for (let i = 0; i < a.steps; i++) stepRunner(b, {}, FIXED_STEP);
    expect(a.state.z).toBeCloseTo(b.z, 9);
    expect(a.state.hearts).toBe(b.hearts);
    expect(a.steps).toBeGreaterThan(Math.floor(total * 60) - 2);
    expect(a.steps).toBeLessThanOrEqual(Math.ceil(total * 60));
  });

  it('mỗi bước dùng đúng một lệnh trong hàng đợi, theo thứ tự', () => {
    const s = new RunnerSession({ seed: 1, noRounds: true });
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
    const s = new RunnerSession({ seed: 2, noRounds: true });
    const r = createRunner({ seed: 2, noRounds: true });
    s.command('jump');
    s.update(FIXED_STEP, false);
    const input: RunnerInput = {};
    stepRunner(r, commandToInput('jump', input), FIXED_STEP);
    expect(s.state.y).toBeCloseTo(r.y, 12);
    expect(s.state.grounded).toBe(r.grounded);
  });

  it('tạm dừng thì không chạy gì và bỏ thời gian dồn; tiếp tục thì chạy tiếp, không nhảy vọt', () => {
    const s = new RunnerSession({ seed: 3, noRounds: true });
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
    const s = new RunnerSession({ seed: 4, noRounds: true });
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
    const s = new RunnerSession({ seed: 6, noRounds: true });
    s.state.hearts = 1;
    s.state.autoSpawn = false;
    const c = s.state.z + 2;
    s.state.rows = [{ id: 1, z: c, cells: [null, { kind: 'block', variant: 0, z0: c - 0.6, z1: c + 0.6, bottom: 0, top: 2.5, thrown: false, landAt: 0, spent: false }, null], pathLane: 1, speedBasis: 8, boots: false, gap: 10 }];
    for (let i = 0; i < 60 && !s.over; i++) s.update(FIXED_STEP, false);
    expect(s.over).toBe(true);
    expect(s.state.over).toBe('hearts');
    const z = s.state.z;
    expect(s.update(1, false)).toBe(0);
    expect(s.state.z).toBe(z);
    expect(s.refreshView().z).toBeCloseTo(s.cur.z, 12);
    expect(s.score).toBeGreaterThanOrEqual(0);
  });

  it('chạy không giới hạn vòng (noRounds): quá 25 giây vẫn chạy, không vào pha hỏi', () => {
    const s = new RunnerSession({ seed: 7, noRounds: true });
    s.state.ghost = true;
    for (let i = 0; i < 60 * 30; i++) s.update(FIXED_STEP, false);
    expect(s.state.phase).toBe('run');
    expect(s.state.time).toBeGreaterThan(29);
  });
});
