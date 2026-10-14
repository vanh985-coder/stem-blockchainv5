import { describe, expect, it } from 'vitest';
import { CAMERA, blinkVisible, chaseCamera, lerp, shakeAmount, type CameraPose } from './runnerView';

const pose = (): CameraPose => ({ px: 0, py: 0, pz: 0, tx: 0, ty: 0, tz: 0 });

describe('camera sau lưng', () => {
  it('ở sau lưng, hơi cao, nhìn về phía trước', () => {
    const p = chaseCamera(pose(), 100, 0, 0, 0, 0);
    expect(p.pz).toBeCloseTo(100 - CAMERA.back, 9);
    expect(p.py).toBeCloseTo(CAMERA.height, 9);
    expect(p.tz).toBeCloseTo(100 + CAMERA.lookAhead, 9);
    expect(p.px).toBe(0);
    expect(p.py).toBeGreaterThan(p.ty);
  });
  it('theo nhân vật một phần khi đổi làn và khi nhảy', () => {
    const a = chaseCamera(pose(), 0, 2, 0, 0, 0);
    expect(a.px).toBeCloseTo(2 * CAMERA.followX, 9);
    expect(a.px).toBeLessThan(2);
    const b = chaseCamera(pose(), 0, 0, 1.1, 0, 0);
    expect(b.py).toBeGreaterThan(CAMERA.height);
  });
  it('rung khi va, hết rung thì đứng yên; biên độ giới hạn', () => {
    const still = chaseCamera(pose(), 0, 0, 0, 0, 1.234);
    expect(still.px).toBe(0);
    let max = 0;
    for (let t = 0; t < 2; t += 0.013) {
      const p = chaseCamera(pose(), 0, 0, 0, 1, t);
      max = Math.max(max, Math.abs(p.px), Math.abs(p.py - CAMERA.height));
    }
    expect(max).toBeGreaterThan(0.02);
    expect(max).toBeLessThanOrEqual(CAMERA.shakeAmplitude + 1e-9);
  });
  it('ghi vào đối tượng đã có (không tạo đối tượng mới)', () => {
    const p = pose();
    expect(chaseCamera(p, 5, 0, 0, 0, 0)).toBe(p);
  });
});

describe('rung và nhấp nháy sau va chạm', () => {
  it('rung giảm từ 1 về 0 trong nửa giây đầu của đoạn nhấp nháy', () => {
    expect(shakeAmount(1, 1)).toBe(1);
    expect(shakeAmount(0.75, 1)).toBeCloseTo(0.5, 9);
    expect(shakeAmount(0.5, 1)).toBe(0);
    expect(shakeAmount(0, 1)).toBe(0);
  });
  it('nhấp nháy: hiện và ẩn xen kẽ khi đang nhấp nháy; không nhấp nháy thì luôn hiện', () => {
    expect(blinkVisible(0, 0.05)).toBe(true);
    expect(blinkVisible(0, 0.15)).toBe(true);
    const states = new Set([0.0, 0.1, 0.2, 0.3].map((t) => blinkVisible(0.5, t)));
    expect(states.size).toBe(2);
  });
  it('lerp', () => {
    expect(lerp(2, 4, 0)).toBe(2);
    expect(lerp(2, 4, 1)).toBe(4);
    expect(lerp(2, 4, 0.5)).toBe(3);
  });
});
