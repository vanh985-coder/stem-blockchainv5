import { describe, expect, it } from 'vitest';
import type { Placement } from '../cho/marketLayout';
import { FAR_BAMBOO, FAR_HOUSES, farSilhouette, pickEvenly } from './VillageFar';
import { assembleWorld } from './worldLayout';

const mk = (model: string, i: number): Placement => ({ model, x: i, z: 0, yaw: 0, scale: 1, tint: [1, 1, 1] });

describe('hình dáng làng nhìn từ xa (giữ ngân sách tam giác)', () => {
  it('pickEvenly: lấy đều, giữ thứ tự, không trùng; n lớn thì lấy hết', () => {
    const a = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
    expect(pickEvenly(a, 4)).toEqual([1, 4, 7, 10]);
    expect(pickEvenly(a, 12)).toEqual(a);
    expect(pickEvenly(a, 50)).toEqual(a);
    expect(pickEvenly(a, 0)).toEqual([]);
    expect(new Set(pickEvenly(a, 5)).size).toBe(5);
  });
  it('mỗi làng chỉ vẽ tối đa 4 nhà (Thấp) hay 6 nhà (Vừa, Cao); bụi tre chỉ từ mức Vừa và tối đa 4', () => {
    const s = [...Array.from({ length: 12 }, (_, i) => mk('env/nha-mai-ngoi', i)), ...Array.from({ length: 9 }, (_, i) => mk('env/bui-tre', i))];
    const count = (list: Placement[], m: string) => list.filter((p) => p.model === m).length;
    const low = farSilhouette(s, 'low');
    expect(count(low, 'env/nha-mai-ngoi')).toBe(FAR_HOUSES.low);
    expect(count(low, 'env/bui-tre')).toBe(0);
    for (const level of ['medium', 'high'] as const) {
      const f = farSilhouette(s, level);
      expect(count(f, 'env/nha-mai-ngoi')).toBe(FAR_HOUSES[level]);
      expect(count(f, 'env/bui-tre')).toBe(FAR_BAMBOO);
    }
    expect(FAR_HOUSES.low).toBeLessThan(FAR_HOUSES.medium);
  });
  it('Làng Giấy có 12 nhà nhưng từ xa chỉ vẽ bấy nhiêu; làng nhỏ (3 nhà) vẽ đủ', () => {
    const w = assembleWorld();
    const giay = w.villages[0];
    expect(giay.silhouette.filter((p) => p.model.startsWith('env/nha-mai')).length).toBeGreaterThanOrEqual(10);
    expect(farSilhouette(giay.silhouette, 'low').filter((p) => p.model.startsWith('env/nha-mai'))).toHaveLength(4);
    for (const v of w.villages.slice(1)) expect(farSilhouette(v.silhouette, 'medium').filter((p) => p.model.startsWith('env/nha-mai')).length).toBeGreaterThanOrEqual(3);
  });
});
