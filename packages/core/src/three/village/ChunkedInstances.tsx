import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import type { BufferGeometry, InstancedMesh, Material } from 'three';
import { buildInstanced, type Item } from '../cho/instancing';
import { usePlayerState } from '../WalkWorld';
import { chunkInRange, chunkScatter } from './scatter';

/** Cứ bấy nhiêu giây kiểm tra lại mảnh nào ở trong tầm (không cần mỗi khung hình). */
const TICK = 0.25;

export interface ChunkedInstancesProps {
  geometry: BufferGeometry;
  material: Material;
  items: readonly Item[];
  /** Cạnh ô lưới chia mảnh (đơn vị cảnh) */
  cell: number;
  /** Mảnh xa người chơi hơn tầm này (tính tới mặt mảnh) thì không vẽ */
  maxDistance: number;
  /** Bán kính một món (để mảnh bao đủ) */
  itemRadius: number;
  cast?: boolean;
  receive?: boolean;
}

/**
 * Như `Instances` nhưng chia các bản thành mảnh theo ô lưới, mỗi mảnh một InstancedMesh riêng (bước X3): three tự cắt mảnh ngoài khung nhìn (mỗi mảnh có hình cầu bao), và mảnh xa người chơi hơn
 * `maxDistance` bị ẩn (kiểm tra mỗi 0,25 giây, không cấp phát). Làng bán kính 125 có hàng trăm bụi tre và phên, nếu vẽ hết mọi khung hình thì tam giác tính theo cả làng chứ không theo cái đang nhìn
 * thấy. Hình học và vật liệu do nơi gọi giữ và giải phóng; ở đây chỉ giải phóng bộ đệm bản nhân bản. Ít bản (dưới `cell` một mảnh) thì chỉ có một mảnh.
 */
export function ChunkedInstances({ geometry, material, items, cell, maxDistance, itemRadius, cast = false, receive = true }: ChunkedInstancesProps) {
  const player = usePlayerState();
  const chunks = useMemo(() => {
    const raw = chunkScatter(items, cell, () => itemRadius);
    return raw.map((c) => {
      const mesh: InstancedMesh = buildInstanced(geometry, material, c.items, cast, receive);
      mesh.frustumCulled = true; // buildInstanced tắt cắt; mảnh nhỏ thì để three cắt theo hình cầu bao của cả mảnh
      mesh.computeBoundingSphere();
      return { mesh, x: c.x, z: c.z, r: c.r };
    });
  }, [items, cell, itemRadius, geometry, material, cast, receive]);
  useEffect(
    () => () => {
      for (const c of chunks) c.mesh.dispose();
    },
    [chunks],
  );
  const state = useMemo(() => ({ t: TICK }), []);
  useFrame((_, dt) => {
    if (!player) return;
    state.t += dt;
    if (state.t < TICK) return;
    state.t = 0;
    for (let i = 0; i < chunks.length; i++) {
      const c = chunks[i];
      c.mesh.visible = chunkInRange(c.x, c.z, c.r, player.x, player.z, maxDistance);
    }
  });
  return (
    <group>
      {chunks.map((c, i) => (
        <primitive key={i} object={c.mesh} />
      ))}
    </group>
  );
}
