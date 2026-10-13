import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { Object3D, type DirectionalLight } from 'three';
import { HEMI_GROUND, HEMI_SKY, SUN_COLOR } from './skyLayout';
import { QUALITY_TABLE, type QualityLevel } from './quality';
import { SHADOW_RANGE, SUN_DISTANCE, normalizeInto, shadowFocus, snapToLightTexel, type Vec3 } from './shadowFocus';

export interface DayLightProps {
  level: QualityLevel;
  /** Vị trí mặt trời so với điểm nhìn (chỉ hướng và độ cao có ý nghĩa) */
  sunPosition?: [number, number, number];
  /** Nửa cạnh vùng được đổ bóng, quanh gốc tọa độ (mức Vừa và Cao); khi bám theo người chơi thì là quanh người chơi */
  shadowExtent?: number;
  /**
   * Máy ảnh bóng bám theo người chơi (`shadowFocus`), phủ nửa cạnh `SHADOW_RANGE` (25) quanh người; vị trí được làm tròn theo texel của bản đồ bóng
   * để bóng không nhấp nháy khi đi. Cảnh đi lại dùng; các cảnh khác để bóng cố định quanh gốc tọa độ.
   */
  followPlayer?: boolean;
}

/**
 * Ánh sáng ban ngày (spec 03 mục 2): HemisphereLight trời #FFFFFF, đất #B5D68A; DirectionalLight #FFF4E0.
 * Mức Vừa và Cao đổ bóng mềm (bản đồ 1024 hoặc 2048); mức Thấp không dùng bản đồ bóng.
 * Đổi mức thì dựng lại đèn (key) vì không đổi được kích thước bản đồ bóng khi đang chạy.
 */
export function DayLight({ level, sunPosition = [18, 30, 12], shadowExtent = 24, followPlayer = false }: DayLightProps) {
  const shadow = QUALITY_TABLE[level].shadow;
  const size = shadow === 'blob' ? 0 : shadow;
  const extent = followPlayer ? SHADOW_RANGE : shadowExtent;
  const light = useRef<DirectionalLight>(null);
  const target = useMemo(() => new Object3D(), []);
  const work = useMemo(() => ({ dir: { x: 0, y: 1, z: 0 } as Vec3, snapped: { x: 0, y: 0, z: 0 } as Vec3 }), []);
  const dirSource = useMemo<Vec3>(() => ({ x: sunPosition[0], y: sunPosition[1], z: sunPosition[2] }), [sunPosition]);
  normalizeInto(dirSource, work.dir);

  useFrame(() => {
    const l = light.current;
    if (!followPlayer || !l || size === 0) return;
    const texel = (2 * SHADOW_RANGE) / size;
    snapToLightTexel(shadowFocus, work.dir, texel, work.snapped);
    const s = work.snapped;
    target.position.set(s.x, s.y, s.z);
    target.updateMatrixWorld();
    l.position.set(s.x + work.dir.x * SUN_DISTANCE, s.y + work.dir.y * SUN_DISTANCE, s.z + work.dir.z * SUN_DISTANCE);
  });

  return (
    <>
      <hemisphereLight args={[HEMI_SKY, HEMI_GROUND, 1.1]} />
      {followPlayer && <primitive object={target} />}
      <directionalLight
        key={`${level}`}
        ref={light}
        color={SUN_COLOR}
        intensity={2.4}
        position={followPlayer ? [work.dir.x * SUN_DISTANCE, work.dir.y * SUN_DISTANCE, work.dir.z * SUN_DISTANCE] : sunPosition}
        target={followPlayer ? target : undefined}
        castShadow={size > 0}
        shadow-mapSize={size > 0 ? [size, size] : undefined}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
        shadow-camera-left={-extent}
        shadow-camera-right={extent}
        shadow-camera-top={extent}
        shadow-camera-bottom={-extent}
        shadow-camera-near={1}
        shadow-camera-far={followPlayer ? SUN_DISTANCE * 2 : 120}
      />
    </>
  );
}
