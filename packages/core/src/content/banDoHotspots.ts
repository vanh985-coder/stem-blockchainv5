import type { VillageId } from '../village';

/**
 * Tọa độ 4 điểm làng trên bản đồ, tính theo % của ảnh (x: từ trái sang, y: từ trên xuống).
 * Chỉnh bằng trang /dev/ban-do-hotspots: kéo thả rồi bấm "Chép", dán đè lên khối BAN_DO_HOTSPOTS bên dưới.
 * Lúc này là 4 điểm đặt tạm, cách đều nhau.
 */
export type Hotspot = { x: number; y: number };

export const BAN_DO_HOTSPOTS: Record<VillageId, Hotspot> = {
  'lang-giay': { x: 25, y: 30 },
  'lang-det': { x: 75, y: 30 },
  'lang-khac-dau': { x: 25, y: 72 },
  'lang-bac': { x: 75, y: 72 },
};

const ORDER: VillageId[] = ['lang-giay', 'lang-det', 'lang-khac-dau', 'lang-bac'];

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Hàm thuần: đúng khối `export const BAN_DO_HOTSPOTS …` ứng với bộ tọa độ cho trước (nút "Chép" ở trang dev). */
export function formatHotspotsBlock(h: Record<VillageId, Hotspot>): string {
  const rows = ORDER.map((id) => `  '${id}': { x: ${round1(h[id].x)}, y: ${round1(h[id].y)} },`).join('\n');
  return `export const BAN_DO_HOTSPOTS: Record<VillageId, Hotspot> = {\n${rows}\n};`;
}
