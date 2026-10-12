import { HEMI_GROUND, HEMI_SKY, SUN_COLOR } from './skyLayout';
import { QUALITY_TABLE, type QualityLevel } from './quality';

export interface DayLightProps {
  level: QualityLevel;
  /** Vị trí mặt trời so với điểm nhìn (chỉ hướng và độ cao có ý nghĩa) */
  sunPosition?: [number, number, number];
  /** Nửa cạnh vùng được đổ bóng, quanh gốc tọa độ (mức Vừa và Cao) */
  shadowExtent?: number;
}

/**
 * Ánh sáng ban ngày (spec 03 mục 2): HemisphereLight trời #FFFFFF, đất #B5D68A; DirectionalLight #FFF4E0.
 * Mức Vừa và Cao đổ bóng mềm (bản đồ 1024 hoặc 2048); mức Thấp không dùng bản đồ bóng.
 * Đổi mức thì dựng lại đèn (key) vì không đổi được kích thước bản đồ bóng khi đang chạy.
 */
export function DayLight({ level, sunPosition = [18, 30, 12], shadowExtent = 24 }: DayLightProps) {
  const shadow = QUALITY_TABLE[level].shadow;
  const size = shadow === 'blob' ? 0 : shadow;
  return (
    <>
      <hemisphereLight args={[HEMI_SKY, HEMI_GROUND, 1.1]} />
      <directionalLight
        key={`${level}`}
        color={SUN_COLOR}
        intensity={2.4}
        position={sunPosition}
        castShadow={size > 0}
        shadow-mapSize={size > 0 ? [size, size] : undefined}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
        shadow-camera-left={-shadowExtent}
        shadow-camera-right={shadowExtent}
        shadow-camera-top={shadowExtent}
        shadow-camera-bottom={-shadowExtent}
        shadow-camera-near={1}
        shadow-camera-far={120}
      />
    </>
  );
}
