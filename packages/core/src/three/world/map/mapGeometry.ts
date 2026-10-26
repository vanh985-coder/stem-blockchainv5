/**
 * Hình học phần tĩnh của bản đồ (mốc 2, bước X4), dựng một lần từ bố cục thế giới có sẵn: chợ, đường đi (gộp theo bề rộng thành ít đường vẽ), sông và cầu, ao, nhà và viền các làng.
 * Toàn bộ ở tọa độ thế giới (x, z); lớp vẽ đổi sang màn hình bằng `staticTransform`. Hàm thuần, không import three hay React.
 */
import { PLAZA_RADIUS, WORLD_RADIUS } from '../../cho/marketLayout';
import type { VillageId } from '../../../village';
import { RIVER_CENTER_X, RIVER_TRUNK_HALF, RIVER_TRUNK_WIDTH, riverBranch, smoothPath, type RiverPoint } from '../river';
import { BRIDGE_HALF_WIDTH } from '../worldLayout';
import type { WorldLayout } from '../worldLayout';
import { reservedCenter } from '../worldLayout';
import { VILLAGE_RADIUS } from '../worldFrames';

export interface RoadStroke {
  /** Đường vẽ: các đoạn thẳng "M x z L x z" cùng bề rộng và loại */
  d: string;
  width: number;
  /** 'gach' là đường lát gạch trong làng, 'dat' là đường đất */
  kind: 'dat' | 'gach';
}

export interface VillageOutline {
  village: VillageId;
  cx: number;
  cz: number;
  r: number;
  /** Làng đã dựng (có lũy tre): vẽ nét liền; chưa dựng: nét đứt */
  built: boolean;
}

export interface MapGeometry {
  market: { r: number; plaza: number };
  roads: RoadStroke[];
  /** Mỗi vùng nước một đường vẽ đóng kín (đoạn thân và hai nhánh của sông, rồi nhánh sông nhỏ trong làng nếu có) */
  river: string[];
  /** Cầu gỗ qua sông: hình chữ nhật (x từ-đến, z từ-đến) */
  bridge: { x0: number; x1: number; z0: number; z1: number };
  /** Ao làng: các vũng tròn */
  ponds: { x: number; z: number; r: number }[];
  /** Nhà (ô vuông nhỏ), gộp thành một đường vẽ */
  houses: string;
  outlines: VillageOutline[];
}

const n1 = (v: number): string => String(Math.round(v * 10) / 10);

/** Cạnh ô vuông nhà vẽ trên bản đồ (đơn vị thế giới). */
export const HOUSE_MARK_SIZE = 5;

/** Đường viền một dải nước đã làm mượt thành đa giác đóng kín. */
export function ribbonPolygon(points: readonly RiverPoint[]): string {
  const left: string[] = [];
  const right: string[] = [];
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    const a = points[Math.max(0, i - 1)];
    const b = points[Math.min(points.length - 1, i + 1)];
    const tx = b.x - a.x;
    const tz = b.z - a.z;
    const len = Math.hypot(tx, tz) || 1;
    const nx = -tz / len;
    const nz = tx / len;
    const hw = p.w / 2;
    left.push(`${n1(p.x + nx * hw)} ${n1(p.z + nz * hw)}`);
    right.push(`${n1(p.x - nx * hw)} ${n1(p.z - nz * hw)}`);
  }
  return `M${left.join(' L')} L${right.reverse().join(' L')} Z`;
}

export function buildMapGeometry(world: Pick<WorldLayout, 'roads' | 'villages'>): MapGeometry {
  const groups = new Map<string, { width: number; kind: 'dat' | 'gach'; segs: string[] }>();
  const addRoad = (x0: number, z0: number, x1: number, z1: number, width: number, kind: 'dat' | 'gach') => {
    const key = `${width}|${kind}`;
    let g = groups.get(key);
    if (!g) {
      g = { width, kind, segs: [] };
      groups.set(key, g);
    }
    g.segs.push(`M${n1(x0)} ${n1(z0)} L${n1(x1)} ${n1(z1)}`);
  };
  for (const r of world.roads) addRoad(r.x0, r.z0, r.x1, r.z1, r.width, 'dat');
  for (const v of world.villages) for (const r of v.layout.roads ?? []) addRoad(r.x0, r.z0, r.x1, r.z1, r.width, r.kind ?? 'dat');
  const roads: RoadStroke[] = [...groups.values()].map((g) => ({ d: g.segs.join(' '), width: g.width, kind: g.kind }));

  const trunk = `M${n1(RIVER_CENTER_X - RIVER_TRUNK_WIDTH / 2)} ${-RIVER_TRUNK_HALF} L${n1(RIVER_CENTER_X + RIVER_TRUNK_WIDTH / 2)} ${-RIVER_TRUNK_HALF} L${n1(RIVER_CENTER_X + RIVER_TRUNK_WIDTH / 2)} ${RIVER_TRUNK_HALF} L${n1(RIVER_CENTER_X - RIVER_TRUNK_WIDTH / 2)} ${RIVER_TRUNK_HALF} Z`;
  const river = [trunk, ribbonPolygon(riverBranch('ne')), ribbonPolygon(riverBranch('se'))];
  // nhánh sông nhỏ trong làng (Làng Bạc, bước L5)
  for (const v of world.villages) for (const s of v.layout.streams ?? []) river.push(ribbonPolygon(smoothPath(s.points)));

  const bridge = { x0: RIVER_CENTER_X - RIVER_TRUNK_WIDTH / 2 - 2, x1: RIVER_CENTER_X + RIVER_TRUNK_WIDTH / 2 + 2, z0: -BRIDGE_HALF_WIDTH, z1: BRIDGE_HALF_WIDTH };

  const ponds: MapGeometry['ponds'] = [];
  const houseSegs: string[] = [];
  const h = HOUSE_MARK_SIZE / 2;
  for (const v of world.villages) {
    for (const p of v.layout.ponds ?? []) ponds.push({ x: p.x, z: p.z, r: p.r });
    for (const pl of v.layout.placements) {
      if (pl.model.startsWith('env/nha-mai')) houseSegs.push(`M${n1(pl.x - h)} ${n1(pl.z - h)} h${HOUSE_MARK_SIZE} v${HOUSE_MARK_SIZE} h${-HOUSE_MARK_SIZE} Z`);
    }
  }

  const outlines: VillageOutline[] = world.villages.map((v) => {
    const w = v.layout.wall;
    if (w) return { village: v.id, cx: (w.center ?? v.center).x, cz: (w.center ?? v.center).z, r: w.radius, built: true };
    const c = reservedCenter(v.frame);
    return { village: v.id, cx: c.x, cz: c.z, r: VILLAGE_RADIUS, built: false };
  });

  return { market: { r: WORLD_RADIUS, plaza: PLAZA_RADIUS }, roads, river, bridge, ponds, houses: houseSegs.join(' '), outlines };
}
