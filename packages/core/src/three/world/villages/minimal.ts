import type { VillageId } from '../../../village';
import type { Placement, PropKind, PropPlacement } from '../../cho/marketLayout';
import type { VillageLayoutInput } from '../../village/villageLayout';

/**
 * Làng chưa dựng đủ (Dệt, Khắc Dấu, Bạc: nội dung 3D ở bước W2 và mốc 3): cổng đúng model, vài nhà và bụi tre, vài đồ nhỏ, một sân trước và MỘT biển gỗ "Học cùng [người dẫn]" dẫn vào bài học
 * của làng (màn 4, 7, 10); các game còn "sắp ra mắt" nên chưa có biển. Cùng cỡ và cùng cách đặt cổng, đường và hàng rào với Làng Giấy (bán kính 21, cổng ở (0, −17,5)) để hàm đổi hệ tọa độ và
 * đồ thị đường dùng chung. Xếp theo vị trí đã kiểm của Làng Giấy (không chồng nhau, nằm trong hàng rào), lật trái phải ở làng `mirror`.
 */
export interface MinimalVillageOptions {
  id: VillageId;
  gateModel: string;
  /** Số màn của bài học (biển "Học cùng …") */
  lessonLevel: number;
  /** Lật trái phải (cho các làng không giống hệt nhau) */
  mirror?: boolean;
  /** Mái của 3 ngôi nhà: ngói hay tranh */
  roofs: readonly ['ngoi' | 'tranh', 'ngoi' | 'tranh', 'ngoi' | 'tranh'];
  seed: number;
}

const HOUSE = { ngoi: 'env/nha-mai-ngoi', tranh: 'env/nha-mai-tranh' } as const;
const prop = (kind: PropKind, x: number, z: number, scale = 1, tint: readonly [number, number, number] = [1, 1, 1]): PropPlacement => ({ kind, x, z, yaw: 0, scale, tint });

export function minimalVillage(o: MinimalVillageOptions): VillageLayoutInput {
  const sx = o.mirror ? -1 : 1;
  const house = (roof: 'ngoi' | 'tranh', x: number, z: number, scale: number, tint: readonly [number, number, number]): Placement => ({
    model: HOUSE[roof],
    x: x * sx,
    z,
    yaw: Math.atan2(-x * sx, -z) + (x * sx < 0 ? 0.25 : -0.25), // mặt nhà hơi quay vào sân
    scale,
    tint,
  });
  const bamboo = (x: number, z: number, scale: number, yaw: number): Placement => ({ model: 'env/bui-tre', x: x * sx, z, yaw, scale, tint: [0.96, 0.98, 0.94] });
  return {
    id: o.id,
    radius: 21,
    gate: { model: o.gateModel, x: 0, z: -17.5, yaw: Math.PI },
    start: { x: 0, z: -14, yaw: 0 },
    placements: [
      house(o.roofs[0], -12, 0.5, 1.05, [1, 0.97, 0.94]),
      house(o.roofs[1], 11, 11, 1, [1, 0.98, 0.92]),
      house(o.roofs[2], -8, 12.8, 0.95, [0.98, 1, 1]),
      bamboo(14.5, -6.5, 1.0, 2.2),
      bamboo(-1.5, 16, 1.1, 2.4),
      bamboo(-13.2, 8.2, 1.0, 3.5),
      bamboo(-5.5, -13.5, 0.9, 5.1),
      bamboo(6.5, -13.5, 0.95, 4.2),
    ],
    props: [
      prop('chum', -8.2, -1.5, 1.05),
      prop('chum', 7.0, 9.0),
      prop('hoa', -9.2, -5.0, 1.1, [0.95, 0.92, 0.9]),
      prop('hoa', 7.5, 13.2),
      prop('hoa', 10.3, -8.3),
      prop('hoa', -4.8, -14),
    ].map((p) => ({ ...p, x: p.x * sx })),
    // một biển gỗ ở sân trước, mặt quay về phía nam (về người vào làng)
    boards: [{ level: o.lessonLevel, icon: 'ui/icons/trang-vang', x: 0, z: -8.2, yaw: Math.PI }],
    yards: [{ x: 0, z: -7.5, r: 5.2 }],
    roads: [{ x0: 0, z0: -19, x1: 0, z1: -6, width: 4.4 }],
    fence: { radius: 19.8, gap: 6.5 },
    seed: o.seed,
  };
}
