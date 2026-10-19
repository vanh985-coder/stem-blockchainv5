/**
 * Đồ thị đường của thế giới mở (mốc 2, bước W1) và chọn điểm tiếp theo cho mũi tên dưới chân người chơi. Hàm thuần, không import three, không cấp phát khi tính điểm tiếp theo (`next`).
 *
 * Đồ thị gồm các nút (vòng đường quanh cây đa, lối ra chợ, đầu cầu, cổng làng, ngã trong làng, chỗ đứng trước biển gỗ) nối bằng các đoạn thẳng đi được (có test: không đoạn nào xuyên vật cản).
 * Mũi tên chỉ theo đường tới nút đích chứ không chỉ thẳng xuyên nhà: từ vị trí người chơi, chiếu lên đoạn gần nhất, đi về đầu đoạn rẻ hơn (độ dài tới đích theo đồ thị), tới sát nút thì chuyển sang nút kế tiếp.
 */

export interface GraphNode {
  id: string;
  x: number;
  z: number;
}

export interface RoadGraph {
  nodes: readonly GraphNode[];
  /** Cặp chỉ số nút (hai chiều) */
  edges: readonly (readonly [number, number])[];
}

/** Dựng đồ thị từ danh sách nút và cặp id nối nhau (id lạ thì báo lỗi). */
export function buildGraph(nodes: readonly GraphNode[], links: readonly (readonly [string, string])[]): RoadGraph {
  const index = new Map<string, number>();
  nodes.forEach((n, i) => {
    if (index.has(n.id)) throw new Error(`duplicate node: ${n.id}`);
    index.set(n.id, i);
  });
  const edges = links.map(([a, b]) => {
    const i = index.get(a);
    const j = index.get(b);
    if (i === undefined || j === undefined) throw new Error(`link to unknown node: ${a} - ${b}`);
    return [i, j] as const;
  });
  return { nodes, edges };
}

/** Khi tới gần nút trong khoảng này thì mũi tên chuyển sang nút kế tiếp. */
export const ADVANCE_DISTANCE = 2.5;
/** Cách đường xa hơn khoảng này (đứng giữa ruộng, giữa sân chợ) thì mũi tên chỉ về điểm gần nhất trên đường. */
export const OFF_ROAD_DISTANCE = 4;

export interface RouteStep {
  /** Điểm cần hướng tới (nút kế tiếp, hoặc điểm gần nhất trên đường khi đứng ngoài đường) */
  x: number;
  z: number;
  /** Độ dài còn lại tới đích theo đường (xấp xỉ), 0 khi chưa có đích hoặc nút đích lạ */
  remaining: number;
  /** Có đường tới đích không (false: chưa đặt đích hoặc đồ thị không nối tới) */
  found: boolean;
}

export interface Router {
  /** Đặt nút đích theo id; id lạ thì bỏ đích. Chạy Dijkstra một lần. */
  setTarget(id: string | null): void;
  /** Điểm tiếp theo cho người chơi đứng ở (px, pz); ghi vào `out` và trả về nó. */
  next(px: number, pz: number, out: RouteStep): RouteStep;
  /** Độ dài đường ngắn nhất từ nút `id` tới đích hiện tại (Infinity nếu không có) */
  distanceFrom(id: string): number;
}

export function createRouter(graph: RoadGraph): Router {
  const n = graph.nodes.length;
  const adj: number[][] = Array.from({ length: n }, () => []);
  for (const [a, b] of graph.edges) {
    adj[a].push(b);
    adj[b].push(a);
  }
  const index = new Map<string, number>();
  graph.nodes.forEach((nd, i) => index.set(nd.id, i));
  const dist = new Float64Array(n).fill(Infinity);
  const hop = new Int32Array(n).fill(-1);
  let target = -1;

  const len = (a: number, b: number) => Math.hypot(graph.nodes[a].x - graph.nodes[b].x, graph.nodes[a].z - graph.nodes[b].z);

  function setTarget(id: string | null): void {
    dist.fill(Infinity);
    hop.fill(-1);
    target = id === null ? -1 : (index.get(id) ?? -1);
    if (target < 0) return;
    dist[target] = 0;
    const done = new Uint8Array(n);
    for (let step = 0; step < n; step++) {
      let u = -1;
      for (let i = 0; i < n; i++) if (!done[i] && dist[i] < Infinity && (u < 0 || dist[i] < dist[u])) u = i;
      if (u < 0) break;
      done[u] = 1;
      for (const v of adj[u]) {
        const d = dist[u] + len(u, v);
        if (d < dist[v]) {
          dist[v] = d;
          hop[v] = u; // từ v đi về đích thì bước kế là u
        }
      }
    }
  }

  function next(px: number, pz: number, out: RouteStep): RouteStep {
    out.found = false;
    out.remaining = 0;
    out.x = px;
    out.z = pz;
    if (target < 0) return out;
    // đoạn gần nhất
    let bestD = Infinity;
    let bestA = -1;
    let bestB = -1;
    let bestQx = 0;
    let bestQz = 0;
    for (let e = 0; e < graph.edges.length; e++) {
      const a = graph.edges[e][0];
      const b = graph.edges[e][1];
      const ax = graph.nodes[a].x;
      const az = graph.nodes[a].z;
      const dx = graph.nodes[b].x - ax;
      const dz = graph.nodes[b].z - az;
      const l2 = dx * dx + dz * dz;
      const t = l2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / l2));
      const qx = ax + dx * t;
      const qz = az + dz * t;
      const d = Math.hypot(px - qx, pz - qz);
      if (d < bestD) {
        bestD = d;
        bestA = a;
        bestB = b;
        bestQx = qx;
        bestQz = qz;
      }
    }
    if (bestA < 0) return out;
    const costA = Math.hypot(bestQx - graph.nodes[bestA].x, bestQz - graph.nodes[bestA].z) + dist[bestA];
    const costB = Math.hypot(bestQx - graph.nodes[bestB].x, bestQz - graph.nodes[bestB].z) + dist[bestB];
    if (costA === Infinity && costB === Infinity) return out;
    let end = costA <= costB ? bestA : bestB;
    const viaCost = Math.min(costA, costB);
    out.found = true;
    out.remaining = bestD + viaCost;
    if (bestD > OFF_ROAD_DISTANCE) {
      // đứng ngoài đường: về điểm gần nhất trên đường trước
      out.x = bestQx;
      out.z = bestQz;
      return out;
    }
    let guard = 0;
    while (end !== target && hop[end] >= 0 && Math.hypot(px - graph.nodes[end].x, pz - graph.nodes[end].z) < ADVANCE_DISTANCE && guard++ < n) end = hop[end];
    out.x = graph.nodes[end].x;
    out.z = graph.nodes[end].z;
    return out;
  }

  return {
    setTarget,
    next,
    distanceFrom(id: string) {
      const i = index.get(id);
      return i === undefined ? Infinity : dist[i];
    },
  };
}

/** Mọi điểm cách đều `step` dọc các đoạn của đồ thị (để kiểm tra đoạn có đi được không). */
export function sampleEdges(graph: RoadGraph, step: number): { x: number; z: number; edge: number }[] {
  const out: { x: number; z: number; edge: number }[] = [];
  graph.edges.forEach(([a, b], e) => {
    const A = graph.nodes[a];
    const B = graph.nodes[b];
    const l = Math.hypot(B.x - A.x, B.z - A.z);
    const k = Math.max(1, Math.ceil(l / step));
    for (let i = 0; i <= k; i++) out.push({ x: A.x + ((B.x - A.x) * i) / k, z: A.z + ((B.z - A.z) * i) / k, edge: e });
  });
  return out;
}
