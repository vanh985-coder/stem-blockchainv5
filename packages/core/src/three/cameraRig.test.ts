import { describe, expect, it } from 'vitest';
import {
  CAMERA_DISTANCE,
  CAMERA_HEIGHT,
  PITCH_DEFAULT,
  PITCH_MAX,
  PITCH_MIN,
  cameraOffset,
  LOOK_MAX_STEP,
  LOOK_PITCH_MAX,
  LOOK_PITCH_MIN,
  LOOK_RADIANS_PER_PIXEL,
  clampPitch,
  createCameraAngles,
  dragCamera,
  lookCamera,
  wrapYaw,
  type Vec3Out,
} from './cameraRig';

const out: Vec3Out = { x: 0, y: 0, z: 0 };

describe('camera sau lưng', () => {
  it('mặc định: ở sau lưng cách 7 (ngang), cao 4', () => {
    cameraOffset(0, PITCH_DEFAULT, out);
    expect(out.x).toBeCloseTo(0, 9);
    expect(out.y).toBeCloseTo(CAMERA_HEIGHT, 9);
    expect(out.z).toBeCloseTo(-CAMERA_DISTANCE, 9);
  });
  it('quay hướng nhìn: camera luôn ở phía sau, cách ngang 7 và cao 4', () => {
    for (const yaw of [0.5, 1.2, 2.5, -1, -3]) {
      cameraOffset(yaw, PITCH_DEFAULT, out);
      expect(Math.hypot(out.x, out.z)).toBeCloseTo(CAMERA_DISTANCE, 9);
      expect(out.y).toBeCloseTo(CAMERA_HEIGHT, 9);
      // phía sau: tích vô hướng với hướng nhìn (sin yaw, cos yaw) âm
      expect(out.x * Math.sin(yaw) + out.z * Math.cos(yaw)).toBeLessThan(0);
    }
  });
  it('ngẩng cao hơn thì camera lên cao và gần hơn theo chiều ngang, khoảng cách tới người chơi giữ nguyên', () => {
    cameraOffset(0, PITCH_DEFAULT, out);
    const r = Math.hypot(out.x, out.y, out.z);
    cameraOffset(0, 1, out);
    expect(Math.hypot(out.x, out.y, out.z)).toBeCloseTo(r, 9);
    expect(out.y).toBeGreaterThan(CAMERA_HEIGHT);
  });
});

describe('kéo để xoay camera', () => {
  it('kéo sang phải thì yaw tăng (cảnh trượt sang phải), kéo xuống thì camera nâng lên', () => {
    const cam = createCameraAngles(0);
    dragCamera(cam, 100, 0);
    expect(cam.yaw).toBeGreaterThan(0);
    const p0 = cam.pitch;
    dragCamera(cam, 0, 40);
    expect(cam.pitch).toBeGreaterThan(p0);
  });
  it('góc ngẩng bị giới hạn, kéo mãi cũng không lật', () => {
    const cam = createCameraAngles(0);
    dragCamera(cam, 0, 100000);
    expect(cam.pitch).toBe(PITCH_MAX);
    dragCamera(cam, 0, -100000);
    expect(cam.pitch).toBe(PITCH_MIN);
    expect(clampPitch(5)).toBe(PITCH_MAX);
  });
  it('yaw được đưa về (−π, π] khi quay nhiều vòng', () => {
    const cam = createCameraAngles(0);
    for (let i = 0; i < 100; i++) dragCamera(cam, 300, 0);
    expect(cam.yaw).toBeGreaterThan(-Math.PI);
    expect(cam.yaw).toBeLessThanOrEqual(Math.PI);
    expect(wrapYaw(Math.PI * 3)).toBeCloseTo(Math.PI, 9);
    expect(wrapYaw(-Math.PI * 2.5)).toBeCloseTo(-Math.PI / 2, 9);
  });
  it('kéo 0 pixel thì không đổi', () => {
    const cam = createCameraAngles(0.3);
    dragCamera(cam, 0, 0);
    expect(cam.yaw).toBeCloseTo(0.3, 12);
    expect(cam.pitch).toBeCloseTo(PITCH_DEFAULT, 12);
  });
});

describe('rê chuột khi khóa chuột (kiểu PUBG)', () => {
  /** Hướng nhìn của camera trên mặt đất và hướng bên phải màn hình. */
  const fwd = (yaw: number) => ({ x: Math.sin(yaw), z: Math.cos(yaw) });
  const right = (yaw: number) => ({ x: -Math.cos(yaw), z: Math.sin(yaw) });
  const dot = (a: { x: number; z: number }, b: { x: number; z: number }) => a.x * b.x + a.z * b.z;

  it('rê sang phải thì camera nhìn sang phải; sang trái thì nhìn sang trái', () => {
    for (const yaw0 of [0, 0.8, 2.4, -1.7]) {
      const cam = createCameraAngles(yaw0);
      const r = right(yaw0);
      lookCamera(cam, 40, 0);
      expect(dot(fwd(cam.yaw), r), `yaw ${yaw0}`).toBeGreaterThan(0);
      const cam2 = createCameraAngles(yaw0);
      lookCamera(cam2, -40, 0);
      expect(dot(fwd(cam2.yaw), r), `yaw ${yaw0}`).toBeLessThan(0);
    }
  });
  it('rê lên thì ngước (góc ngẩng giảm, camera hạ), rê xuống thì cúi (camera nâng lên)', () => {
    const cam = createCameraAngles(0);
    const p0 = cam.pitch;
    lookCamera(cam, 0, -50);
    expect(cam.pitch).toBeLessThan(p0);
    lookCamera(cam, 0, 100);
    expect(cam.pitch).toBeGreaterThan(p0);
  });
  it('giới hạn góc khoảng 5° đến 60°', () => {
    const cam = createCameraAngles(0);
    for (let i = 0; i < 200; i++) lookCamera(cam, 0, 150);
    expect(cam.pitch).toBeCloseTo((60 * Math.PI) / 180, 9);
    expect(LOOK_PITCH_MAX).toBeCloseTo(1.0472, 4);
    for (let i = 0; i < 400; i++) lookCamera(cam, 0, -150);
    expect(cam.pitch).toBeCloseTo((5 * Math.PI) / 180, 9);
    expect(LOOK_PITCH_MIN).toBeCloseTo(0.0873, 4);
  });
  it('góc mặc định (≈ 29,7°) nằm trong giới hạn', () => {
    expect(PITCH_DEFAULT).toBeGreaterThan(LOOK_PITCH_MIN);
    expect(PITCH_DEFAULT).toBeLessThan(LOOK_PITCH_MAX);
  });
  it('độ nhạy: hệ số 2 xoay gấp đôi, hệ số 0,5 xoay một nửa; 400 pixel ở hệ số 1 là 1 radian', () => {
    const a = createCameraAngles(0);
    const b = createCameraAngles(0);
    const c = createCameraAngles(0);
    lookCamera(a, -100, 0, 1);
    lookCamera(b, -100, 0, 2);
    lookCamera(c, -100, 0, 0.5);
    expect(b.yaw).toBeCloseTo(a.yaw * 2, 12);
    expect(c.yaw).toBeCloseTo(a.yaw / 2, 12);
    const d = createCameraAngles(0);
    for (let i = 0; i < 4; i++) lookCamera(d, -100, 0); // 400 pixel
    expect(d.yaw).toBeCloseTo(400 * LOOK_RADIANS_PER_PIXEL, 12);
  });
  it('một sự kiện chuột nhảy vọt bị chặn ở mức tối đa mỗi sự kiện', () => {
    const a = createCameraAngles(0);
    const b = createCameraAngles(0);
    lookCamera(a, -100000, 0);
    lookCamera(b, -LOOK_MAX_STEP, 0);
    expect(a.yaw).toBeCloseTo(b.yaw, 12);
  });
  it('yaw luôn trong (−π, π] dù xoay nhiều vòng; không rê thì không đổi', () => {
    const cam = createCameraAngles(3);
    for (let i = 0; i < 500; i++) lookCamera(cam, 150, 0);
    expect(cam.yaw).toBeGreaterThan(-Math.PI);
    expect(cam.yaw).toBeLessThanOrEqual(Math.PI);
    const still = createCameraAngles(0.4);
    lookCamera(still, 0, 0);
    expect(still.yaw).toBeCloseTo(0.4, 12);
  });
});
