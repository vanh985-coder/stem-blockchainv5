import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { Box3, BufferAttribute, DynamicDrawUsage, Float32BufferAttribute, InstancedBufferAttribute, InstancedMesh, Matrix4, Quaternion, Vector3, type BufferGeometry, type Material, type Mesh, type Object3D } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { getManifest } from '../../assets/store';
import { isUsableMid, lodId, midId, modelPath } from '../modelIds';
import { readModel, releaseModel, retainModel, type ModelData } from '../modelLoader';
import { fitToHeight, sizeInScene, sizeOf } from '../modelSizes';
import { QUALITY_TABLE, type QualityLevel } from '../quality';
import { SHADOW_RANGE, shadowFocus } from '../shadowFocus';
import { extractFrustumPlanes, marketFarDistance, marketMaxDistance, marketNearDistance, sameSelection, selectInstances, selectShadowCasters, type Selection, type ShadowSelectParams } from './instanceSelect';
import type { Placement } from './marketLayout';

/** Một phần để vẽ: hình học đã nướng sẵn (vị trí trong cây node + phóng theo cỡ thật, chân ở y = 0) và vật liệu dùng chung. */
interface Part {
  geometry: BufferGeometry;
  material: Material;
}

/**
 * Chuyển mọi thuộc tính hình học về Float32 (giải nén). File model nén meshopt thường lượng tử hóa vị trí, pháp tuyến và uv thành số
 * nguyên chuẩn hóa; nếu nướng ma trận node vào các thuộc tính đó thì tọa độ lớn bị kẹp về [−1, 1] và hình méo thành khối hộp.
 */
function toFloat32(geometry: BufferGeometry): BufferGeometry {
  for (const name of Object.keys(geometry.attributes)) {
    const a = geometry.getAttribute(name) as BufferAttribute;
    if (a.array instanceof Float32Array && !(a as { isInterleavedBufferAttribute?: boolean }).isInterleavedBufferAttribute) continue;
    const out = new Float32Array(a.count * a.itemSize);
    for (let i = 0; i < a.count; i++) {
      out[i * a.itemSize] = a.getX(i);
      if (a.itemSize > 1) out[i * a.itemSize + 1] = a.getY(i);
      if (a.itemSize > 2) out[i * a.itemSize + 2] = a.getZ(i);
      if (a.itemSize > 3) out[i * a.itemSize + 3] = a.getW(i);
    }
    geometry.setAttribute(name, new Float32BufferAttribute(out, a.itemSize));
  }
  return geometry;
}

/**
 * Gom mọi mesh (không xương) của model thành các phần theo vật liệu: nướng ma trận node vào hình học, phóng theo `scale`
 * và dịch `offsetY`; các mesh cùng vật liệu và cùng thuộc tính được gộp thành một hình học (một draw call cho cả cây tre 42 mảnh).
 */
function buildParts(scene: Object3D, scale: number, offsetY: number): Part[] {
  scene.updateMatrixWorld(true);
  const byMaterial = new Map<Material, BufferGeometry[]>();
  scene.traverse((o) => {
    const mesh = o as Mesh;
    if (!mesh.isMesh || (mesh as { isSkinnedMesh?: boolean }).isSkinnedMesh) return;
    const mat = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as Material;
    const g = toFloat32(mesh.geometry.clone());
    g.applyMatrix4(mesh.matrixWorld);
    g.scale(scale, scale, scale);
    g.translate(0, offsetY, 0);
    const list = byMaterial.get(mat) ?? [];
    list.push(g);
    byMaterial.set(mat, list);
  });
  const parts: Part[] = [];
  for (const [material, list] of byMaterial) {
    if (list.length === 1) {
      parts.push({ geometry: list[0], material });
      continue;
    }
    const merged = mergeGeometries(list, false);
    if (merged) {
      for (const g of list) g.dispose();
      parts.push({ geometry: merged, material });
    } else {
      for (const g of list) parts.push({ geometry: g, material });
    }
  }
  return parts;
}

/** Hệ số phóng và dịch cho một model theo cỡ thật trong bảng (đo khung bao của chính model). */
function fitOf(id: string, scene: Object3D) {
  scene.updateMatrixWorld(true);
  const box = new Box3().setFromObject(scene);
  return fitToHeight(box.min.y, box.max.y, sizeOf(id)?.height ?? 1);
}

interface InstanceSet {
  /** Bản chính (gần) và bản xa: mỗi phần một InstancedMesh */
  nearMeshes: InstancedMesh[];
  /** Bản vừa (LOD giữa): rỗng nếu model không có bản vừa dùng được */
  midMeshes: InstancedMesh[];
  farMeshes: InstancedMesh[];
  /**
   * Chỉ để đổ bóng: bản xa (nhẹ) của các vật trong vùng bóng quanh người chơi. Không vẽ ở lượt vẽ chính (xem `newShadowMesh`), nên vật gần dù dùng bản
   * chính ở lượt vẽ chính vẫn chỉ đổ bóng bằng bản xa, và vật ngoài vùng bóng không đổ bóng.
   */
  shadowMeshes: InstancedMesh[];
  count: number;
  /** Ma trận (16 số) và màu (3 số) của từng bản, cố định */
  matrices: Float32Array;
  colors: Float32Array;
  /** Khối cầu bao để cắt */
  centers: Float32Array;
  radii: Float32Array;
  disposables: { dispose(): void }[];
}

function newMesh(part: Part, capacity: number): InstancedMesh {
  const mesh = new InstancedMesh(part.geometry, part.material, capacity);
  mesh.instanceMatrix.setUsage(DynamicDrawUsage);
  mesh.instanceColor = new InstancedBufferAttribute(new Float32Array(capacity * 3), 3);
  mesh.instanceColor.setUsage(DynamicDrawUsage);
  mesh.count = 0;
  mesh.visible = false;
  mesh.frustumCulled = false; // tự cắt từng bản (xem instanceSelect)
  return mesh;
}

/**
 * InstancedMesh chỉ đổ bóng: `castShadow`, không nhận bóng. Ở lượt vẽ chính `onBeforeRender` đặt số bản về 0 nên không vẽ gì (một draw call rỗng, 0 tam giác); ở
 * lượt vẽ bóng (diễn ra trước, không gọi `onBeforeRender`) số bản là số đã đặt mỗi khung hình trong useFrame.
 */
function newShadowMesh(part: Part, capacity: number): InstancedMesh {
  const mesh = newMesh(part, capacity);
  mesh.castShadow = true;
  mesh.receiveShadow = false;
  mesh.onBeforeRender = () => {
    mesh.count = 0;
  };
  return mesh;
}

function buildSet(id: string, near: ModelData, mid: ModelData | null, far: ModelData, items: readonly Placement[]): InstanceSet {
  const fit0 = fitOf(id, near.scene);
  // một số model nhấc lên khỏi mặt đất (phên phơi giấy đặt trên giá): cộng `lift` vào độ dịch đứng
  const lift = sizeOf(id)?.lift ?? 0;
  const fit = { scale: fit0.scale, offsetY: fit0.offsetY + lift };
  const nearParts = buildParts(near.scene, fit.scale, fit.offsetY);
  // bản xa dùng đúng hệ số phóng của bản chính để hai bản trùng khít
  const farParts = buildParts(far.scene, fit.scale, fit.offsetY);
  // bản vừa cũng dùng đúng hệ số phóng của bản chính
  const midParts = mid ? buildParts(mid.scene, fit.scale, fit.offsetY) : [];
  const n = items.length;
  const matrices = new Float32Array(n * 16);
  const colors = new Float32Array(n * 3);
  const centers = new Float32Array(n * 3);
  const radii = new Float32Array(n);
  const m = new Matrix4();
  const q = new Quaternion();
  const pos = new Vector3();
  const sc = new Vector3();
  const up = new Vector3(0, 1, 0);
  items.forEach((it, i) => {
    pos.set(it.x, 0, it.z);
    q.setFromAxisAngle(up, it.yaw);
    sc.setScalar(it.scale);
    m.compose(pos, q, sc);
    m.toArray(matrices, i * 16);
    colors.set(it.tint, i * 3);
    const size = sizeInScene(id, it.scale) ?? [1, 1, 1];
    centers[i * 3] = it.x;
    centers[i * 3 + 1] = size[1] / 2 + lift * it.scale;
    centers[i * 3 + 2] = it.z;
    radii[i] = 0.5 * Math.hypot(size[0], size[1], size[2]);
  });
  const nearMeshes = nearParts.map((p) => newMesh(p, n));
  const midMeshes = midParts.map((p) => newMesh(p, n));
  const farMeshes = farParts.map((p) => newMesh(p, n));
  // Bụi tre (lá mảnh, bóng ít giá trị mà nặng 7.900 tam giác mỗi bụi) không đổ bóng
  const shadowMeshes = NO_SHADOW_MODELS.has(id) ? [] : farParts.map((p) => newShadowMesh(p, n));
  return { nearMeshes, midMeshes, farMeshes, shadowMeshes, count: n, matrices, colors, centers, radii, disposables: [...nearParts, ...midParts, ...farParts].map((p) => p.geometry) };
}

/** Chép các bản `idx[0..count)` vào InstancedMesh (ma trận và màu), cập nhật số bản và bật tải lại bộ đệm. Không cấp phát. */
function fill(meshes: InstancedMesh[], set: InstanceSet, idx: Int32Array, count: number): void {
  for (let k = 0; k < meshes.length; k++) {
    const mesh = meshes[k];
    const mat = mesh.instanceMatrix.array as Float32Array;
    const col = (mesh.instanceColor as InstancedBufferAttribute).array as Float32Array;
    for (let j = 0; j < count; j++) {
      const i = idx[j];
      const a = i * 16;
      const b = j * 16;
      for (let e = 0; e < 16; e++) mat[b + e] = set.matrices[a + e];
      col[j * 3] = set.colors[i * 3];
      col[j * 3 + 1] = set.colors[i * 3 + 1];
      col[j * 3 + 2] = set.colors[i * 3 + 2];
    }
    mesh.count = count;
    mesh.visible = count > 0;
    mesh.instanceMatrix.needsUpdate = true;
    (mesh.instanceColor as InstancedBufferAttribute).needsUpdate = true;
  }
}

/** Model không đổ bóng lên cảnh (chỉ nhận bóng). */
export const NO_SHADOW_MODELS: ReadonlySet<string> = new Set(['env/bui-tre']);

/** Bóng của vật ngoài khung nhìn còn rơi vào khung nhìn nếu vật cách khung nhìn không quá khoảng này (bóng dài tối đa chừng đó với mặt trời hiện tại). */
const SHADOW_THROW = 8;

/** Bản chính có số tam giác không quá mức này thì luôn dùng bản chính (không đổi sang bản xa). */
export const ALWAYS_NEAR_TRIS = 12000;

export interface ModelInstancesProps {
  /** Model bản chính, ví dụ "env/nha-mai-ngoi"; bản xa là "env/nha-mai-ngoi-xa" */
  id: string;
  items: readonly Placement[];
  level: QualityLevel;
}

/**
 * Nhiều bản của một model (nhà, lều, tre…) vẽ bằng InstancedMesh: dùng chung hình học và vật liệu của model (không nhân bản dữ
 * liệu), mỗi phần một draw call cho cả bản chính lẫn bản xa. Mỗi khung hình tự cắt từng bản (ngoài khung nhìn, quá xa) và chia
 * bản chính / bản xa theo khoảng cách tới camera (xem `selectInstances`); số tam giác chỉ tính các bản đang thấy. Màu từng bản
 * được nhân thêm (đổi màu nhẹ). Cần Suspense phía trên (đọc model).
 */
export function ModelInstances({ id, items, level }: ModelInstancesProps) {
  // Bản vừa (LOD giữa) chỉ có và chỉ tải khi model có bản vừa dùng được và mức này có bậc vừa (Vừa, Cao); xem `isUsableMid`.
  const hasMid = isUsableMid(getManifest()?.[modelPath(midId(id))]?.tris) && marketFarDistance(level, id) > marketNearDistance(level, id);
  const near = readModel(id);
  const mid = hasMid ? readModel(midId(id)) : null;
  const far = readModel(lodId(id));
  useEffect(() => {
    const ids = hasMid ? [id, midId(id), lodId(id)] : [id, lodId(id)];
    for (const i of ids) retainModel(i);
    return () => {
      for (const i of ids) releaseModel(i);
    };
  }, [id, hasMid]);

  const set = useMemo(() => buildSet(id, near, mid, far, items), [id, near, mid, far, items]);
  useEffect(
    () => () => {
      for (const m of [...set.nearMeshes, ...set.midMeshes, ...set.farMeshes, ...set.shadowMeshes]) m.dispose();
      for (const d of set.disposables) d.dispose();
    },
    [set],
  );

  const shadows = QUALITY_TABLE[level].shadow !== 'blob';
  // Bản chính và bản xa của lượt vẽ chính chỉ nhận bóng; bóng do `shadowMeshes` đổ (bản xa, chỉ vật trong vùng quanh người chơi).
  useEffect(() => {
    for (const m of [...set.nearMeshes, ...set.midMeshes, ...set.farMeshes]) {
      m.castShadow = false;
      m.receiveShadow = shadows;
    }
  }, [set, shadows]);

  // Vùng đệm cho việc chọn mỗi khung hình (cấp phát một lần).
  const work = useMemo(
    () => ({
      planes: new Float32Array(24),
      mat: new Matrix4(),
      nearIdx: new Int32Array(set.count),
      midIdx: new Int32Array(set.count),
      farIdx: new Int32Array(set.count),
      lastNear: new Int32Array(set.count),
      lastMid: new Int32Array(set.count),
      lastFar: new Int32Array(set.count),
      lastNearN: -1,
      lastMidN: -1,
      lastFarN: -1,
      shadowIdx: new Int32Array(set.count),
      lastShadow: new Int32Array(set.count),
      lastShadowN: -1,
      // tham số chọn vật đổ bóng: dùng lại mỗi khung hình (không cấp phát trong useFrame)
      shadowParams: { focusX: 0, focusZ: 0, range: SHADOW_RANGE, planes: new Float32Array(24), throwDistance: SHADOW_THROW, centers: set.centers, radii: set.radii, count: set.count } as ShadowSelectParams,
      sel: { near: 0, mid: 0, far: 0 } as Selection,
    }),
    [set],
  );
  // Model mà bản chính chỉ nhẹ hơn bản xa chút ít (cây đa: 9.126 so với 8.000 tam giác) thì luôn dùng bản chính cho đẹp.
  const nearTris = getManifest()?.[modelPath(id)]?.tris ?? Infinity;
  const nearDist = nearTris <= ALWAYS_NEAR_TRIS ? Infinity : marketNearDistance(level, id);
  const maxDist = marketMaxDistance(level);
  const midDist = hasMid ? marketFarDistance(level, id) : nearDist;
  const frame = useRef({ nearDist, midDist, maxDist, shadows });
  frame.current = { nearDist, midDist, maxDist, shadows };

  useFrame(({ camera }) => {
    camera.updateMatrixWorld();
    work.mat.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    extractFrustumPlanes(work.mat.elements, work.planes);
    const e = camera.matrixWorld.elements;
    const f = frame.current;
    selectInstances(
      { camX: e[12], camY: e[13], camZ: e[14], planes: work.planes, centers: set.centers, radii: set.radii, count: set.count, nearDistance: f.nearDist, midDistance: f.midDist, maxDistance: f.maxDist },
      work.nearIdx,
      work.farIdx,
      work.sel,
      hasMid ? work.midIdx : undefined,
    );
    const { near: nn, mid: mn, far: fn } = work.sel;
    if (import.meta.env.DEV) {
      const w = window as unknown as { __marketDebug?: Record<string, string> };
      (w.__marketDebug ??= {})[id] = hasMid ? nn + "/" + mn + "/" + fn : nn + "/" + fn;
    }
    if (!sameSelection(work.nearIdx, nn, work.lastNear, work.lastNearN)) {
      fill(set.nearMeshes, set, work.nearIdx, nn);
      work.lastNear.set(work.nearIdx);
      work.lastNearN = nn;
    }
    if (hasMid && !sameSelection(work.midIdx, mn, work.lastMid, work.lastMidN)) {
      fill(set.midMeshes, set, work.midIdx, mn);
      work.lastMid.set(work.midIdx);
      work.lastMidN = mn;
    }
    if (!sameSelection(work.farIdx, fn, work.lastFar, work.lastFarN)) {
      fill(set.farMeshes, set, work.farIdx, fn);
      work.lastFar.set(work.farIdx);
      work.lastFarN = fn;
    }
    if (f.shadows) {
      // vật đổ bóng: trong vùng bóng quanh người chơi (bóng của vật ngoài khung nhìn nhưng sát vẫn rơi vào khung nhìn)
      work.shadowParams.focusX = shadowFocus.x;
      work.shadowParams.focusZ = shadowFocus.z;
      work.shadowParams.planes = work.planes;
      const sn = selectShadowCasters(work.shadowParams, work.shadowIdx);
      if (!sameSelection(work.shadowIdx, sn, work.lastShadow, work.lastShadowN)) {
        fill(set.shadowMeshes, set, work.shadowIdx, sn);
        work.lastShadow.set(work.shadowIdx);
        work.lastShadowN = sn;
      }
      // lượt vẽ chính vừa đặt số bản về 0 (onBeforeRender): đặt lại cho lượt vẽ bóng của khung hình sau
      for (const m of set.shadowMeshes) m.count = work.lastShadowN;
    }
  });

  return (
    <group>
      {set.nearMeshes.map((m, i) => (
        <primitive key={`n${i}`} object={m} />
      ))}
      {set.midMeshes.map((m, i) => (
        <primitive key={`m${i}`} object={m} />
      ))}
      {set.farMeshes.map((m, i) => (
        <primitive key={`f${i}`} object={m} />
      ))}
      {shadows &&
        set.shadowMeshes.map((m, i) => (
          <primitive key={`s${i}`} object={m} />
        ))}
    </group>
  );
}
