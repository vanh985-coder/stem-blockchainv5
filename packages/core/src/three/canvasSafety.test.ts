import { Texture } from 'three';
import { describe, expect, it, vi } from 'vitest';
import { CanvasErrorBoundary } from './CanvasErrorBoundary';
import { logCanvasError } from './canvasLog';
import { disposeWaitMs } from './modelLoader';
import { textureSize, textureUsable } from './SceneWarmup';

const texOf = (image: unknown): Texture => {
  const t = new Texture();
  (t as unknown as { image: unknown }).image = image;
  return t;
};

describe('texture kích thước 0 không được đưa lên GPU (nguồn của cảnh báo glTexStorage2D / glGenerateMipmap)', () => {
  it('chưa có ảnh, ảnh chưa tải xong, ImageBitmap đã đóng (rộng cao 0), canvas 0: không dùng được', () => {
    expect(textureUsable(texOf(undefined))).toBe(false);
    expect(textureUsable(texOf(null))).toBe(false);
    expect(textureUsable(texOf({ complete: false, naturalWidth: 0, naturalHeight: 0 }))).toBe(false);
    expect(textureUsable(texOf({ width: 0, height: 0 }))).toBe(false); // ImageBitmap sau close()
    expect(textureUsable(texOf({ width: 512, height: 0 }))).toBe(false);
  });
  it('ảnh HTML đã tải, canvas, ImageBitmap, dữ liệu: dùng được', () => {
    expect(textureUsable(texOf({ complete: true, naturalWidth: 256, naturalHeight: 128, width: 256, height: 128 }))).toBe(true);
    expect(textureUsable(texOf({ width: 512, height: 256 }))).toBe(true);
    expect(textureSize(texOf({ width: 64, height: 32 }))).toEqual({ width: 64, height: 32 });
  });
});

describe('dọn model: không dọn model vừa được đọc lúc render mà chưa kịp giữ', () => {
  it('còn chỗ dùng thì chờ; vừa đọc 1 giây trước thì chờ nốt phần còn lại; hết hạn thì dọn', () => {
    expect(disposeWaitMs(1, 0, 10_000, 1500)).toBe(1500);
    expect(disposeWaitMs(0, 9_000, 10_000, 1500)).toBe(500);
    expect(disposeWaitMs(0, 8_000, 10_000, 1500)).toBe(0);
    expect(disposeWaitMs(0, 0, 10_000, 1500)).toBe(0);
  });
});

describe('lớp chặn lỗi quanh Canvas', () => {
  it('getDerivedStateFromError chuyển sang trạng thái lỗi và giữ lỗi', () => {
    const err = new TypeError("Cannot set properties of undefined (setting '_cacheIndex')");
    expect(CanvasErrorBoundary.getDerivedStateFromError(err)).toEqual({ error: err, failed: true });
  });
  it('lỗi được ghi ra console kèm nơi gây lỗi', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    logCanvasError(new Error('x'), { componentStack: '\n at Character' });
    expect(spy).toHaveBeenCalledTimes(1);
    expect(String(spy.mock.calls[0][0])).toContain('3D');
    expect(spy.mock.calls[0][2]).toContain('Character');
    spy.mockRestore();
  });
  it('componentDidCatch ghi lỗi và báo cho nơi gọi', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const onError = vi.fn();
    const b = new CanvasErrorBoundary({ children: null, onError });
    const err = new Error('boom');
    b.componentDidCatch(err, { componentStack: '' });
    expect(spy).toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith(err);
    spy.mockRestore();
  });
  it('chưa lỗi thì hiện con; có lỗi thì hiện fallback (null = chỉ ẩn, như khung 3D trang bài học)', () => {
    const child = 'CON';
    const ok = new CanvasErrorBoundary({ children: child });
    expect(ok.render()).toBe(child);
    const hidden = new CanvasErrorBoundary({ children: child, fallback: null });
    hidden.state = { error: new Error('x'), failed: true };
    expect(hidden.render()).toBeNull();
    const custom = new CanvasErrorBoundary({ children: child, fallback: (e) => `lỗi: ${(e as Error).message}` });
    custom.state = { error: new Error('x'), failed: true };
    expect(custom.render()).toBe('lỗi: x');
  });
});
