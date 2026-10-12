import { Box3 } from 'three';
import { describe, expect, it } from 'vitest';
import { CHARACTER_HEIGHT, MODEL_SIZES, RIGGED_CHARACTER_IDS, STATIC_CHARACTER_IDS, fitToHeight, isCharacterId, sizeOf } from './modelSizes';
import { loadGltfForTest } from './testGlb';

describe('bảng cỡ model', () => {
  it('cả 10 nhân vật cao 1,7', () => {
    expect(CHARACTER_HEIGHT).toBe(1.7);
    const all = [...RIGGED_CHARACTER_IDS, ...STATIC_CHARACTER_IDS];
    expect(all).toHaveLength(10);
    expect(new Set(all).size).toBe(10);
    for (const id of all) {
      expect(MODEL_SIZES[id]?.height, id).toBe(1.7);
      expect(sizeOf(id)?.height).toBe(1.7);
    }
  });
  it('4 nhân vật có xương và 6 đứng yên, đúng tên (spec 03 mục 3.1)', () => {
    expect(RIGGED_CHARACTER_IDS.map((i) => i.split('/')[1]).sort()).toEqual(['dan-lang-ba-cu', 'dan-lang-nong-dan', 'hoc-sinh-nam', 'ti']);
    expect(STATIC_CHARACTER_IDS.map((i) => i.split('/')[1]).sort()).toEqual(['bac-an', 'chu-dung', 'co-chi', 'cu-binh', 'lai-buon', 'thay-linh']);
  });
  it('nhân vật chưa có trong bảng vẫn dùng cỡ chung; đồ vật chưa có thì chưa có cỡ', () => {
    expect(isCharacterId('characters/moi')).toBe(true);
    expect(sizeOf('characters/moi')?.height).toBe(1.7);
    expect(sizeOf('env/cay-da')).toBeUndefined();
  });
});

describe('fitToHeight', () => {
  it('phóng cho cao đúng, chân về y = 0', () => {
    expect(fitToHeight(0, 0.98, 1.7).scale).toBeCloseTo(1.7 / 0.98, 9);
    const f = fitToHeight(-1, 1, 1.7); // cao 2, chân ở -1
    expect(f.scale).toBeCloseTo(0.85, 9);
    expect(f.offsetY).toBeCloseTo(0.85, 9); // chân: -1 * 0.85 + 0.85 = 0
  });
  it('khung bao hỏng thì không phóng, không dịch', () => {
    expect(fitToHeight(0, 0, 1.7)).toEqual({ scale: 1, offsetY: 0 });
    expect(fitToHeight(Number.NaN, 1, 1.7)).toEqual({ scale: 1, offsetY: 0 });
    expect(fitToHeight(Infinity, -Infinity, 1.7)).toEqual({ scale: 1, offsetY: 0 });
  });
});

describe('cỡ nhân vật trong file thật', () => {
  it('sau khi chuẩn hóa, cả 10 nhân vật (có xương và đứng yên) cao 1,7 và chân ở y = 0', async () => {
    for (const id of [...RIGGED_CHARACTER_IDS, ...STATIC_CHARACTER_IDS]) {
      const gltf = await loadGltfForTest(id);
      gltf.scene.updateMatrixWorld(true);
      const box = new Box3().setFromObject(gltf.scene, true);
      const fit = fitToHeight(box.min.y, box.max.y, CHARACTER_HEIGHT);
      expect((box.max.y - box.min.y) * fit.scale, id).toBeCloseTo(1.7, 6);
      expect(box.min.y * fit.scale + fit.offsetY, id).toBeCloseTo(0, 6);
      // chưa chuẩn hóa thì cao ~0,98 (model trong file đã đưa về cạnh dài ~1)
      expect(box.max.y - box.min.y, id).toBeGreaterThan(0.9);
      expect(box.max.y - box.min.y, id).toBeLessThan(1.05);
    }
  });
});
