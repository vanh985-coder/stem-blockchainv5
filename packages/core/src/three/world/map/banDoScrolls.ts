/**
 * Thẻ "Em có biết?" chưa nhặt trên vùng bản đồ làng của trang /ban-do (P2b). Hàm thuần.
 *
 * Bản đồ chung của /ban-do là tranh vẽ tay không theo tỉ lệ, nên chỉ dùng để CHỌN làng. Chọn làng xong, bảng làng hiện một vùng bản đồ phóng to của đúng làng đó,
 * vẽ từ ĐÚNG bố cục làng đã dựng cảnh 3D (`LOCAL_VILLAGES`, đổi sang tọa độ thế giới bằng `placeVillage` như `assembleWorld`) với cùng phép chiếu của bản đồ trong game (`project`,
 * bắc ở trên). Thẻ đặt đúng tọa độ thật, không dịch. Không dựng cảnh 3D, không chép tọa độ.
 */
import { VILLAGE_ORDER } from '../../../content/levels';
import type { VillageId } from '../../../village';
import { hasKnowCard } from '../../../progress/knowCards';
import { LOCAL_VILLAGES } from '../villages';
import { VILLAGE_RADIUS, frameOf, placeVillage } from '../worldFrames';
import { buildMapGeometry, type MapGeometry } from './mapGeometry';
import { project, type MapView } from './mapProjection';

/** Một thẻ rải trong làng, tọa độ thế giới, kèm tâm làng. */
export interface ScrollSpot {
  village: VillageId;
  index: number;
  zone: string;
  x: number;
  z: number;
  /** Tâm làng trong thế giới */
  cx: number;
  cz: number;
}

/** Các thẻ rải của một làng (4 thẻ) ở tọa độ thế giới, theo số thẻ. */
export function villageScrollSpots(id: VillageId): ScrollSpot[] {
  const placed = placeVillage(LOCAL_VILLAGES[id], frameOf(id));
  return (placed.scrolls ?? []).map((s) => ({ village: id, index: s.index, zone: s.zone, x: s.x, z: s.z, cx: placed.center.x, cz: placed.center.z }));
}

/** Mọi thẻ rải của cả 4 làng (16 thẻ), theo thứ tự làng rồi số thẻ. */
export function worldScrollSpots(): ScrollSpot[] {
  return VILLAGE_ORDER.flatMap(villageScrollSpots);
}

/** Cạnh khung vùng bản đồ làng (đơn vị của khung vẽ SVG; nở theo bề rộng khung chứa). */
export const VILLAGE_MAP_SIZE = 300;
/** Vùng thấy được: bán kính làng cộng một dải bờ. */
export const VILLAGE_MAP_RADIUS = VILLAGE_RADIUS + 8;

export interface VillageScrollPoint extends ScrollSpot {
  /** Vị trí trong khung vùng bản đồ (đơn vị khung vẽ), chiếu bằng `project` */
  px: number;
  py: number;
  /** Đã nhặt rồi */
  got: boolean;
}

export interface VillageMapData {
  id: VillageId;
  geo: MapGeometry;
  view: MapView;
  scrolls: VillageScrollPoint[];
}

/** Dữ liệu vùng bản đồ của một làng: hình học tĩnh, khung nhìn (bắc ở trên) và các thẻ đã chiếu; `mask` là mặt nạ thẻ đã nhặt (hiệu lực). */
export function villageMapData(id: VillageId, mask: number): VillageMapData {
  const placed = placeVillage(LOCAL_VILLAGES[id], frameOf(id));
  const geo = buildMapGeometry({ roads: [], villages: [{ id, frame: frameOf(id), center: placed.center, layout: placed }] });
  const view: MapView = { cx: placed.center.x, cz: placed.center.z, radius: VILLAGE_MAP_RADIUS, size: VILLAGE_MAP_SIZE, rotation: 0 };
  const scrolls = villageScrollSpots(id).map((s) => {
    const p = project(view, s.x, s.z, { x: 0, y: 0 });
    return { ...s, px: p.x, py: p.y, got: hasKnowCard(mask, s.index) };
  });
  return { id, geo, view, scrolls };
}

/** Số thẻ chưa nhặt trong mỗi làng. */
export function remainingByVillage(masks: Readonly<Partial<Record<VillageId, number>>>): Record<VillageId, number> {
  return Object.fromEntries(VILLAGE_ORDER.map((id) => [id, villageScrollSpots(id).filter((s) => !hasKnowCard(masks[id] ?? 0, s.index)).length])) as Record<VillageId, number>;
}
