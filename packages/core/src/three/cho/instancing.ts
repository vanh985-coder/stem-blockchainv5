import { Color, InstancedMesh, Matrix4, Quaternion, Vector3, type BufferGeometry, type Material } from 'three';

/** Một bản nhân bản tĩnh: vị trí, góc xoay, tỉ lệ (đều hoặc từng trục), nhân màu. */
export interface Item {
  x: number;
  y?: number;
  z: number;
  yaw?: number;
  scale?: number;
  sx?: number;
  sy?: number;
  sz?: number;
  color?: readonly [number, number, number];
}

const tmp = { m: new Matrix4(), q: new Quaternion(), p: new Vector3(), s: new Vector3(), c: new Color(), axisY: new Vector3(0, 1, 0) };

/** Dựng InstancedMesh từ danh sách bản (chạy một lần, ngoài useFrame). Dùng chung một geometry và một material cho mọi bản. */
export function buildInstanced(geometry: BufferGeometry, material: Material, items: readonly Item[], cast: boolean, receive: boolean): InstancedMesh {
  const mesh = new InstancedMesh(geometry, material, Math.max(1, items.length));
  mesh.count = items.length;
  items.forEach((it, i) => {
    tmp.p.set(it.x, it.y ?? 0, it.z);
    tmp.q.setFromAxisAngle(tmp.axisY, it.yaw ?? 0);
    const k = it.scale ?? 1;
    tmp.s.set(it.sx ?? k, it.sy ?? k, it.sz ?? k);
    tmp.m.compose(tmp.p, tmp.q, tmp.s);
    mesh.setMatrixAt(i, tmp.m);
    if (it.color) mesh.setColorAt(i, tmp.c.setRGB(it.color[0], it.color[1], it.color[2]));
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.castShadow = cast;
  mesh.receiveShadow = receive;
  mesh.frustumCulled = false;
  return mesh;
}
