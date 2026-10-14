import { useEffect, useMemo, type Ref } from 'react';
import { BoxGeometry, DynamicDrawUsage, type BufferGeometry, InstancedBufferAttribute, InstancedMesh, Matrix4, MeshStandardMaterial, Quaternion, Vector3, type Object3D } from 'three';
import { getManifest } from '../assets/store';
import { buildParts, fitOf, newMesh } from './cho/ModelInstances';
import { isUsableMid, lodId, midId, modelPath } from './modelIds';
import { readModel, releaseModel, retainModel, type ModelData } from './modelLoader';
import { sizeOf } from './modelSizes';
import type { QualityLevel } from './quality';

/**
 * Nhiều bản của một model có vị trí thay đổi mỗi khung hình (chướng ngại, cảnh hai bên đường ở game chạy). Khác `ModelInstances` (chợ: bố cục cố định, tự cắt theo camera),
 * ở đây nơi gọi tự đưa từng bản vào mỗi khung hình: `begin()`, nhiều lần `add(...)`, rồi `end()`. Bộ đệm được cấp một lần theo `capacity` và dùng lại (không cấp phát khi chạy);
 * vượt `capacity` thì bỏ bớt. Mỗi bản chọn bậc chính / vừa / xa theo `dist` (khoảng cách tới camera do nơi gọi tính): dưới `nearDist` bản chính, dưới `midDist` bản vừa (nếu model có
 * bản vừa dùng được và mức này cho phép), còn lại bản xa. Kích thước model gốc theo `sizeOf(id)` (cao đúng `height`, chân ở y = 0); `add` nhân thêm hệ số `sx, sy, sz` theo trục
 * của model (trước khi xoay).
 */
export interface DynamicInstancesApi {
  begin(): void;
  /** Vị trí chân (x, y, z), góc xoay quanh trục đứng, hệ số phóng theo trục model, màu nhân thêm, khoảng cách tới camera. */
  add(x: number, y: number, z: number, yaw: number, sx: number, sy: number, sz: number, r: number, g: number, b: number, dist: number): void;
  end(): void;
}

export interface DynamicModelProps {
  /** Model bản chính, ví dụ "games/man-02-duoi-ti/xe-bo"; bản vừa "-vua", bản xa "-xa" */
  id: string;
  capacity: number;
  level: QualityLevel;
  nearDist: number;
  midDist: number;
  apiRef: Ref<DynamicInstancesApi>;
  /** Có nhận bóng của người chơi không (mức Vừa và Cao) */
  receiveShadow?: boolean;
}

/** Đưa `api` ra cho nơi gọi qua ref (ref hàm hoặc ref đối tượng), thu hồi khi gỡ. */
function useApiRef<T>(ref: Ref<T>, api: T): void {
  useEffect(() => {
    if (typeof ref === 'function') {
      ref(api);
      return () => {
        ref(null);
      };
    }
    if (ref) {
      (ref as { current: T | null }).current = api;
      return () => {
        (ref as { current: T | null }).current = null;
      };
    }
    return undefined;
  }, [ref, api]);
}

interface Tier {
  meshes: InstancedMesh[];
  n: number;
}

function makeTier(parts: ReturnType<typeof buildParts>, capacity: number): Tier {
  return { meshes: parts.map((p) => newMesh(p, capacity)), n: 0 };
}

/** Ghi một bản vào mọi phần (mesh) của một bậc: ma trận và màu. */
function write(t: Tier, capacity: number, m: Matrix4, r: number, g: number, b: number): void {
  if (t.n >= capacity) return;
  const i = t.n++;
  for (let k = 0; k < t.meshes.length; k++) {
    const mesh = t.meshes[k];
    m.toArray(mesh.instanceMatrix.array as unknown as number[], i * 16);
    const c = (mesh.instanceColor as InstancedBufferAttribute).array as Float32Array;
    c[i * 3] = r;
    c[i * 3 + 1] = g;
    c[i * 3 + 2] = b;
  }
}

function flush(t: Tier): void {
  for (let k = 0; k < t.meshes.length; k++) {
    const mesh = t.meshes[k];
    mesh.count = t.n;
    mesh.visible = t.n > 0;
    mesh.instanceMatrix.needsUpdate = true;
    (mesh.instanceColor as InstancedBufferAttribute).needsUpdate = true;
  }
}

export function DynamicModel({ id, capacity, level, nearDist, midDist, apiRef, receiveShadow = false }: DynamicModelProps) {
  const hasMid = level !== 'low' && isUsableMid(getManifest()?.[modelPath(midId(id))]?.tris) && midDist > nearDist;
  // `nearDist` = 0 nghĩa là không bao giờ dùng bản chính (mức Thấp): khỏi tải bản chính (nhà bản chính nặng 1,7 MB) và lấy cỡ từ bản xa (cùng khung bao)
  const useNear = nearDist > 0;
  const near: ModelData | null = useNear ? readModel(id) : null;
  const mid: ModelData | null = hasMid ? readModel(midId(id)) : null;
  const far: ModelData = readModel(lodId(id));
  useEffect(() => {
    const ids = [...(useNear ? [id] : []), ...(hasMid ? [midId(id)] : []), lodId(id)];
    for (const i of ids) retainModel(i);
    return () => {
      for (const i of ids) releaseModel(i);
    };
  }, [id, hasMid, useNear]);

  const set = useMemo(() => {
    const fit = fitOf(id, (near ?? far).scene);
    const lift = sizeOf(id)?.lift ?? 0;
    const f = { scale: fit.scale, offsetY: fit.offsetY + lift };
    const nearParts = near ? buildParts(near.scene, f.scale, f.offsetY) : [];
    const midParts = mid ? buildParts(mid.scene, f.scale, f.offsetY) : [];
    const farParts = buildParts(far.scene, f.scale, f.offsetY);
    return {
      near: makeTier(nearParts, capacity),
      mid: makeTier(midParts, capacity),
      far: makeTier(farParts, capacity),
      geometries: [...nearParts, ...midParts, ...farParts].map((p) => p.geometry),
    };
  }, [id, near, mid, far, capacity]);

  useEffect(
    () => () => {
      for (const t of [set.near, set.mid, set.far]) for (const m of t.meshes) m.dispose();
      for (const g of set.geometries) g.dispose();
    },
    [set],
  );
  useEffect(() => {
    for (const t of [set.near, set.mid, set.far]) for (const m of t.meshes) m.receiveShadow = receiveShadow && level !== 'low';
  }, [set, receiveShadow, level]);

  // Vùng đệm tính ma trận: cấp một lần, dùng lại mỗi lần add (không cấp phát khi chạy)
  const work = useMemo(() => ({ m: new Matrix4(), q: new Quaternion(), p: new Vector3(), s: new Vector3(), up: new Vector3(0, 1, 0) }), []);
  const api = useMemo<DynamicInstancesApi>(
    () => ({
      begin() {
        set.near.n = 0;
        set.mid.n = 0;
        set.far.n = 0;
      },
      add(x, y, z, yaw, sx, sy, sz, r, g, b, dist) {
        work.p.set(x, y, z);
        work.q.setFromAxisAngle(work.up, yaw);
        work.s.set(sx, sy, sz);
        work.m.compose(work.p, work.q, work.s);
        const tier = useNear && dist < nearDist ? set.near : mid && dist < midDist ? set.mid : set.far;
        write(tier, capacity, work.m, r, g, b);
      },
      end() {
        flush(set.near);
        flush(set.mid);
        flush(set.far);
      },
    }),
    [set, work, nearDist, midDist, capacity, mid, useNear],
  );
  useApiRef(apiRef, api);

  return (
    <group>
      {[...set.near.meshes, ...set.mid.meshes, ...set.far.meshes].map((m) => (
        <primitive key={m.uuid} object={m as Object3D} />
      ))}
    </group>
  );
}

export interface DynamicBoxesProps {
  capacity: number;
  apiRef: Ref<DynamicBoxesApi>;
  roughness?: number;
  /** Hình dùng thay hộp đơn vị (ví dụ đống rơm, đồng xu). Hình do nơi gọi giữ và giải phóng. */
  geometry?: BufferGeometry;
}

/** Hộp đơn vị (1 × 1 × 1) nhân bản có màu riêng từng bản: cột, sào, kiện hàng… do code dựng, cùng cách dùng lại bộ đệm như `DynamicModel`. */
export interface DynamicBoxesApi {
  begin(): void;
  /** Tâm hộp (x, y, z), kích thước (sx, sy, sz), góc xoay quanh trục đứng, màu */
  add(x: number, y: number, z: number, sx: number, sy: number, sz: number, yaw: number, r: number, g: number, b: number): void;
  end(): void;
}

export function DynamicBoxes({ capacity, apiRef, roughness = 0.9, geometry: given }: DynamicBoxesProps) {
  const res = useMemo(() => {
    const geometry = given ?? new BoxGeometry(1, 1, 1);
    const material = new MeshStandardMaterial({ color: '#FFFFFF', roughness });
    const mesh = new InstancedMesh(geometry, material, capacity);
    mesh.instanceMatrix.setUsage(DynamicDrawUsage);
    mesh.instanceColor = new InstancedBufferAttribute(new Float32Array(capacity * 3), 3);
    mesh.instanceColor.setUsage(DynamicDrawUsage);
    mesh.count = 0;
    mesh.frustumCulled = false;
    return { geometry, material, mesh, n: 0, own: !given };
  }, [capacity, roughness, given]);
  useEffect(
    () => () => {
      res.mesh.dispose();
      if (res.own) res.geometry.dispose();
      res.material.dispose();
    },
    [res],
  );
  const work = useMemo(() => ({ m: new Matrix4(), q: new Quaternion(), p: new Vector3(), s: new Vector3(), up: new Vector3(0, 1, 0) }), []);
  const api = useMemo<DynamicBoxesApi>(
    () => ({
      begin() {
        res.n = 0;
      },
      add(x, y, z, sx, sy, sz, yaw, r, g, b) {
        if (res.n >= capacity) return;
        const i = res.n++;
        work.p.set(x, y, z);
        work.q.setFromAxisAngle(work.up, yaw);
        work.s.set(sx, sy, sz);
        work.m.compose(work.p, work.q, work.s);
        work.m.toArray(res.mesh.instanceMatrix.array as unknown as number[], i * 16);
        const c = (res.mesh.instanceColor as InstancedBufferAttribute).array as Float32Array;
        c[i * 3] = r;
        c[i * 3 + 1] = g;
        c[i * 3 + 2] = b;
      },
      end() {
        res.mesh.count = res.n;
        res.mesh.visible = res.n > 0;
        res.mesh.instanceMatrix.needsUpdate = true;
        (res.mesh.instanceColor as InstancedBufferAttribute).needsUpdate = true;
      },
    }),
    [res, work, capacity],
  );
  useApiRef(apiRef, api);
  return <primitive object={res.mesh} />;
}
