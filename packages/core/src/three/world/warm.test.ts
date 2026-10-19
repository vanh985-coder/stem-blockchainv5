import { Group, Mesh, MeshStandardMaterial, Texture, BoxGeometry } from 'three';
import { describe, expect, it } from 'vitest';
import { BIG_TEXTURE, WARM_GAP_MS, usableTextures, warmGapMs } from './warm';

const tex = (w: number, h: number): Texture => {
  const t = new Texture();
  t.image = { width: w, height: h };
  return t;
};

describe('làm ấm texture', () => {
  it('texture từ 2048 trở lên phải chờ GPU, nhỏ hơn thì khung kế tiếp', () => {
    expect(warmGapMs(2048, 2048)).toBe(WARM_GAP_MS);
    expect(warmGapMs(1024, 2048)).toBe(WARM_GAP_MS);
    expect(warmGapMs(BIG_TEXTURE - 1, BIG_TEXTURE - 1)).toBe(0);
    expect(warmGapMs(512, 256)).toBe(0);
  });
  it('gom texture dùng được của các cảnh, không trùng, bỏ texture không có ảnh', () => {
    const shared = tex(1024, 1024);
    const empty = new Texture(); // chưa có ảnh: kích thước 0
    const mk = (...maps: Texture[]) => {
      const g = new Group();
      for (const map of maps) g.add(new Mesh(new BoxGeometry(), new MeshStandardMaterial({ map })));
      return g;
    };
    const a = mk(shared, empty);
    const b = mk(shared, tex(2048, 2048));
    const out = usableTextures([a, b]);
    expect(out).toHaveLength(2);
    expect(out[0]).toBe(shared);
  });
});

