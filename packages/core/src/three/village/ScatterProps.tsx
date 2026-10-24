import { useFrame } from '@react-three/fiber';
import { useMemo } from 'react';
import { Color, DoubleSide, MeshStandardMaterial, type BufferGeometry } from 'three';
import { useDispose, type Item } from '../cho/MarketProcedural';
import type { QualityLevel } from '../quality';
import { ChunkedInstances } from './ChunkedInstances';
import { SCATTER_KINDS, SCATTER_MAX_DISTANCE, SCATTER_SIZES, scatterRadius, type ScatterKind, type ScatterPlacement } from './scatter';
import { CLOTH_PALETTE, CLOTH_MIN_LENGTH } from './clothPoles';
import { CLOTH_TOP, SCATTER_VERTEX_COLORS, createScatterGeometry } from './scatterGeometry';

/** Ô lưới chia mảnh cho đồ rải: 48 đơn vị (làng bán kính 125 chia chừng 25 mảnh). */
export const SCATTER_CELL = 48;

/** Thời gian (giây) của gió lay vải ở sào phơi: MỘT uniform dùng chung cho mọi vật liệu sào vải, do `ClothClock` ghi mỗi khung hình (0 khi "Giảm chuyển động": vải đứng yên). */
export const CLOTH_TIME = { value: 0 };

/** Màu nhuộm của sáu loại vải dưới dạng hằng GLSL (không gian màu tuyến tính, như màu theo đỉnh của three). */
function clothPaletteGlsl(): string {
  const c = new Color();
  const items = CLOTH_PALETTE.map((hex) => {
    c.set(hex);
    return 'vec3(' + c.r.toFixed(4) + ', ' + c.g.toFixed(4) + ', ' + c.b.toFixed(4) + ')';
  });
  return 'const vec3 CLOTH_PAL[6] = vec3[6](' + items.join(', ') + ');';
}

/**
 * Vật liệu sào vải: vải hai mặt, đỉnh lệch theo gió ngay trong bộ đổ bóng đỉnh (không cập nhật hình học trên CPU, không tạo object mới mỗi khung hình). Độ lệch = sóng sin theo thời gian, vị trí bản trong cảnh
 * (mỗi sào một pha) và độ cao đỉnh, nhân với aSway (0 ở trụ và xà, tới 1 ở mép dưới tấm vải): vải lay theo phương z (vuông góc tấm) là chính, nhích nhẹ theo x. Mỗi sào mang ba mã trong màu bản (instanceColor, xem
 * clothPoles.ts): mã 0 thì tấm ở chỗ treo đó bị co lại thành một đường (không vẽ), còn lại thì chọn màu nhuộm trong bảng và co chiều dài. Trụ và xà (aSlot = −1) giữ màu theo đỉnh.
 */
function clothMaterial(): MeshStandardMaterial {
  const m = new MeshStandardMaterial({ color: '#FFFFFF', roughness: 0.95, vertexColors: true, side: DoubleSide });
  const palette = clothPaletteGlsl();
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uClothTime = CLOTH_TIME;
    // vải hai mặt bị tối ở mặt sau và khi nắng xiên: phát sáng nhẹ theo màu vải để màu nhuộm vẫn rõ
    shader.fragmentShader = shader.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n  totalEmissiveRadiance += diffuseColor.rgb * 0.3;');
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aSway;\nattribute float aSlot;\nuniform float uClothTime;\n' + palette)
      .replace(
        '#include <color_vertex>',
        [
          '#include <color_vertex>',
          'float clothOn = 1.0;',
          'float clothLen = 1.0;',
          '#ifdef USE_INSTANCING_COLOR',
          '  vColor.rgb = color.rgb;',
          '  if (aSlot > -0.5) {',
          '    float clothV = (aSlot < 0.5 ? instanceColor.x : (aSlot < 1.5 ? instanceColor.y : instanceColor.z)) * 8.0;',
          '    if (clothV < 1.0) { clothOn = 0.0; clothLen = 0.0; }',
          '    else {',
          '      vColor.rgb = CLOTH_PAL[int(floor(clothV)) - 1];',
          '      clothLen = ' + CLOTH_MIN_LENGTH.toFixed(2) + ' + ' + (1 - CLOTH_MIN_LENGTH).toFixed(2) + ' * fract(clothV);',
          '    }',
          '  }',
          '#endif',
        ].join('\n'),
      )
      .replace(
        '#include <begin_vertex>',
        [
          '#include <begin_vertex>',
          '  if (aSlot > -0.5) transformed.y = ' + CLOTH_TOP.toFixed(2) + ' - (' + CLOTH_TOP.toFixed(2) + ' - transformed.y) * clothLen;',
          '#ifdef USE_INSTANCING',
          '  float clothPhase = instanceMatrix[3].x * 0.37 + instanceMatrix[3].z * 0.21;',
          '#else',
          '  float clothPhase = 0.0;',
          '#endif',
          '  float clothWave = sin(uClothTime * 2.1 + clothPhase + position.x * 1.7) * 0.6 + sin(uClothTime * 3.4 + clothPhase * 1.3 + position.y * 2.3) * 0.3;',
          '  transformed.z += clothWave * aSway * 0.32 * clothOn;',
          '  transformed.x += sin(uClothTime * 1.7 + clothPhase) * aSway * 0.07 * clothOn;',
        ].join('\n'),
      );
  };
  m.customProgramCacheKey = () => 'cloth-sway-v3';
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
