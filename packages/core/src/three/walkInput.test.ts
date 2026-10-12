import { describe, expect, it } from 'vitest';
import {
  MIN_TOUCH_TARGET,
  RUN_THRESHOLD,
  STICK_DEADZONE,
  STICK_RADIUS,
  actionForKey,
  applyKey,
  clearKeys,
  createKeyState,
  isLeftHalf,
  keyAxis,
  knobOffset,
  runFromStick,
  stickFromDrag,
  type Axis,
} from './walkInput';

const axis: Axis = { x: 0, y: 0 };

describe('ánh xạ phím', () => {
  it('WASD, mũi tên, Shift, Space, E, Esc', () => {
    expect(actionForKey('KeyW')).toBe('forward');
    expect(actionForKey('ArrowUp')).toBe('forward');
    expect(actionForKey('KeyS')).toBe('back');
    expect(actionForKey('ArrowDown')).toBe('back');
    expect(actionForKey('KeyA')).toBe('left');
    expect(actionForKey('ArrowLeft')).toBe('left');
    expect(actionForKey('KeyD')).toBe('right');
    expect(actionForKey('ArrowRight')).toBe('right');
    expect(actionForKey('ShiftLeft')).toBe('run');
    expect(actionForKey('ShiftRight')).toBe('run');
    expect(actionForKey('Space')).toBe('jump');
    expect(actionForKey('KeyE')).toBe('interact');
    expect(actionForKey('Escape')).toBe('menu');
    expect(actionForKey('KeyQ')).toBeNull();
  });
});

describe('vectơ đi từ phím', () => {
  const press = (codes: string[]) => {
    const k = createKeyState();
    const held = new Set<string>();
    for (const c of codes) applyKey(k, held, c, true);
    return keyAxis(k, axis);
  };
  it('một phím: tiến, lùi, trái, phải', () => {
    expect(press(['KeyW'])).toEqual({ x: 0, y: 1 });
    expect(press(['KeyS'])).toEqual({ x: 0, y: -1 });
    expect(press(['KeyD'])).toEqual({ x: 1, y: 0 });
    expect(press(['KeyA'])).toEqual({ x: -1, y: 0 });
  });
  it('hai phím chéo: độ dài 1', () => {
    const a = press(['KeyW', 'KeyD']);
    expect(Math.hypot(a.x, a.y)).toBeCloseTo(1, 9);
    expect(a.x).toBeGreaterThan(0);
    expect(a.y).toBeGreaterThan(0);
  });
  it('hai phím ngược nhau triệt tiêu', () => {
    expect(press(['KeyW', 'KeyS'])).toEqual({ x: 0, y: 0 });
    expect(press(['KeyA', 'KeyD'])).toEqual({ x: 0, y: 0 });
  });
  it('W và ↑ cùng giữ, nhả một phím vẫn đang tiến', () => {
    const k = createKeyState();
    const held = new Set<string>();
    applyKey(k, held, 'KeyW', true);
    applyKey(k, held, 'ArrowUp', true);
    applyKey(k, held, 'KeyW', false);
    expect(keyAxis(k, axis).y).toBe(1);
    applyKey(k, held, 'ArrowUp', false);
    expect(keyAxis(k, axis).y).toBe(0);
  });
  it('sự kiện lặp của phím đang giữ bị bỏ qua (không đếm đôi), nhả phím lạ không làm âm', () => {
    const k = createKeyState();
    const held = new Set<string>();
    expect(applyKey(k, held, 'KeyW', true)).toBe('forward');
    expect(applyKey(k, held, 'KeyW', true)).toBeNull();
    applyKey(k, held, 'KeyW', false);
    expect(k.forward).toBe(0);
    expect(applyKey(k, held, 'KeyW', false)).toBeNull();
    expect(k.forward).toBe(0);
  });
  it('Shift là chạy, nhả thì hết', () => {
    const k = createKeyState();
    const held = new Set<string>();
    applyKey(k, held, 'ShiftLeft', true);
    expect(k.run).toBe(1);
    applyKey(k, held, 'ShiftLeft', false);
    expect(k.run).toBe(0);
  });
  it('phím nhảy, tương tác, menu trả về hành động nhưng không đổi trạng thái đi', () => {
    const k = createKeyState();
    const held = new Set<string>();
    expect(applyKey(k, held, 'Space', true)).toBe('jump');
    expect(applyKey(k, held, 'KeyE', true)).toBe('interact');
    expect(applyKey(k, held, 'Escape', true)).toBe('menu');
    expect(k).toEqual(createKeyState());
  });
  it('clearKeys thả hết phím', () => {
    const k = createKeyState();
    applyKey(k, new Set(), 'KeyW', true);
    applyKey(k, new Set(), 'ShiftLeft', true);
    clearKeys(k);
    expect(k).toEqual(createKeyState());
  });
});

describe('cần điều khiển động', () => {
  it('đẩy lên (y màn hình giảm) là tiến lên; sang phải là x dương', () => {
    stickFromDrag(0, -STICK_RADIUS, STICK_RADIUS, axis);
    expect(axis.y).toBeCloseTo(1, 9);
    expect(axis.x).toBeCloseTo(0, 9);
    stickFromDrag(STICK_RADIUS, 0, STICK_RADIUS, axis);
    expect(axis.x).toBeCloseTo(1, 9);
  });
  it('trong vùng chết thì không đi', () => {
    expect(stickFromDrag(1, 1, STICK_RADIUS, axis)).toBe(0);
    expect(axis).toEqual({ x: 0, y: 0 });
    expect(stickFromDrag(STICK_RADIUS * STICK_DEADZONE * 0.99, 0, STICK_RADIUS, axis)).toBe(0);
  });
  it('kéo xa hơn bán kính thì độ lớn chặn ở 1', () => {
    expect(stickFromDrag(0, -500, STICK_RADIUS, axis)).toBe(1);
    expect(Math.hypot(axis.x, axis.y)).toBeCloseTo(1, 9);
  });
  it('đẩy quá 80% là chạy; đúng 80% thì còn đi', () => {
    expect(RUN_THRESHOLD).toBe(0.8);
    expect(runFromStick(0.8)).toBe(false);
    expect(runFromStick(0.81)).toBe(true);
    expect(runFromStick(stickFromDrag(0, -STICK_RADIUS * 0.5, STICK_RADIUS, axis))).toBe(false);
    expect(runFromStick(stickFromDrag(0, -STICK_RADIUS * 0.9, STICK_RADIUS, axis))).toBe(true);
  });
  it('núm cần bị chặn trong bán kính', () => {
    const o = { x: 0, y: 0 };
    knobOffset(300, 400, STICK_RADIUS, o);
    expect(Math.hypot(o.x, o.y)).toBeCloseTo(STICK_RADIUS, 9);
    knobOffset(10, 0, STICK_RADIUS, o);
    expect(o).toEqual({ x: 10, y: 0 });
  });
  it('nửa trái màn hình là cần điều khiển, nửa phải là xoay camera', () => {
    expect(isLeftHalf(100, 800)).toBe(true);
    expect(isLeftHalf(399, 800)).toBe(true);
    expect(isLeftHalf(400, 800)).toBe(false);
    expect(isLeftHalf(700, 800)).toBe(false);
  });
  it('vùng bấm tối thiểu 44px', () => {
    expect(MIN_TOUCH_TARGET).toBe(44);
  });
});
