import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { BoxGeometry, CylinderGeometry, MeshStandardMaterial, SphereGeometry, type Mesh } from 'three';
import { sound } from '../../audio/sound';
import { GATE_BAR_HEIGHTS, GATE_LINTELS, GATE_OPENING } from './footprints';
import type { GateDef, GateId } from './marketLayout';
import { barrierFall, FALL_DELAY, FALL_END } from './gateFall';

const BAR_LENGTH = GATE_OPENING + 0.5;
const WOOD = '#8A5A2B';
const ROPE = '#C2262E';

interface Resources {
  bar: BoxGeometry;
  rope: CylinderGeometry;
  tassel: SphereGeometry;
  tail: CylinderGeometry;
  ropeAngle: number;
  low: number;
  high: number;
  wood: MeshStandardMaterial;
  red: MeshStandardMaterial;
}

export interface GateBarriersProps {
  gates: readonly GateDef[];
  /** Cổng đang được mở (then gỗ và dây đỏ rơi xuống rồi gọi `onFallen`); phải nằm trong `gates` (cổng còn đóng). null thì không có */
  falling?: GateId | null;
  /** Gọi một lần khi then gỗ và dây đỏ đã rơi xong (hoặc ngay nếu `animate` là false) */
  onFallen?: () => void;
  /** false ("Giảm chuyển động"): không chơi hoạt cảnh rơi, mở ngay */
  animate?: boolean;
}

/**
 * Thanh then gỗ và dây đỏ chắn ngang lối đi của các cổng làng đang khóa (code tự dựng, spec 04 mục 3 "Cổng làng"): hai thanh gỗ ngang gác vào hai chân cổng, hai sợi dây
 * đỏ bắt chéo giữa hai thanh, và một chùm tua đỏ ở giữa. Dùng chung geometry và material cho mọi cổng; rời cảnh thì giải phóng. Đặt trong <Scene3D>.
 * Cổng `falling` chơi hoạt cảnh mở (spec 04 mục 5): thanh trên rơi xuống trước, thanh dưới, dây đỏ và chùm tua rơi theo, nằm xuống đất (`gateFall.ts`), kèm tiếng vút và tiếng đập.
 */
export function GateBarriers({ gates, falling = null, onFallen, animate = true }: GateBarriersProps) {
  const res = useMemo<Resources>(() => {
    const [low, high] = GATE_BAR_HEIGHTS;
    const rise = high - low;
    const ropeLength = Math.hypot(GATE_OPENING, rise);
    return {
      bar: new BoxGeometry(BAR_LENGTH, 0.16, 0.16),
      rope: new CylinderGeometry(0.035, 0.035, ropeLength, 6),
      tassel: new SphereGeometry(0.1, 10, 8),
      tail: new CylinderGeometry(0.03, 0.05, 0.28, 6),
      ropeAngle: Math.atan2(rise, GATE_OPENING),
      low,
      high,
      wood: new MeshStandardMaterial({ color: WOOD, roughness: 0.9 }),
      red: new MeshStandardMaterial({ color: ROPE, roughness: 0.7 }),
    };
  }, []);
  useEffect(
    () => () => {
      for (const o of [res.bar, res.rope, res.tassel, res.tail, res.wood, res.red]) o.dispose();
    },
    [res],
  );
  return (
    <>
      {gates.map((g) => {
        const lintel = GATE_LINTELS[g.model];
        return (
          <group key={g.id} position={[g.x, 0, g.z]} rotation={[0, g.yaw, 0]}>
            <group position={[0, 0, lintel?.cz ?? 0]}>
              {falling === g.id ? <FallingBarrier res={res} onFallen={onFallen} animate={animate} /> : <StaticBarrier res={res} />}
            </group>
          </group>
        );
      })}
    </>
  );
}

function StaticBarrier({ res }: { res: Resources }) {
  const mid = (res.low + res.high) / 2;
  return (
    <>
      <mesh geometry={res.bar} material={res.wood} position={[0, res.low, 0]} castShadow />
      <mesh geometry={res.bar} material={res.wood} position={[0, res.high, 0]} castShadow />
      <mesh geometry={res.rope} material={res.red} position={[0, mid, 0.02]} rotation={[0, 0, res.ropeAngle]} />
      <mesh geometry={res.rope} material={res.red} position={[0, mid, -0.02]} rotation={[0, 0, -res.ropeAngle]} />
      <mesh geometry={res.tassel} material={res.red} position={[0, mid, 0.1]} />
      <mesh geometry={res.tail} material={res.red} position={[0, mid - 0.2, 0.1]} />
    </>
  );
}

/** Then gỗ và dây đỏ đang rơi: mỗi khung hình ghi vị trí và góc từ `barrierFall` (hàm thuần), không cấp phát. */
function FallingBarrier({ res, onFallen, animate }: { res: Resources; onFallen?: () => void; animate: boolean }) {
  const high = useRef<Mesh>(null);
  const low = useRef<Mesh>(null);
  const ropeA = useRef<Mesh>(null);
  const ropeB = useRef<Mesh>(null);
  const tassel = useRef<Mesh>(null);
  const tail = useRef<Mesh>(null);
  const t0 = useRef<number | null>(null);
  const fired = useRef({ whoosh: false, hit: false, done: false });
  const mid = (res.low + res.high) / 2;

  // Giảm chuyển động: không có hoạt cảnh, báo xong ngay
  useEffect(() => {
    if (animate) return;
    fired.current.done = true;
    onFallen?.();
  }, [animate, onFallen]);

  useFrame((state) => {
    if (!animate) return;
    if (t0.current === null) t0.current = state.clock.elapsedTime;
    const t = state.clock.elapsedTime - t0.current;
    const f = fired.current;
    if (t >= FALL_DELAY && !f.whoosh) {
      f.whoosh = true;
      sound.playWhoosh();
    }
    const s = barrierFall(t, res.low, res.high, res.ropeAngle);
    if (high.current) {
      high.current.position.y = s.high.y;
      high.current.rotation.z = s.high.rz;
    }
    if (low.current) {
      low.current.position.y = s.low.y;
      low.current.rotation.z = s.low.rz;
    }
    if (ropeA.current) {
      ropeA.current.position.y = s.ropeA.y;
      ropeA.current.rotation.z = s.ropeA.rz;
    }
    if (ropeB.current) {
      ropeB.current.position.y = s.ropeB.y;
      ropeB.current.rotation.z = s.ropeB.rz;
    }
    if (tassel.current) tassel.current.position.y = s.tassel.y;
    if (tail.current) tail.current.position.y = s.tassel.y - 0.2;
    if (s.landed && !f.hit) {
      f.hit = true;
      sound.playHit(false);
    }
    if (t >= FALL_END && !f.done) {
      f.done = true;
      onFallen?.();
    }
  });

  return (
    <>
      <mesh ref={low} geometry={res.bar} material={res.wood} position={[0, res.low, 0]} castShadow />
      <mesh ref={high} geometry={res.bar} material={res.wood} position={[0, res.high, 0]} castShadow />
      <mesh ref={ropeA} geometry={res.rope} material={res.red} position={[0, mid, 0.02]} rotation={[0, 0, res.ropeAngle]} />
      <mesh ref={ropeB} geometry={res.rope} material={res.red} position={[0, mid, -0.02]} rotation={[0, 0, -res.ropeAngle]} />
      <mesh ref={tassel} geometry={res.tassel} material={res.red} position={[0, mid, 0.1]} />
      <mesh ref={tail} geometry={res.tail} material={res.red} position={[0, mid - 0.2, 0.1]} />
    </>
  );
}
