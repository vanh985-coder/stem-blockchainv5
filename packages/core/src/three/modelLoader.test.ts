import { BoxGeometry, Mesh, MeshStandardMaterial, Texture } from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { disposeModelScene, modelCacheStats, preloadModel, releaseModel, retainModel } from './modelLoader';

describe('giải phóng model khi rời cảnh', () => {
  afterEach(() => vi.useRealTimers());

  it('disposeModelScene giải phóng hình học, vật liệu, texture và đóng ImageBitmap', () => {
    const close = vi.fn();
    const tex = new Texture();
    (tex as unknown as { image: unknown }).image = { width: 4, height: 4, close };
    const geo = new BoxGeometry();
    const mat = new MeshStandardMaterial({ map: tex });
    const onGeo = vi.fn();
    const onMat = vi.fn();
    const onTex = vi.fn();
    geo.addEventListener('dispose', onGeo);
    mat.addEventListener('dispose', onMat);
    tex.addEventListener('dispose', onTex);
    const mesh = new Mesh(geo, mat);
    disposeModelScene(mesh);
    expect(onGeo).toHaveBeenCalledTimes(1);
    expect(onMat).toHaveBeenCalledTimes(1);
    expect(onTex).toHaveBeenCalledTimes(1);
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('texture không có ảnh hoặc ảnh không có close() không gây lỗi', () => {
    const mat = new MeshStandardMaterial({ map: new Texture() });
    expect(() => disposeModelScene(new Mesh(new BoxGeometry(), mat))).not.toThrow();
  });

  it('hết chỗ dùng thì sau 1,5 giây model rời bộ nhớ đệm; còn chỗ dùng thì giữ', async () => {
    const id = 'env/khong-co-trong-manifest'; // thiếu file: dùng hình thay thế, vẫn đi qua đúng đường cache
    const data = await preloadModel(id);
    expect(data.placeholder).toBe(true);
    const before = modelCacheStats().entries;
    vi.useFakeTimers();

    retainModel(id);
    retainModel(id);
    releaseModel(id);
    vi.advanceTimersByTime(5000);
    expect(modelCacheStats().entries).toBe(before); // còn một chỗ dùng

    let disposed = 0;
    data.scene.traverse((o) => (o as Mesh).geometry?.addEventListener('dispose', () => disposed++));
    releaseModel(id);
    vi.advanceTimersByTime(1400);
    expect(modelCacheStats().entries).toBe(before); // chưa tới giờ
    vi.advanceTimersByTime(200);
    expect(modelCacheStats().entries).toBe(before - 1);
    expect(disposed).toBeGreaterThan(0);
  });

  it('gắn lại trong thời gian chờ (StrictMode gắn, gỡ, gắn lại) thì không bị giải phóng', async () => {
    const id = 'env/khong-co-trong-manifest-2';
    await preloadModel(id);
    const before = modelCacheStats().entries;
    vi.useFakeTimers();
    retainModel(id);
    releaseModel(id);
    vi.advanceTimersByTime(10); // chưa tới hạn
    retainModel(id); // gắn lại
    vi.advanceTimersByTime(5000);
    expect(modelCacheStats().entries).toBe(before);
    releaseModel(id);
    vi.advanceTimersByTime(2000);
    expect(modelCacheStats().entries).toBe(before - 1);
  });
});
