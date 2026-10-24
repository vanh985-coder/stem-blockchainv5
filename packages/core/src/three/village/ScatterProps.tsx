import { useFrame } from '@react-three/fiber';
import { useMemo } from 'react';
import { DoubleSide, MeshStandardMaterial, type BufferGeometry } from 'three';
import { useDispose, type Item } from '../cho/MarketProcedural';
import type { QualityLevel } from '../quality';
import { ChunkedInstances } from './ChunkedInstances';
import { SCATTER_KINDS, SCATTER_MAX_DISTANCE, SCATTER_SIZES, scatterRadius, type ScatterKind, type ScatterPlacement } from './scatter';
import { SCATTER_VERTEX_COLORS, createScatterGeometry } from './scatterGeometry';

/** Ô lưới chia mảnh cho đồ rải: 48 đơn vị (làng bán kính 125 chia chừng 25 mảnh). */
export const SCATTER_CELL = 48;

/** Thời gian (giây) của gió lay vải ở sào phơi: MỘT uniform dùng chung cho mọi vật liệu sào vải, do `ClothClock` ghi mỗi khung hình (0 khi "Giảm chuyển động": vải đứng yên). */
export const CLOTH_TIME = { value: 0 };

/**
 * Vật liệu sào vải: vải hai mặt, đỉnh lệch theo gió ngay trong bộ đổ bóng đỉnh (không cập nhật hình học trên CPU, không tạo object mới mỗi khung hình). Độ lệch = sóng sin theo thời gian, vị trí bản trong cảnh
 * (mỗi sào một pha) và độ cao đỉnh, nhân với `aSway` (0 ở trụ và xà, tới 1 ở mép dưới tấm vải): vải lay theo phương z (vuông góc tấm) là chính, nhích nhẹ theo x.
 */
function clothMaterial(): MeshStandardMaterial {
  const m = new MeshStandardMaterial({ color: '#FFFFFF', roughness: 0.95, vertexColors: true, side: DoubleSide });
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uClothTime = CLOTH_TIME;
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nattribute float aSway;\nuniform float uClothTime;').replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
#ifdef USE_INSTANCING
  float clothPhase = instanceMatrix[3].x * 0.37 + instanceMatrix[3].z * 0.21;
#else
  float clothPhase = 0.0;
#endif
  float clothWave = sin(uClothTime * 2.1 + clothPhase + position.x * 1.7) * 0.6 + sin(uClothTime * 3.4 + clothPhase * 1.3 + position.y * 2.3) * 0.3;
  transformed.z += clothWave * aSway * 0.32;
  transformed.x += sin(uClothTime * 1.7 + clothPhase) * aSway * 0.07;`,
    );
  };
  m.customProgramCacheKey = () => 'cloth-sway-v1';
  return m;
}

/** Vật liệu của một loại đồ rải (màu theo đỉnh cho loại nhiều màu, đồi thì một màu nhân theo từng bản). Dùng cả khi biên dịch trước shader (xem `ZonePrewarm`). */
export function scatterMaterial(kind: ScatterKind): MeshStandardMaterial {
  if (kind === 'sao-vai') return clothMaterial();
  return new MeshStandardMaterial({ color: '#FFFFFF', roughness: 1, vertexColors: SCATTER_VERTEX_COLORS[kind], flatShading: kind === 'tre' || kind === 'cay-qua' });
}

/** Đồng hồ gió của sào vải: mỗi khung hình ghi giây của cảnh vào `CLOTH_TIME` (không cộng dồn nên nhiều vùng cùng gắn vẫn đúng một nhịp); `animate` false thì ghi 0. Không cấp phát. */
function ClothClock({ animate }: { animate: boolean }) {
  useFrame((state) => {
    CLOTH_TIME.value = animate ? state.clock.elapsedTime : 0;
  });
  return null;
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
export function ScatterProps({ scatter, level, only, animate = true }: { scatter: readonly ScatterPlacement[]; level: QualityLevel; only?: ScatterKind; /** false ("Giảm chuyển động"): sào vải đứng yên */ animate?: boolean }) {
  const kinds = useMemo(() => SCATTER_KINDS.filter((k) => (only === undefined || only === k) && scatter.some((p) => p.kind === k)), [scatter, only]);
  const res = useMemo(() => kinds.map((kind) => ({ kind, geometry: createScatterGeometry(kind) as BufferGeometry, material: scatterMaterial(kind) })), [kinds]);
  useDispose(useMemo(() => res.flatMap((r) => [r.geometry, r.material]), [res]));
  const items = useMemo(() => res.map((r) => scatter.filter((p) => p.kind === r.kind).map(itemOf)), [res, scatter]);
  return (
    <>
      {res.some((r) => r.kind === 'sao-vai') && <ClothClock animate={animate} />}
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
