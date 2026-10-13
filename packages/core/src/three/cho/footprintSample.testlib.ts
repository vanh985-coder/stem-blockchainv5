/**
 * Chỉ dùng trong test (Node): lấy các điểm (x, z) trên bề mặt của phần model nằm trong khoảng 0–1,5 đơn vị tính từ mặt đất, sau khi
 * áp cỡ thật (theo bảng `MODEL_SIZES`). Dùng để dựng và kiểm tra vật cản theo chân tường thật (xem footprintDerive.ts).
 */
import { Box3, Vector3, type Mesh } from 'three';
import { sizeOf } from '../modelSizes';
import { loadGltfForTest } from '../testGlb';
import type { Pt } from './footprintDerive';

/** Chỉ lấy phần cao tới đây tính từ mặt đất (chân tường, không lấy mái). */
export const FOOT_BAND = 1.5;

/** Khoảng cách giữa các điểm mẫu trên mặt tam giác (đơn vị cảnh). */
const STEP = 0.05;

export interface BandSample {
  /** Điểm (x, z) trong dải 0–1,5, đã khử trùng theo ô 0,05 */
  points: Pt[];
}

export async function bandSample(id: string, band = FOOT_BAND, fromY = 0): Promise<BandSample> {
  const gltf = await loadGltfForTest(id);
  gltf.scene.updateMatrixWorld(true);
  const box = new Box3().setFromObject(gltf.scene, true);
  const height = sizeOf(id)!.height;
  const scale = height / (box.max.y - box.min.y);
  const minY = box.min.y * scale;
  const seen = new Set<string>();
  const points: Pt[] = [];
  const a = new Vector3();
  const b = new Vector3();
  const c = new Vector3();
  gltf.scene.traverse((o) => {
    const mesh = o as Mesh;
    if (!mesh.isMesh) return;
    const pos = mesh.geometry.getAttribute('position');
    const idx = mesh.geometry.getIndex();
    const n = idx ? idx.count : pos.count;
    const vertex = (i: number, out: Vector3) => {
      const k = idx ? idx.getX(i) : i;
      out.set(pos.getX(k), pos.getY(k), pos.getZ(k)).applyMatrix4(mesh.matrixWorld).multiplyScalar(scale);
      out.y -= minY;
    };
    for (let t = 0; t < n; t += 3) {
      vertex(t, a);
      vertex(t + 1, b);
      vertex(t + 2, c);
      // bỏ tam giác nằm hoàn toàn ngoài dải
      if (Math.min(a.y, b.y, c.y) > band || Math.max(a.y, b.y, c.y) < fromY) continue;
      const e = Math.max(a.distanceTo(b), b.distanceTo(c), c.distanceTo(a));
      const k = Math.max(1, Math.min(120, Math.ceil(e / STEP)));
      for (let i = 0; i <= k; i++) {
        for (let j = 0; j <= k - i; j++) {
          const u = i / k;
          const v = j / k;
          const w = 1 - u - v;
          const y = a.y * u + b.y * v + c.y * w;
          if (y < fromY || y > band) continue;
          const x = a.x * u + b.x * v + c.x * w;
          const z = a.z * u + b.z * v + c.z * w;
          const key = `${Math.round(x / STEP)},${Math.round(z / STEP)}`;
          if (seen.has(key)) continue;
          seen.add(key);
          points.push({ x, z });
        }
      }
    }
  });
  return { points };
}
