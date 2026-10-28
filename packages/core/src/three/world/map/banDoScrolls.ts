/**
 * Thẻ "Em có biết?" chưa nhặt trên trang /ban-do (P2b). Hàm thuần.
 *
 * Vị trí lấy từ ĐÚNG dữ liệu bố cục làng đã dùng để dựng cảnh 3D (`LOCAL_VILLAGES[...].scrolls`), đổi sang tọa độ thế giới bằng
 * `placeVillage` (cùng phép với `assembleWorld`), nên không chép tọa độ ở đâu cả. /ban-do là bản đồ vẽ tay (không theo tỉ lệ thật): mỗi làng
 * chỉ có một điểm (`BAN_DO_HOTSPOTS`), nên các thẻ của làng được đặt quanh điểm đó theo vị trí thật của chúng trong làng, thu nhỏ đều:
 * bán kính làng (`VILLAGE_RADIUS` = 125) ứng với `BAN_DO_RADIUS_PCT` % bề ngang ảnh, hướng giữ như bản đồ trong game (bắc ở trên, đông bên phải = −X).
 */
import { BAN_DO_HOTSPOTS, type Hotspot } from '../../../content/banDoHotspots';
import { VILLAGE_ORDER } from '../../../content/levels';
import type { VillageId } from '../../../village';
import { hasKnowCard } from '../../../progress/knowCards';
import { LOCAL_VILLAGES } from '../villages';
import { VILLAGE_RADIUS, frameOf, placeVillage } from '../worldFrames';

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

/** Mọi thẻ rải của cả 4 làng (16 thẻ), theo thứ tự làng rồi số thẻ. */
export function worldScrollSpots(): ScrollSpot[] {
  const out: ScrollSpot[] = [];
  for (const id of VILLAGE_ORDER) {
    const placed = placeVillage(LOCAL_VILLAGES[id], frameOf(id));
    for (const s of placed.scrolls ?? []) out.push({ village: id, index: s.index, zone: s.zone, x: s.x, z: s.z, cx: placed.center.x, cz: placed.center.z });
  }
  return out;
}

/** Bán kính làng (125 đơn vị) ứng với bấy nhiêu % bề ngang ảnh /ban-do. */
export const BAN_DO_RADIUS_PCT = 11;
/** Giữ điểm cách mép ảnh ít nhất bấy nhiêu %. */
export const BAN_DO_EDGE_PCT = 2;

export interface BanDoScrollPoint {
  id: string;
  village: VillageId;
  index: number;
  /** Vị trí trên ảnh, % bề ngang (từ trái) và % bề cao (từ trên) */
  x: number;
  y: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Đổi một thẻ sang vị trí trên ảnh quanh điểm làng. `ratio` = rộng / cao của ảnh (để cùng độ dài theo hai trục). */
export function banDoPoint(spot: ScrollSpot, hotspot: Hotspot, ratio: number, radiusPct: number = BAN_DO_RADIUS_PCT): { x: number; y: number } {
  const k = radiusPct / VILLAGE_RADIUS;
  return {
    x: clamp(hotspot.x - (spot.x - spot.cx) * k, BAN_DO_EDGE_PCT, 100 - BAN_DO_EDGE_PCT),
    y: clamp(hotspot.y - (spot.z - spot.cz) * k * ratio, BAN_DO_EDGE_PCT, 100 - BAN_DO_EDGE_PCT),
  };
}

export interface BanDoScrollInput {
  spots: readonly ScrollSpot[];
  /** Mặt nạ thẻ đã nhặt (hiệu lực) theo làng */
  masks: Readonly<Partial<Record<VillageId, number>>>;
  ratio: number;
  hotspots?: Readonly<Record<VillageId, Hotspot>>;
  radiusPct?: number;
}

/** Thẻ chưa nhặt của cả 4 làng trên /ban-do (thẻ đã nhặt không có trong kết quả). */
export function banDoScrollPoints({ spots, masks, ratio, hotspots = BAN_DO_HOTSPOTS, radiusPct = BAN_DO_RADIUS_PCT }: BanDoScrollInput): BanDoScrollPoint[] {
  const out: BanDoScrollPoint[] = [];
  for (const s of spots) {
    if (hasKnowCard(masks[s.village] ?? 0, s.index)) continue;
    const p = banDoPoint(s, hotspots[s.village], ratio, radiusPct);
    out.push({ id: `scroll:${s.village}:${s.index}`, village: s.village, index: s.index, x: p.x, y: p.y });
  }
  return out;
}

/** Số thẻ chưa nhặt theo làng. */
export function remainingByVillage(points: readonly BanDoScrollPoint[]): Record<VillageId, number> {
  const r = Object.fromEntries(VILLAGE_ORDER.map((id) => [id, 0])) as Record<VillageId, number>;
  for (const p of points) r[p.village] += 1;
  return r;
}

export interface LabelBox {
  /** Tâm và nửa kích thước khung chữ tên làng (pixel, trong khung bản đồ) */
  cx: number;
  cy: number;
  hw: number;
  hh: number;
}

export interface IconIn {
  id: string;
  village: VillageId;
  /** Vị trí theo công thức (pixel trong khung bản đồ) */
  x: number;
  y: number;
}

export interface IconLayoutInput {
  icons: readonly IconIn[];
  labels: Readonly<Partial<Record<VillageId, LabelBox>>>;
  /** Rộng, cao khung bản đồ (pixel) */
  w: number;
  h: number;
  /** Cạnh hình thẻ (pixel) */
  glyph: number;
  /** Khoảng hở giữa hình và khung chữ, và giữa hình với mép bản đồ (pixel) */
  pad?: number;
}

const STEP_DEG = 10;

/**
 * Xếp hình thẻ quanh khung chữ tên làng sao cho: nằm trong bản đồ, không đè lên chữ tên làng nào (kể cả làng khác), không đè lên nhau.
 * Thẻ nào ở chỗ trống sẵn thì giữ NGUYÊN vị trí theo công thức; thẻ rơi vào chỗ vướng thì dời lên mép khung chữ của làng mình, ở hướng la bàn gần hướng thật nhất còn trống
 * (thử lần lượt mỗi 10 độ, rồi thêm khoảng cách ra ngoài). Hàm thuần, kết quả tất định theo thứ tự `icons`.
 */
export function layoutScrollIcons({ icons, labels, w, h, glyph, pad = 4 }: IconLayoutInput): { id: string; x: number; y: number }[] {
  const half = glyph / 2;
  const boxes = Object.values(labels).filter((b): b is LabelBox => b !== undefined);
  const placed: { id: string; x: number; y: number }[] = [];
  const free = (x: number, y: number): boolean => {
    if (x < half + pad || x > w - half - pad || y < half + pad || y > h - half - pad) return false;
    for (const b of boxes) if (Math.abs(x - b.cx) < b.hw + half + pad && Math.abs(y - b.cy) < b.hh + half + pad) return false;
    for (const q of placed) if (Math.hypot(x - q.x, y - q.y) < glyph * 0.95) return false;
    return true;
  };
  const out: { id: string; x: number; y: number }[] = [];
  for (const ic of icons) {
    const lab = labels[ic.village];
    let pos = { x: ic.x, y: ic.y };
    if (!free(pos.x, pos.y)) {
      const clamped = { x: Math.min(w - half - pad, Math.max(half + pad, ic.x)), y: Math.min(h - half - pad, Math.max(half + pad, ic.y)) };
      pos = clamped;
    }
    if (lab && !free(pos.x, pos.y)) {
      const theta = Math.atan2(ic.y - lab.cy, ic.x - lab.cx) || -Math.PI / 2;
      const bw = lab.hw + half + pad;
      const bh = lab.hh + half + pad;
      let best: { x: number; y: number } | null = null;
      for (const extra of [0, glyph * 0.6, glyph * 1.2, glyph * 1.8]) {
        for (let k = 0; k <= 180 / STEP_DEG && !best; k++) {
          for (const sign of k === 0 ? [1] : [1, -1]) {
            const a = theta + (sign * k * STEP_DEG * Math.PI) / 180;
            const c = Math.cos(a);
            const s = Math.sin(a);
            const t = Math.min(c === 0 ? Infinity : bw / Math.abs(c), s === 0 ? Infinity : bh / Math.abs(s));
            const cand = { x: lab.cx + c * (t + extra), y: lab.cy + s * (t + extra) };
            if (free(cand.x, cand.y)) {
              best = cand;
              break;
            }
          }
        }
        if (best) break;
      }
      if (best) pos = best;
    }
    placed.push({ id: ic.id, ...pos });
    out.push({ id: ic.id, ...pos });
  }
  return out;
}
