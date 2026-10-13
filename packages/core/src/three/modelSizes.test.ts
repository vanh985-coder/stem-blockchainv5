import { Box3 } from 'three';
import { describe, expect, it } from 'vitest';
import { CHARACTER_HEIGHT, MODEL_SIZES, RIGGED_CHARACTER_IDS, STATIC_CHARACTER_IDS, fitToHeight, isCharacterId, sizeInScene, sizeOf } from './modelSizes';
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
    expect(sizeOf('env/chua-co-trong-bang')).toBeUndefined();
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

/** Đồ vật ở chợ phiên (bước 7): cỡ thật so với nhân vật cao 1,7. */
const ENV_IDS = [
  'env/cay-da',
  'env/cong-lang-giay',
  'env/cong-lang-det',
  'env/cong-lang-khac-dau',
  'env/cong-lang-bac',
  'env/nha-mai-ngoi',
  'env/nha-mai-tranh',
  'env/leu-cho',
  'env/gieng-lang',
  'env/bui-tre',
];

describe('cỡ thật của đồ vật ở chợ phiên', () => {
  it('cao đúng bảng: cổng 5, nhà ngói 4,5, nhà tranh 4, cây đa 12, lều 3,2', () => {
    expect(sizeOf('env/cay-da')?.height).toBe(12);
    for (const g of ['giay', 'det', 'khac-dau', 'bac']) expect(sizeOf(`env/cong-lang-${g}`)?.height).toBe(5);
    expect(sizeOf('env/nha-mai-ngoi')?.height).toBe(4.5);
    expect(sizeOf('env/nha-mai-tranh')?.height).toBe(4);
    expect(sizeOf('env/leu-cho')?.height).toBe(3.2);
  });
  it('bản xa dùng cỡ của bản chính', () => {
    for (const id of ENV_IDS) expect(sizeOf(`${id}-xa`), id).toEqual(sizeOf(id));
  });
  it('sizeInScene: cao đúng chiều cao, rộng và sâu theo tỉ lệ; nhân thêm scale', () => {
    for (const id of ENV_IDS) {
      const [w, h, d] = sizeInScene(id)!;
      expect(h, id).toBeCloseTo(sizeOf(id)!.height, 9);
      expect(w, id).toBeGreaterThan(0);
      expect(d, id).toBeGreaterThan(0);
      const [w2, h2, d2] = sizeInScene(id, 1.2)!;
      expect(w2 / w).toBeCloseTo(1.2, 9);
      expect(h2 / h).toBeCloseTo(1.2, 9);
      expect(d2 / d).toBeCloseTo(1.2, 9);
    }
    expect(sizeInScene('characters/ti')).toBeUndefined();
  });
  it('đồ vật lớn hơn nhân vật đúng như kỳ vọng: nhà ≥ 2 lần, cổng ≥ 2,5 lần, cây đa ≥ 6 lần', () => {
    expect(sizeOf('env/nha-mai-ngoi')!.height / CHARACTER_HEIGHT).toBeGreaterThan(2);
    expect(sizeOf('env/cong-lang-giay')!.height / CHARACTER_HEIGHT).toBeGreaterThan(2.5);
    expect(sizeOf('env/cay-da')!.height / CHARACTER_HEIGHT).toBeGreaterThan(6);
  });
  it('dims trong bảng khớp khung bao thật của file (sai số 0,01)', async () => {
    for (const id of ENV_IDS) {
      const gltf = await loadGltfForTest(id);
      gltf.scene.updateMatrixWorld(true);
      const box = new Box3().setFromObject(gltf.scene, true);
      const dims = MODEL_SIZES[id].dims!;
      expect(box.max.x - box.min.x, `${id} x`).toBeCloseTo(dims[0], 1);
      expect(box.max.y - box.min.y, `${id} y`).toBeCloseTo(dims[1], 1);
      expect(box.max.z - box.min.z, `${id} z`).toBeCloseTo(dims[2], 1);
      expect(Math.abs(box.min.y), `${id} chân ở y = 0`).toBeLessThan(0.01);
    }
  });
});
