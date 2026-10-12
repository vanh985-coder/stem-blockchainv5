import { describe, expect, it } from 'vitest';
import { applyKey } from './walkInput';
import { combineInput, createWalkApi, resetWalkInput } from './walkApi';
import type { MoveInput } from './playerMotion';

const out = (): MoveInput => ({ x: 9, y: 9, run: false, jump: false });

describe('gộp lệnh phím và cần điều khiển', () => {
  it('không có gì thì không đi', () => {
    const api = createWalkApi();
    const o = out();
    combineInput(api.input, o);
    expect(o).toEqual({ x: 0, y: 0, run: false, jump: false });
  });
  it('phím: theo vectơ phím; Shift là chạy', () => {
    const api = createWalkApi();
    api.input.keyAxis.y = 1;
    api.input.keyRun = true;
    const o = out();
    combineInput(api.input, o);
    expect(o).toEqual({ x: 0, y: 1, run: true, jump: false });
  });
  it('cần điều khiển: đẩy dưới 80% là đi, quá 80% là chạy', () => {
    const api = createWalkApi();
    api.input.stick.y = 0.5;
    api.input.stickMag = 0.5;
    const o = out();
    combineInput(api.input, o);
    expect(o).toEqual({ x: 0, y: 0.5, run: false, jump: false });
    api.input.stick.y = 0.9;
    api.input.stickMag = 0.9;
    combineInput(api.input, o);
    expect(o.run).toBe(true);
  });
  it('đang đẩy cần thì cần thắng phím', () => {
    const api = createWalkApi();
    api.input.keyAxis.x = 1;
    api.input.stick.y = 1;
    api.input.stickMag = 1;
    const o = out();
    combineInput(api.input, o);
    expect(o.x).toBe(0);
    expect(o.y).toBe(1);
  });
  it('lệnh nhảy chỉ được tiêu thụ một lần', () => {
    const api = createWalkApi();
    api.input.jump = true;
    const o = out();
    combineInput(api.input, o);
    expect(o.jump).toBe(true);
    combineInput(api.input, o);
    expect(o.jump).toBe(false);
  });
  it('resetWalkInput thả hết phím, cần và lệnh nhảy nhưng giữ nguyên góc camera', () => {
    const api = createWalkApi(1.5);
    applyKey(api.keys, api.held, 'KeyW', true);
    api.input.keyAxis.y = 1;
    api.input.stickMag = 1;
    api.input.stick.x = 1;
    api.input.jump = true;
    api.camera.pitch = 0.9;
    resetWalkInput(api);
    const o = out();
    combineInput(api.input, o);
    expect(o).toEqual({ x: 0, y: 0, run: false, jump: false });
    expect(api.keys.forward).toBe(0);
    expect(api.held.size).toBe(0);
    expect(api.camera.yaw).toBe(1.5);
    expect(api.camera.pitch).toBe(0.9);
  });
});
