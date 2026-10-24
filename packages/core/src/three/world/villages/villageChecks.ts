/**
 * Phép kiểm dùng chung cho test bố cục làng lớn (`giay.test.ts`, `det.test.ts`...): băm bố cục để biết có đổi không, vòng tròn bao chân mọi món, lưới ô đi được từ chỗ xuất hiện (bước 1, người chơi bán kính 0,4), đi thử
 * một đoạn thẳng xem có xuyên vật cản không. Chỉ dùng trong test (không nằm trong bản chạy của game).
 */
import { PLAYER_RADIUS, resolveCollisions, type Point2 } from '../../collision';
import { footprintRadiusOf } from '../../cho/footprints';
import { PROP_SIZES } from '../../cho/marketLayout';
import { scatterRadius } from '../../village/scatter';
import { assembleVillage, type VillageLayoutInput } from '../../village/villageLayout';

/** Băm FNV-1a 32 bit của chuỗi (để so bố cục trước và sau khi tái cấu trúc). */
export function fnv1a(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16);
}

export interface SpotInfo {
  name: string;
  x: number;
  z: number;
  r: number;
}

/** Vòng tròn bao chân của mọi món có chỗ chiếm (giữ khoảng cách khi xếp). Món không vật cản (hoa, mặt nước, cuốn sổ, cầu ao, đồ rải `collide: false`) bỏ qua; người dẫn và người đứng cạnh thêm vào qua `people`. */
export function layoutSpots(L: VillageLayoutInput, people: readonly { name: string; x: number; z: number; r: number }[] = [], skipProps: readonly string[] = ['chan', 'nuoc', 'so-chung', 'hoa']): SpotInfo[] {
  const out: SpotInfo[] = [];
  for (const p of L.placements) out.push({ name: p.model, x: p.x, z: p.z, r: footprintRadiusOf(p.model) * p.scale });
  for (const p of L.props) {
    if (skipProps.includes(p.kind)) continue;
    out.push({ name: p.kind, x: p.x, z: p.z, r: PROP_SIZES[p.kind].r * p.scale });
  }
  for (const p of L.scatter ?? []) if (p.collide !== false && p.kind !== 'cau-ao') out.push({ name: p.kind, x: p.x, z: p.z, r: p.kind === 'tre' ? scatterRadius(p) * 0.5 : scatterRadius(p) });
  for (const b of L.boards) out.push({ name: `bien ${b.level}`, x: b.x, z: b.z, r: 1 });
  for (const p of people) out.push(p);
  return out;
}

export interface VillageProbe {
  layout: ReturnType<typeof assembleVillage>;
  /** Có bị chặn không (không giới hạn biên: biên của cả thế giới là việc của WalkWorld). */
  blocked(x: number, z: number, r?: number): boolean;
  /** Đi thử đoạn thẳng a→b (bước 0,5); trả điểm đầu tiên bị chặn hoặc null. */
  firstBlocked(ax: number, az: number, bx: number, bz: number, r: number): { x: number; z: number } | null;
}

export function probeOf(L: VillageLayoutInput): VillageProbe {
  const layout = assembleVillage(L);
  const blocked = (x: number, z: number, r = PLAYER_RADIUS): boolean => resolveCollisions({ x, z } as Point2, r, layout.obstacles);
  return {
    layout,
    blocked,
    firstBlocked(ax, az, bx, bz, r) {
      const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / 0.5));
      for (let i = 0; i <= n; i++) {
        const x = ax + ((bx - ax) * i) / n;
        const z = az + ((bz - az) * i) / n;
        if (blocked(x, z, r)) return { x, z };
      }
      return null;
    },
  };
}

export interface ReachGrid {
  seen: Set<number>;
  size: number;
  reachedInside: number;
  /** Có ô đi được nào cách (x, z) không quá `radius` */
  near(x: number, z: number, radius?: number): boolean;
}

/**
 * Lưới ô 1,0 đi được từ chỗ xuất hiện (bước 4 hướng, người chơi bán kính 0,4). `plugGate`: bịt vùng quanh cổng (bán kính 14) như không có lối ra. `inside` đếm ô trong lũy tre (bán kính `wallRadius − 2`).
 */
export function reachGrid(L: VillageLayoutInput, blocked: VillageProbe['blocked'], wallRadius: number, gateZ: number, plugGate = false): ReachGrid {
  const step = 1;
  const R = 135;
  const key = (i: number, j: number) => (j + R) * (2 * R + 1) + (i + R);
  const free = (i: number, j: number) => Math.hypot(i * step, j * step) <= R - 1 && !(plugGate && Math.hypot(i * step, j * step - gateZ) < 14) && !blocked(i * step, j * step);
  const seen = new Set<number>();
  const q: [number, number][] = [[Math.round(L.start.x / step), Math.round(L.start.z / step)]];
  seen.add(key(q[0][0], q[0][1]));
  for (let h = 0; h < q.length; h++) {
    const [i, j] = q[h];
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const a = i + di;
      const b = j + dj;
      if (seen.has(key(a, b)) || !free(a, b)) continue;
      seen.add(key(a, b));
      q.push([a, b]);
    }
  }
  const near = (x: number, z: number, radius = 2) => {
    const n = Math.ceil(radius / step);
    for (let a = -n; a <= n; a++)
      for (let b = -n; b <= n; b++) {
        const i = Math.round(x / step) + a;
        const j = Math.round(z / step) + b;
        if (Math.hypot(i * step - x, j * step - z) <= radius && seen.has(key(i, j))) return true;
      }
    return false;
  };
  let reachedInside = 0;
  for (const k of seen) {
    const i = (k % (2 * R + 1)) - R;
    const j = Math.floor(k / (2 * R + 1)) - R;
    if (Math.hypot(i * step, j * step) < wallRadius - 2) reachedInside++;
  }
  return { seen, size: seen.size, reachedInside, near };
}

/**
 * Độ dài đường đi ngắn nhất (trên đồ thị `nodes`/`links` của làng, cộng đoạn thẳng cuối tới điểm đứng) từ nút `from` tới (x, z) qua nút `join`. Dùng đo "thẻ xa nhất cách cổng bao nhiêu đơn vị đường đi".
 */
export function pathLength(paths: { nodes: { id: string; x: number; z: number }[]; links: [string, string][] }, from: string, to: string): number {
  const byId = new Map(paths.nodes.map((n) => [n.id, n]));
  const adj = new Map<string, { id: string; w: number }[]>();
  for (const [a, b] of paths.links) {
    const na = byId.get(a)!;
    const nb = byId.get(b)!;
    const w = Math.hypot(na.x - nb.x, na.z - nb.z);
    (adj.get(a) ?? adj.set(a, []).get(a)!).push({ id: b, w });
    (adj.get(b) ?? adj.set(b, []).get(b)!).push({ id: a, w });
  }
  const dist = new Map<string, number>([[from, 0]]);
  const todo = new Set<string>([from]);
  while (todo.size > 0) {
    let cur = '';
    let best = Infinity;
    for (const id of todo) if ((dist.get(id) ?? Infinity) < best) ((best = dist.get(id)!), (cur = id));
    todo.delete(cur);
    for (const e of adj.get(cur) ?? []) {
      const d = best + e.w;
      if (d < (dist.get(e.id) ?? Infinity)) (dist.set(e.id, d), todo.add(e.id));
    }
  }
  return dist.get(to) ?? Infinity;
}
