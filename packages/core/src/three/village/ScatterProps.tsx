import { useMemo } from 'react';
import { MeshStandardMaterial, type BufferGeometry } from 'three';
import { useDispose, type Item } from '../cho/MarketProcedural';
import type { QualityLevel } from '../quality';
import { ChunkedInstances } from './ChunkedInstances';
import { SCATTER_KINDS, SCATTER_MAX_DISTANCE, SCATTER_SIZES, scatterRadius, type ScatterKind, type ScatterPlacement } from './scatter';
import { SCATTER_VERTEX_COLORS, createScatterGeometry } from './scatterGeometry';

/** Ô lưới chia mảnh cho đồ rải: 48 đơn vị (làng bán kính 125 chia chừng 25 mảnh). */
export const SCATTER_CELL = 48;

/** Vật liệu của một loại đồ rải (màu theo đỉnh cho loại nhiều màu, đồi thì một màu nhân theo từng bản). Dùng cả khi biên dịch trước shader (xem `ZonePrewarm`). */
export function scatterMaterial(kind: ScatterKind): MeshStandardMaterial {
  return new MeshStandardMaterial({ color: '#FFFFFF', roughness: 1, vertexColors: SCATTER_VERTEX_COLORS[kind], flatShading: kind === 'tre' || kind === 'cay-qua' });
}

/** Một bản nhân bản của món rải: đồi dùng `scale` làm bán kính chân và `sy` làm chiều cao tương đối. */
function itemOf(p: ScatterPlacement): Item {
  if (p.kind === 'doi') return { x: p.x, z: p.z, yaw: p.yaw, sx: p.scale, sy: p.scale * (p.sy ?? 1), sz: p.scale, color: p.tint };
  return { x: p.x, z: p.z, yaw: p.yaw, scale: p.scale, color: p.tint };
}

/**
 * Đồ rải dựng bằng code của làng lớn (bước X3): lũy tre và đồi tre, cây ăn quả, phên phơi giấy, cầu ao, đồi. Mỗi loại một hình học và một vật liệu dùng chung, chia mảnh theo ô lưới và chỉ vẽ mảnh trong tầm
 * (xem `ChunkedInstances`; tầm theo mức chất lượng ở `SCATTER_MAX_DISTANCE`). `only`: chỉ dựng loại này (vùng làng dựng từng loại ở một khung hình riêng để không khựng). Phên, cầu ao đổ bóng, các loại khác không (cho nhẹ). Rời cảnh thì giải phóng. Đặt trong <WalkWorld>.
 */
export function ScatterProps({ scatter, level, only }: { scatter: readonly ScatterPlacement[]; level: QualityLevel; only?: ScatterKind }) {
  const kinds = useMemo(() => SCATTER_KINDS.filter((k) => (only === undefined || only === k) && scatter.some((p) => p.kind === k)), [scatter, only]);
  const res = useMemo(() => kinds.map((kind) => ({ kind, geometry: createScatterGeometry(kind) as BufferGeometry, material: scatterMaterial(kind) })), [kinds]);
  useDispose(useMemo(() => res.flatMap((r) => [r.geometry, r.material]), [res]));
  const items = useMemo(() => res.map((r) => scatter.filter((p) => p.kind === r.kind).map(itemOf)), [res, scatter]);
  return (
    <>
      {res.map((r, i) => (
        <ChunkedInstances
          key={r.kind}
          geometry={r.geometry}
          material={r.material}
          items={items[i]}
          cell={SCATTER_CELL}
          maxDistance={SCATTER_MAX_DISTANCE[level][r.kind]}
          itemRadius={r.kind === 'doi' ? 16 : Math.max(2, SCATTER_SIZES[r.kind].r * 1.6, ...scatter.filter((p) => p.kind === r.kind).map((p) => scatterRadius(p)))}
          cast={r.kind === 'phen' || r.kind === 'cau-ao'}
          receive
        />
      ))}
    </>
  );
}
