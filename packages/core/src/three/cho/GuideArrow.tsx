import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { ExtrudeGeometry, MeshStandardMaterial, Shape, type Group } from 'three';
import { turnToward } from '../staticMotion';
import { usePlayerState } from '../WalkWorld';
import { guideArrow, type GuideArrowState } from './marketQuest';

/** Độ cao đáy mũi tên so với chân người chơi (nhân vật cao 1,7). */
const ARROW_HEIGHT = 2.45;
const TURN_RATE = 10;

/**
 * Mũi tên trên đầu nhân vật chỉ về cổng cần tới (spec 04 mục 3 "HUD"; do code dựng): thân và đầu mũi tên vàng, bay nhấp nhô nhẹ (tắt khi "Giảm chuyển
 * động"), quay mượt về hướng cổng; ẩn khi người chơi đã tới gần cổng hoặc không còn cổng nào để tới. Không cấp phát trong useFrame; rời cảnh thì giải phóng.
 * Đặt trong <WalkWorld>.
 */
export function GuideArrow({ target, animate }: { target: { x: number; z: number } | null; animate: boolean }) {
  const player = usePlayerState();
  const group = useRef<Group>(null);
  const state = useMemo<GuideArrowState>(() => ({ visible: false, yaw: 0 }), []);
  const res = useMemo(() => {
    // mũi tên dẹt nằm ngang (nhìn từ camera phía sau và trên thì thấy rõ hình mũi tên), chỉ về +Z: thân rộng 0,34 và đầu tam giác rộng 0,9
    const shape = new Shape();
    shape.moveTo(-0.17, -0.5);
    shape.lineTo(0.17, -0.5);
    shape.lineTo(0.17, 0.1);
    shape.lineTo(0.45, 0.1);
    shape.lineTo(0, 0.75);
    shape.lineTo(-0.45, 0.1);
    shape.lineTo(-0.17, 0.1);
    shape.closePath();
    const arrow = new ExtrudeGeometry(shape, { depth: 0.14, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 1 });
    arrow.rotateX(Math.PI / 2); // y của hình thành +Z; bề dày hướng xuống
    arrow.translate(0, 0.07, 0);
    const mat = new MeshStandardMaterial({ color: '#FFC83D', emissive: '#E8A000', emissiveIntensity: 0.55, roughness: 0.5 });
    return { arrow, mat };
  }, []);
  useEffect(
    () => () => {
      res.arrow.dispose();
      res.mat.dispose();
    },
    [res],
  );

  useFrame(({ clock }, dt) => {
    const g = group.current;
    if (!g || !player) return;
    guideArrow(player.x, player.z, target, state);
    g.visible = state.visible;
    if (!state.visible) return;
    g.position.set(player.x, player.y + ARROW_HEIGHT + (animate ? Math.sin(clock.elapsedTime * 3) * 0.1 : 0), player.z);
    g.rotation.y = turnToward(g.rotation.y, state.yaw, TURN_RATE * Math.min(dt, 0.1));
  });

  return (
    <group ref={group} visible={false}>
      <mesh geometry={res.arrow} material={res.mat} />
    </group>
  );
}
