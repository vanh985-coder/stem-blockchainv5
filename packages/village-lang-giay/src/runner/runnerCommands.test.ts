import { describe, expect, it } from 'vitest';
import { CommandQueue, FIXED_STEP, FixedStepper, MAX_STEPS_PER_FRAME, SWIPE_MIN_PX, commandToInput, keyToCommand, swipeToCommand } from './runnerCommands';
import type { RunnerInput } from './runnerLogic';

describe('phím máy tính (spec 05: ←/→ hoặc A/D đổi làn; ↑/W/Space nhảy; ↓/S trượt)', () => {
  it('ánh xạ đủ các phím', () => {
    expect(['ArrowLeft', 'KeyA'].map(keyToCommand)).toEqual(['left', 'left']);
    expect(['ArrowRight', 'KeyD'].map(keyToCommand)).toEqual(['right', 'right']);
    expect(['ArrowUp', 'KeyW', 'Space'].map(keyToCommand)).toEqual(['jump', 'jump', 'jump']);
    expect(['ArrowDown', 'KeyS'].map(keyToCommand)).toEqual(['slide', 'slide']);
    expect(keyToCommand('KeyQ')).toBeNull();
    expect(keyToCommand('Enter')).toBeNull();
  });
});

describe('vuốt trên điện thoại', () => {
  it('bốn hướng; hướng nào dài hơn thì thắng', () => {
    expect(swipeToCommand(-60, 5)).toBe('left');
    expect(swipeToCommand(60, -5)).toBe('right');
    expect(swipeToCommand(5, -60)).toBe('jump');
    expect(swipeToCommand(-5, 60)).toBe('slide');
    expect(swipeToCommand(-50, -40)).toBe('left');
    expect(swipeToCommand(-40, -50)).toBe('jump');
  });
  it('ngắn hơn ngưỡng thì là chạm, không phải vuốt', () => {
    expect(swipeToCommand(SWIPE_MIN_PX - 1, 0)).toBeNull();
    expect(swipeToCommand(0, -(SWIPE_MIN_PX - 1))).toBeNull();
    expect(swipeToCommand(0, 0)).toBeNull();
    expect(swipeToCommand(SWIPE_MIN_PX, 0)).toBe('right');
  });
});

describe('lệnh trên màn hình thành lệnh cho mô phỏng', () => {
  it('bên trái màn hình là làn +1 (x = +2), bên phải là làn −1: camera nhìn về +z nên phải màn hình là x nhỏ', () => {
    const a: RunnerInput = {};
    expect(commandToInput('left', a).move).toBe(1);
    const b: RunnerInput = {};
    expect(commandToInput('right', b).move).toBe(-1);
    const c: RunnerInput = {};
    expect(commandToInput('jump', c).jump).toBe(true);
    const d: RunnerInput = {};
    expect(commandToInput('slide', d).slide).toBe(true);
  });
});

describe('hàng đợi lệnh', () => {
  it('vào trước ra trước, đầy thì bỏ lệnh mới, rỗng thì null', () => {
    const q = new CommandQueue(3);
    expect(q.shift()).toBeNull();
    expect(q.push('left')).toBe(true);
    expect(q.push('jump')).toBe(true);
    expect(q.push('slide')).toBe(true);
    expect(q.push('right')).toBe(false);
    expect(q.length).toBe(3);
    expect([q.shift(), q.shift(), q.shift(), q.shift()]).toEqual(['left', 'jump', 'slide', null]);
  });
  it('dùng vòng tròn nhiều lần không lẫn', () => {
    const q = new CommandQueue(2);
    for (let i = 0; i < 10; i++) {
      q.push(i % 2 ? 'left' : 'right');
      expect(q.shift()).toBe(i % 2 ? 'left' : 'right');
    }
    q.push('jump');
    q.clear();
    expect(q.length).toBe(0);
    expect(q.shift()).toBeNull();
  });
});

describe('bước thời gian cố định 1/60 giây', () => {
  it('đúng 1/60 giây', () => {
    expect(FIXED_STEP).toBeCloseTo(1 / 60, 12);
  });
  it('tổng số bước chạy trong 1 giây bằng 60 dù các khung hình dài ngắn khác nhau', () => {
    for (const frames of [[1 / 144], [1 / 60], [1 / 30], [0.011, 0.023, 0.017, 0.009, 0.031]]) {
      const st = new FixedStepper();
      let t = 0;
      let steps = 0;
      let i = 0;
      while (t < 1) {
        const dt = frames[i++ % frames.length];
        steps += st.add(dt);
        t += dt;
      }
      // chênh nhiều nhất 1 bước (phần dồn chưa đủ một bước)
      expect(Math.abs(steps - Math.floor(t * 60)), `khung ${frames[0]}`).toBeLessThanOrEqual(1);
    }
  });
  it('alpha nằm trong [0, 1) và tăng dần giữa hai bước', () => {
    const st = new FixedStepper();
    st.add(0.004);
    const a1 = st.alpha;
    st.add(0.004);
    expect(st.alpha).toBeGreaterThan(a1);
    expect(st.alpha).toBeLessThan(1);
    st.add(0.02);
    expect(st.alpha).toBeGreaterThanOrEqual(0);
    expect(st.alpha).toBeLessThan(1);
  });
  it('khung hình quá dài (tab bị ẩn rồi hiện lại) chỉ chạy tối đa vài bước, không nhảy vọt', () => {
    const st = new FixedStepper();
    expect(st.add(5)).toBe(MAX_STEPS_PER_FRAME);
    expect(st.add(-1)).toBe(0);
    st.reset();
    expect(st.alpha).toBe(0);
  });
});
