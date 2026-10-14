import { describe, expect, it } from 'vitest';
import { CAMERA_FAR, CAMERA_NEAR, CAMERA_Z, FRAME_ASPECT, LAYERS, aspectOf, frustum, coverSize, fitFrame, frameMode, frameToWorld, layerZ, spriteSize, worldSize } from './layout25d';

describe('khung 16:9 co giãn theo cha', () => {
  it('cha đúng 16:9 thì khung phủ kín', () => {
    expect(fitFrame({ width: 1280, height: 720 }, FRAME_ASPECT)).toEqual({ width: 1280, height: 720, left: 0, top: 0 });
  });
  it('cha rộng hơn: dải đen hai bên, khung căn giữa', () => {
    const f = fitFrame({ width: 1600, height: 720 }, FRAME_ASPECT);
    expect(f.height).toBe(720);
    expect(f.width).toBeCloseTo(1280, 9);
    expect(f.left).toBeCloseTo(160, 9);
    expect(f.top).toBe(0);
  });
  it('cha hẹp (cao hơn): dải đen trên dưới', () => {
    const f = fitFrame({ width: 640, height: 600 }, FRAME_ASPECT);
    expect(f.width).toBe(640);
    expect(f.height).toBeCloseTo(360, 9);
    expect(f.top).toBeCloseTo(120, 9);
    expect(f.left).toBe(0);
  });
  it('luôn giữ tỉ lệ và nằm gọn trong cha, với mọi cỡ cha', () => {
    for (const [w, h] of [[320, 240], [844, 390], [390, 844], [1920, 1080], [2560, 600], [500, 2000], [1, 1]]) {
      const f = fitFrame({ width: w, height: h }, FRAME_ASPECT);
      expect(f.width / f.height).toBeCloseTo(FRAME_ASPECT, 9);
      expect(f.left).toBeGreaterThanOrEqual(-1e-9);
      expect(f.top).toBeGreaterThanOrEqual(-1e-9);
      expect(f.left + f.width).toBeLessThanOrEqual(w + 1e-9);
      expect(f.top + f.height).toBeLessThanOrEqual(h + 1e-9);
    }
  });
  it('cha có kích thước 0 thì khung 0, không chia cho 0', () => {
    expect(fitFrame({ width: 0, height: 500 }, FRAME_ASPECT)).toEqual({ width: 0, height: 0, left: 0, top: 0 });
  });
});

describe('xoay dọc ở điện thoại', () => {
  it('ngang thì luôn là khung ngang', () => {
    expect(frameMode({ width: 844, height: 390 }, false)).toBe('landscape');
    expect(frameMode({ width: 1280, height: 720 }, true)).toBe('landscape');
  });
  it('điện thoại xoay dọc: nhắc xoay ngang; riêng cảnh cho phép dọc (màn 12) thì dùng khung dọc', () => {
    expect(frameMode({ width: 390, height: 844 }, false)).toBe('rotate');
    expect(frameMode({ width: 390, height: 844 }, true)).toBe('portrait');
  });
  it('cửa sổ máy tính hẹp và cao (cạnh ngắn từ 600) không bị nhắc xoay', () => {
    expect(frameMode({ width: 700, height: 900 }, false)).toBe('landscape');
  });
  it('tỉ lệ và cỡ thế giới theo chế độ: ngang 16 × 9, dọc 9 × 16', () => {
    expect(aspectOf('landscape')).toBeCloseTo(16 / 9, 12);
    expect(aspectOf('rotate')).toBeCloseTo(16 / 9, 12);
    expect(aspectOf('portrait')).toBeCloseTo(9 / 16, 12);
    expect(worldSize('landscape')).toEqual({ width: 16, height: 9 });
    expect(worldSize('portrait')).toEqual({ width: 9, height: 16 });
  });
});

describe('camera trực giao', () => {
  it('khung nhìn phủ đúng khung thế giới, tâm ở gốc', () => {
    expect(frustum(worldSize('landscape'))).toEqual({ left: -8, right: 8, top: 4.5, bottom: -4.5 });
    expect(frustum(worldSize('portrait'))).toEqual({ left: -4.5, right: 4.5, top: 8, bottom: -8 });
  });
  it('camera đứng xa hơn mọi lớp và tầm cắt bao hết các lớp', () => {
    const zs = Object.values(LAYERS);
    expect(CAMERA_Z - CAMERA_NEAR).toBeGreaterThan(Math.max(...zs));
    expect(CAMERA_Z - CAMERA_FAR).toBeLessThan(Math.min(...zs));
  });
});

describe('ảnh nền kiểu cover', () => {
  const frame = { width: 16, height: 9 };
  it('ảnh 1376 × 768 (hơi hẹp hơn 16:9) phủ kín khung, cắt phần thừa trên dưới', () => {
    const c = coverSize({ width: 1376, height: 768 }, frame);
    expect(c.width).toBeGreaterThanOrEqual(16 - 1e-9);
    expect(c.height).toBeGreaterThanOrEqual(9 - 1e-9);
    expect(c.width / c.height).toBeCloseTo(1376 / 768, 9);
  });
  it('luôn phủ kín khung với mọi tỉ lệ ảnh, ở cả khung ngang và dọc', () => {
    for (const img of [{ width: 100, height: 100 }, { width: 3000, height: 500 }, { width: 500, height: 3000 }, { width: 1920, height: 1080 }]) {
      for (const fr of [frame, { width: 9, height: 16 }]) {
        const c = coverSize(img, fr);
        expect(c.width).toBeGreaterThanOrEqual(fr.width - 1e-9);
        expect(c.height).toBeGreaterThanOrEqual(fr.height - 1e-9);
        expect(c.width / c.height).toBeCloseTo(img.width / img.height, 9);
        // vừa đủ: một cạnh bằng đúng khung
        expect(Math.min(c.width / fr.width, c.height / fr.height)).toBeCloseTo(1, 9);
      }
    }
  });
  it('ảnh chưa có kích thước thì phủ đúng khung', () => {
    expect(coverSize({ width: 0, height: 0 }, frame)).toEqual(frame);
  });
});

describe('hình rời và lớp', () => {
  it('cho chiều cao thì rộng theo tỉ lệ ảnh; cho chiều rộng thì cao theo tỉ lệ; cho cả hai thì dùng cả hai', () => {
    const img = { width: 1024, height: 559 };
    const h = spriteSize(img, { height: 2 });
    expect(h.height).toBe(2);
    expect(h.width / h.height).toBeCloseTo(1024 / 559, 9);
    const w = spriteSize(img, { width: 3 });
    expect(w.width).toBe(3);
    expect(w.width / w.height).toBeCloseTo(1024 / 559, 9);
    expect(spriteSize(img, { width: 3, height: 1 })).toEqual({ width: 3, height: 1 });
    expect(spriteSize({ width: 0, height: 0 }, { height: 2 })).toEqual({ width: 2, height: 2 });
  });
  it('lớp sắp từ xa tới gần: nền < xa < sau < nhân vật < trước < gần, các lớp nhân vật cách nhau từ 1 đơn vị', () => {
    expect(layerZ('background')).toBeLessThan(layerZ('far'));
    expect(layerZ('far')).toBeLessThan(layerZ('back'));
    expect(layerZ('back')).toBeLessThan(layerZ('actorsBack'));
    expect(layerZ('actorsBack')).toBeLessThan(layerZ('actors'));
    expect(layerZ('actors')).toBeLessThan(layerZ('actorsFront'));
    expect(layerZ('actorsFront')).toBeLessThan(layerZ('front'));
    expect(layerZ('front')).toBeLessThan(layerZ('near'));
    expect(layerZ('actors') - layerZ('actorsBack')).toBeGreaterThanOrEqual(1);
    expect(layerZ('actorsFront') - layerZ('actors')).toBeGreaterThanOrEqual(1);
    expect(layerZ('front', 0.01)).toBeCloseTo(3.01, 12);
  });
  it('đổi tọa độ khung [0..1] sang thế giới: tâm là gốc, góc trên trái là (−8, 4,5)', () => {
    expect(frameToWorld(0.5, 0.5, worldSize('landscape'))).toEqual({ x: 0, y: 0 });
    expect(frameToWorld(0, 0, worldSize('landscape'))).toEqual({ x: -8, y: 4.5 });
    expect(frameToWorld(1, 1, worldSize('landscape'))).toEqual({ x: 8, y: -4.5 });
  });
});
