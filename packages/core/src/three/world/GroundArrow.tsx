import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { ExtrudeGeometry, MeshBasicMaterial, MeshStandardMaterial, Shape, type Group } from 'three';
import { ARROW_HIDE_DISTANCE } from '../cho/marketQuest';
import { turnToward } from '../staticMotion';
import { usePlayerState } from '../WalkWorld';
import { createRouter, type RoadGraph, type RouteStep } from './roadGraph';

/** Mũi tên nằm cách người chơi bấy nhiêu về phía điểm tiếp theo. */
const AHEAD = 2.6;
const TURN_RATE = 8;

/**
 * Mũi tên dưới chân (thay mũi tên trên đầu): một mũi tên dẹt vẽ trên mặt đất ngay trước người chơi, chỉ theo ĐƯỜNG ĐI trên đồ thị đường (chợ, ngã, cổng, biển gỗ) tới nút đích, không chỉ thẳng xuyên nhà
 * (hàm thuần `createRouter`, có test). Ẩn khi đã tới gần đích (trong `ARROW_HIDE_DISTANCE`) hoặc không có đích. Nhấp nhô dọc hướng chỉ nhẹ (tắt khi "Giảm chuyển động"). Không cấp phát trong useFrame; rời cảnh
 * thì giải phóng. Đặt trong <WalkWorld>.
 */
export function GroundArrow({ graph, target, animate }: { graph: RoadGraph; target: string | null; animate: boolean }) {
  const player = usePlayerState();
  const group = useRef<Group>(null);
  const router = useMemo(() => createRouter(graph), [graph]);
  const step = useMemo<RouteStep>(() => ({ x: 0, z: 0, remaining: 0, found: false }), []);
  useEffect(() => {
    router.setTarget(target);
  }, [router, target]);
  const res = useMemo(() => {
    // mũi tên dẹt chỉ về +Z (thân rộng 0,34, đầu tam giác rộng 0,9), nằm trên đất
    const shape = new Shape();
    shape.moveTo(-0.17, -0.5);
    shape.lineTo(0.17, -0.5);
    shape.lineTo(0.17, 0.1);
    shape.lineTo(0.45, 0.1);
    shape.lineTo(0, 0.75);
    shape.lineTo(-0.45, 0.1);
    shape.lineTo(-0.17, 0.1);
    shape.closePath();
    const arrow = new ExtrudeGeometry(shape, { depth: 0.06, bevelEnabled: false });
    arrow.rotateX(Math.PI / 2); // nằm ngang: y của hình thành +Z (mũi nhọn về +Z), bề dày hướng xuống
    arrow.translate(0, 0.06, 0); // đáy chạm đất, mặt trên cao 0,06
    const mat = new MeshStandardMaterial({ color: '#FFD23F', emissive: '#FFA800', emissiveIntensity: 0.7, roughness: 0.5 });
    const outline = new MeshBasicMaterial({ color: '#3B2412', transparent: true, opacity: 0.55 });
    return { arrow, mat, outline };
  }, []);
  useEffect(
    () => () => {
      res.arrow.dispose();
      res.mat.dispose();
      res.outline.dispose();
    },
    [res],
  );

  useFrame(({ clock }, dt) => {
    const g = group.current;
    if (!g || !player) return;
    router.next(player.x, player.z, step);
    const dx = step.x - player.x;
    const dz = step.z - player.z;
    const visible = step.found && step.remaining > ARROW_HIDE_DISTANCE && Math.hypot(dx, dz) > 0.01;
    g.visible = visible;
    if (!visible) return;
    const yaw = Math.atan2(dx, dz);
    g.rotation.y = turnToward(g.rotation.y, yaw, TURN_RATE * Math.min(dt, 0.1));
    const bob = animate ? Math.sin(clock.elapsedTime * 3.2) * 0.18 : 0;
    const d = AHEAD + bob;
    g.position.set(player.x + Math.sin(g.rotation.y) * d, player.y + 0.03, player.z + Math.cos(g.rotation.y) * d);
  });

  return (
    <group ref={group} visible={false}>
      <mesh geometry={res.arrow} material={res.outline} scale={[1.28, 1, 1.22]} position={[0, -0.02, 0.02]} renderOrder={1} />
      <mesh geometry={res.arrow} material={res.mat} renderOrder={2} />
    </group>
  );
}
