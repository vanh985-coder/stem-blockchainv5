import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import { BufferAttribute, BufferGeometry, LineBasicMaterial, LineSegments } from 'three';
import type { CameraBlocker } from '../cameraCollision';
import type { CircleObstacle, Obstacle } from '../collision';
import { PLAYER_RADIUS } from '../collision';
import { usePlayerState } from '../WalkWorld';
import { DOCK_END_X, DOCK_HALF_WIDTH, RAMP_START_X, groundHeight } from './marketLayout';

/** Chiều cao vẽ của khung vật cản: phần chân tường dùng để dựng (0–1,5 đơn vị tính từ mặt đất), không vẽ hết chiều cao cây hay nhà. */
export const DEBUG_HEIGHT = 1.5;
const SEGMENTS = 28;
const LIFT = 0.05;

/**
 * Cộng các đoạn thẳng (cặp điểm) vẽ khung một vật cản: đáy ở y = LIFT, đỉnh ở y = min(h, DEBUG_HEIGHT), và các cạnh đứng. Hàm thuần: trả về
 * mảng số (x, y, z lần lượt) để dùng cho LineSegments.
 */
export function colliderLines(shape: Obstacle, height: number, out: number[] = []): number[] {
  const top = Math.max(LIFT + 0.05, Math.min(height, DEBUG_HEIGHT));
  const seg = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) => out.push(x0, y0, z0, x1, y1, z1);
  const ring = (pts: [number, number][], y: number) => {
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      seg(a[0], y, a[1], b[0], y, b[1]);
    }
  };
  let pts: [number, number][];
  let posts: [number, number][];
  if (shape.type === 'circle') {
    pts = Array.from({ length: SEGMENTS }, (_, i) => [shape.x + Math.cos((i / SEGMENTS) * Math.PI * 2) * shape.r, shape.z + Math.sin((i / SEGMENTS) * Math.PI * 2) * shape.r]);
    posts = [0, 1, 2, 3].map((k) => pts[(k * SEGMENTS) / 4]);
  } else if (shape.type === 'box') {
    pts = [
      [shape.minX, shape.minZ],
      [shape.maxX, shape.minZ],
      [shape.maxX, shape.maxZ],
      [shape.minX, shape.maxZ],
    ];
    posts = pts;
  } else {
    const c = Math.cos(shape.yaw);
    const s = Math.sin(shape.yaw);
    // góc (lx, lz) của hộp xoay → cảnh: x' = x + lx cos + lz sin, z' = z − lx sin + lz cos (như rotation.y của three)
    pts = ([[-1, -1], [1, -1], [1, 1], [-1, 1]] as const).map(([a, b]) => [shape.x + a * shape.hx * c + b * shape.hz * s, shape.z - a * shape.hx * s + b * shape.hz * c] as [number, number]);
    posts = pts;
  }
  ring(pts, LIFT);
  ring(pts, top);
  for (const [x, z] of posts) seg(x, LIFT, z, x, top, z);
  return out;
}

/** Lưới trên mặt cầu tàu theo đúng hàm `groundHeight` (dốc và sàn): cách 0,5, nhấc 0,04 để thấy rõ trên mặt ván. */
export function deckGridLines(out: number[] = []): number[] {
  const x0 = DOCK_END_X;
  const x1 = RAMP_START_X + 0.5;
  const lift = 0.04;
  for (let z = -DOCK_HALF_WIDTH; z <= DOCK_HALF_WIDTH + 1e-9; z += 0.5) {
    for (let x = x0; x < x1 - 1e-9; x += 0.25) {
      const xb = Math.min(x1, x + 0.25);
      out.push(x, groundHeight(x, Math.min(z, DOCK_HALF_WIDTH)) + lift, z, xb, groundHeight(xb, Math.min(z, DOCK_HALF_WIDTH)) + lift, z);
    }
  }
  for (let x = x0; x <= x1 + 1e-9; x += 0.5) {
    for (let z = -DOCK_HALF_WIDTH; z < DOCK_HALF_WIDTH - 1e-9; z += 0.5) {
      const h = groundHeight(x, 0) + lift;
      out.push(x, h, z, x, h, Math.min(DOCK_HALF_WIDTH, z + 0.5));
    }
  }
  return out;
}

function lineObject(positions: number[], color: string): { lines: LineSegments; geometry: BufferGeometry; material: LineBasicMaterial } {
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
  // vẽ đè lên mọi thứ để soi vật cản so với tường thật
  const material = new LineBasicMaterial({ color, depthTest: false, transparent: true, opacity: 0.95, toneMapped: false });
  const lines = new LineSegments(geometry, material);
  lines.renderOrder = 999;
  lines.frustumCulled = false;
  return { lines, geometry, material };
}

export interface ColliderDebugProps {
  /** Mọi vật cản tĩnh kèm chiều cao */
  colliders: readonly CameraBlocker[];
  /** Vật cản tròn đi động (dân làng): vẽ lại mỗi khung hình theo vị trí hiện tại */
  dynamic: readonly CircleObstacle[];
}

/**
 * Chế độ soi vùng va chạm (`?debug=colliders`): vẽ khung lưới đỏ cho mọi vật cản (đáy và cao tới 1,5), khung cam cho mặt cầu tàu (lưới theo
 * `groundHeight`), khung xanh cho vòng va chạm của người chơi. Một draw call mỗi nhóm; chỉ dùng để kiểm tra bằng mắt.
 */
export function ColliderDebug({ colliders, dynamic }: ColliderDebugProps) {
  const player = usePlayerState();
  const stat = useMemo(() => {
    const out: number[] = [];
    for (const c of colliders) colliderLines(c.shape, c.height, out);
    return lineObject(out, '#ff2a2a');
  }, [colliders]);
  const deck = useMemo(() => lineObject(deckGridLines(), '#ff8a00'), []);
  // dân làng: mỗi người một vòng nhỏ, dời theo vật cản tròn của họ mỗi khung hình
  const dyn = useMemo(() => dynamic.map((c) => lineObject(colliderLines({ type: 'circle', x: 0, z: 0, r: c.r }, 1.7), '#ff2a2a')), [dynamic]);
  const me = useMemo(() => lineObject(colliderLines({ type: 'circle', x: 0, z: 0, r: PLAYER_RADIUS }, 1.7), '#22d3ee'), []);
  useEffect(
    () => () => {
      for (const o of [stat, deck, me, ...dyn]) {
        o.geometry.dispose();
        o.material.dispose();
      }
    },
    [stat, deck, dyn, me],
  );

  useFrame(() => {
    for (let i = 0; i < dyn.length; i++) dyn[i].lines.position.set(dynamic[i].x, 0, dynamic[i].z);
    if (player) me.lines.position.set(player.x, player.y, player.z);
  });
  return (
    <group>
      <primitive object={stat.lines} />
      <primitive object={deck.lines} />
      {dyn.map((o, i) => (
        <primitive key={i} object={o.lines} />
      ))}
      <primitive object={me.lines} />
    </group>
  );
}
