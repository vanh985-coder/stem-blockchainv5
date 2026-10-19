import type { Placement, PropKind, PropPlacement } from '../../cho/marketLayout';
import type { VillageGuideDef, VillageLayoutInput } from '../../village/villageLayout';

/**
 * Bố cục cảnh Làng Giấy (spec 05 mục "Cảnh làng", xếp theo ảnh concept-lang-giay), khu đi lại bán kính 21. Chỉ là dữ liệu (không import three):
 * tọa độ như chợ (+Z là phía bắc, người chơi nhìn về +Z thì bên phải màn hình là −X).
 *
 * Người chơi vào từ cổng ở phía nam (0, −17,5), đi lên theo con đường đất tới sân trước các biển gỗ. Bên trái (+X) là sân phơi giấy 6 phên xếp hai hàng; bên phải
 * (−X) là nhà ngói và bàn chép sổ có cuốn Sổ Chung bìa tím với bác An đứng cạnh; phía sau là ba bể ngâm giấy giữa hai nhà, bụi tre bao quanh.
 */
const rack = (x: number, z: number, yaw = 0): Placement => ({ model: 'env/phen-phoi-giay', x, z, yaw, scale: 1, tint: [1, 1, 1] });
const house = (model: 'env/nha-mai-ngoi' | 'env/nha-mai-tranh', x: number, z: number, scale: number, tint: readonly [number, number, number]): Placement => ({
  model,
  x,
  z,
  yaw: Math.atan2(-x, -z) + (x < 0 ? 0.25 : -0.25), // mặt nhà hơi quay vào sân
  scale,
  tint,
});
const bamboo = (x: number, z: number, scale: number, yaw: number): Placement => ({ model: 'env/bui-tre', x, z, yaw, scale, tint: [0.96, 0.98, 0.94] });
const prop = (kind: PropKind, x: number, z: number, yaw = 0, scale = 1, tint: readonly [number, number, number] = [1, 1, 1]): PropPlacement => ({ kind, x, z, yaw, scale, tint });

/** Sân phơi giấy: 6 phên xếp hai hàng, mỗi phên có 4 chân giá (code dựng). */
const RACKS: Placement[] = [rack(5, 1.2), rack(8.2, 1.2, 0.05), rack(11.4, 1.2, -0.04), rack(5, 4.4, -0.03), rack(8.2, 4.4), rack(11.4, 4.4, 0.04)];

const PLACEMENTS: Placement[] = [
  house('env/nha-mai-ngoi', -12, 0.5, 1.05, [1, 0.97, 0.94]),
  house('env/nha-mai-ngoi', -8, 12.8, 0.95, [0.98, 1, 1]),
  house('env/nha-mai-tranh', 11, 11, 1, [1, 0.98, 0.92]),
  house('env/nha-mai-tranh', -11.5, -8, 0.92, [0.96, 0.96, 0.94]),
  ...RACKS,
  // bụi tre bao quanh khu (tránh cổng ở phía nam)
  bamboo(14.5, -6.5, 1.0, 2.2),
  bamboo(-1.5, 16, 1.1, 2.4),
  bamboo(5, 14.8, 0.95, 0.8),
  bamboo(-13.2, 8.2, 1.0, 3.5),
  bamboo(-5.5, -13.5, 0.9, 5.1),
  bamboo(6.5, -13.5, 0.95, 4.2),
];

const PROPS: PropPlacement[] = [
  // bàn chép sổ và cuốn Sổ Chung bìa tím trên bàn
  prop('ban-chep', -5.4, 3.6, 0.3),
  prop('so-chung', -5.4, 3.6, 0.3),
  // ba bể ngâm giấy (đá) kèm mặt nước
  prop('be-ngam', -3.2, 9.4),
  prop('nuoc', -3.2, 9.4),
  prop('be-ngam', 0.2, 9.4),
  prop('nuoc', 0.2, 9.4),
  prop('be-ngam', 3.6, 9.4),
  prop('nuoc', 3.6, 9.4),
  // chồng giấy: cạnh sân phơi, bể ngâm và nhà
  prop('giay', 13.4, -0.8, 0.4),
  prop('giay', 14.1, 0.4, -0.2),
  prop('giay', 13.7, 7.2, 0.1),
  prop('giay', -9.2, 6.0, 0.6),
  prop('giay', -8.0, 7.6, 0.1),
  prop('giay', 6.0, 7.4, 0.3),
  prop('giay', -7.3, -2.5, -0.4),
  // chum vại và khóm hoa quanh nhà
  prop('chum', -8.2, -1.5, 0, 1.05),
  prop('chum', -8.5, 5.0, 0, 0.9),
  prop('chum', 7.0, 9.0, 0, 1),
  prop('hoa', -9.2, -5.0, 0, 1.1, [0.95, 0.92, 0.9]),
  prop('hoa', -14.8, -4.2, 0, 0.9, [0.95, 0.9, 0.95]),
  prop('hoa', -15.8, 3.4, 0, 1.2, [0.93, 0.93, 0.9]),
  prop('hoa', 7.5, 13.2, 0, 1, [0.95, 0.95, 0.9]),
  prop('hoa', -6.2, 15.6, 0, 1.1, [0.9, 0.92, 0.95]),
  prop('hoa', 15.2, 12.0, 0, 1, [0.95, 0.9, 0.92]),
  prop('hoa', 10.3, -8.3, 0, 1, [0.95, 0.95, 0.9]),
  prop('hoa', -4.8, -14, 0, 1, [0.9, 0.93, 0.95]),
  prop('hoa', 5.2, -14.3, 0, 1.1, [0.95, 0.92, 0.92]),
];

/** Chân giá của phên (4 chân dưới mỗi phên, bước 8d). */
const RACK_LEGS: readonly (readonly [number, number])[] = [
  [-1.0, -0.6],
  [-1.0, 0.6],
  [1.0, -0.6],
  [1.0, 0.6],
];
const legProps: PropPlacement[] = RACKS.flatMap((r) =>
  RACK_LEGS.map(([lx, lz]) => {
    const c = Math.cos(r.yaw);
    const s = Math.sin(r.yaw);
    return prop('chan', r.x + lx * c + lz * s, r.z - lx * s + lz * c);
  }),
);

export const LANG_GIAY_LAYOUT: VillageLayoutInput & { guide: VillageGuideDef } = {
  id: 'lang-giay',
  radius: 21,
  gate: { model: 'env/cong-lang-giay', x: 0, z: -17.5, yaw: Math.PI },
  start: { x: 0, z: -14, yaw: 0 },
  placements: PLACEMENTS,
  props: [...PROPS, ...legProps],
  // ba biển gỗ ở sân trước, mặt quay về phía nam (về phía người vào làng)
  boards: [
    { level: 1, icon: 'ui/icons/trang-vang', x: 4.6, z: -9.4, yaw: Math.PI },
    { level: 2, icon: 'ui/icons/guoc-moc', x: 0, z: -8.2, yaw: Math.PI },
    { level: 3, icon: 'ui/icons/ngoi-sao', x: -4.6, z: -9.4, yaw: Math.PI },
  ],
  // bác An đứng sau bàn chép sổ, nhìn về phía nam (về phía người chơi)
  guide: { character: 'bacAn', x: -5.6, z: 5.3, yaw: Math.PI },
  yards: [
    { x: 0, z: -7.5, r: 5.2 },
    { x: 8.2, z: 2.8, r: 6.5 },
    { x: -3.2, z: 7.4, r: 5 },
  ],
  roads: [{ x0: 0, z0: -19, x1: 0, z1: -6, width: 4.4 }],
  fence: { radius: 19.8, gap: 6.5 },
  seed: 20260106,
};
