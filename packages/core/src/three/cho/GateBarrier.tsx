import { useEffect, useMemo } from 'react';
import { BoxGeometry, CylinderGeometry, MeshStandardMaterial, SphereGeometry } from 'three';
import { GATE_BAR_HEIGHTS, GATE_LINTELS, GATE_OPENING } from './footprints';
import type { GateDef } from './marketLayout';

const BAR_LENGTH = GATE_OPENING + 0.5;
const WOOD = '#8A5A2B';
const ROPE = '#C2262E';

/**
 * Thanh then gỗ và dây đỏ chắn ngang lối đi của các cổng làng đang khóa (code tự dựng, spec 04 mục 3 "Cổng làng"): hai thanh gỗ ngang gác vào hai chân cổng, hai sợi dây
 * đỏ bắt chéo giữa hai thanh, và một chùm tua đỏ ở giữa. Dùng chung geometry và material cho mọi cổng; rời cảnh thì giải phóng. Đặt trong <Scene3D>.
 */
export function GateBarriers({ gates }: { gates: readonly GateDef[] }) {
  const res = useMemo(() => {
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
              <mesh geometry={res.bar} material={res.wood} position={[0, res.low, 0]} castShadow />
              <mesh geometry={res.bar} material={res.wood} position={[0, res.high, 0]} castShadow />
              <mesh geometry={res.rope} material={res.red} position={[0, (res.low + res.high) / 2, 0.02]} rotation={[0, 0, res.ropeAngle]} />
              <mesh geometry={res.rope} material={res.red} position={[0, (res.low + res.high) / 2, -0.02]} rotation={[0, 0, -res.ropeAngle]} />
              <mesh geometry={res.tassel} material={res.red} position={[0, (res.low + res.high) / 2, 0.1]} />
              <mesh geometry={res.tail} material={res.red} position={[0, (res.low + res.high) / 2 - 0.2, 0.1]} />
            </group>
          </group>
        );
      })}
    </>
  );
}
