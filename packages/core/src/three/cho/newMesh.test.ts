import { BoxGeometry, MeshStandardMaterial } from 'three';
import { describe, expect, it } from 'vitest';
import { newMesh } from './ModelInstances';

// Nguyên nhân đã loại trừ ở lỗi "đống rơm hiện một phần" (bước 16): bể bản dùng lại (DynamicModel, DynamicBoxes) phải không bị three cắt theo khung bao cũ của hình gốc,
// vì ma trận từng bản đổi mỗi khung hình còn boundingSphere của InstancedMesh chỉ tính một lần.
describe('bể bản dùng lại của DynamicModel', () => {
  it('không cắt theo khung nhìn (frustumCulled = false) dù bản nằm xa hình gốc', () => {
    const mesh = newMesh({ geometry: new BoxGeometry(1, 1, 1), material: new MeshStandardMaterial() } as Parameters<typeof newMesh>[0], 8);
    expect(mesh.frustumCulled).toBe(false);
    expect(mesh.instanceColor).not.toBeNull();
  });
});
