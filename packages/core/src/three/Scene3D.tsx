import { Canvas, useThree, type RootState } from '@react-three/fiber';
import { Suspense, useCallback, useEffect, useState, type ReactNode } from 'react';
import { ACESFilmicToneMapping } from 'three';
import { useSettings } from '../settings/SettingsProvider';
import { DayLight } from './DayLight';
import { FpsGuard } from './FpsGuard';
import { LoadingScreen } from './LoadingScreen';
import { QualityContext } from './QualityContext';
import { Sky } from './Sky';
import { effectiveDpr, type QualityChoice, type QualityLevel } from './quality';
import { lowerSessionCap } from './qualityStore';
import { SKY_HORIZON, SKY_RADIUS } from './skyLayout';
import { useQuality } from './useQuality';

export interface Scene3DProps {
  /** Các phần tử R3F của cảnh (model, nền đất, điều khiển camera…) */
  children?: ReactNode;
  /** Lớp CSS cho khung ngoài; khung lấp đầy phần tử cha */
  className?: string;
  /** Thay cho cài đặt "Chất lượng đồ họa" (dùng ở /dev/3d). Có giá trị này thì không tự hạ mức. */
  quality?: QualityChoice;
  /** Tự hạ một mức nếu FPS dưới 40 trong 3 giây đầu (mặc định bật) */
  autoDowngrade?: boolean;
  /** Camera ban đầu */
  camera?: { position?: [number, number, number]; fov?: number; near?: number; far?: number };
  /** Điểm camera nhìn vào lúc đầu (mặc định gốc tọa độ). Nếu có điều khiển camera (OrbitControls) thì dùng `target` của nó. */
  lookAt?: [number, number, number];
  /** Gọi một lần khi khung vẽ đã tạo xong (lấy renderer, dùng cho công cụ dev) */
  onCreated?: (state: RootState) => void;
  /** Khoảng sương [gần, xa]; false để tắt sương */
  fog?: [number, number] | false;
  /** Vị trí mặt trời (hướng đổ bóng) */
  sunPosition?: [number, number, number];
  /** Nửa cạnh vùng đổ bóng quanh gốc tọa độ */
  shadowExtent?: number;
  /** Báo mức mới khi vừa tự hạ mức vì FPS thấp */
  onQualityLowered?: (fps: number, level: QualityLevel) => void;
  /** Báo khi cảnh đã tải xong (màn hình tải đã tắt) */
  onReady?: () => void;
}

/** Hướng camera về một điểm khi dựng cảnh (không cấp phát trong useFrame; chỉ chạy một lần). */
function LookAt({ at }: { at: [number, number, number] }) {
  const camera = useThree((st) => st.camera);
  useEffect(() => {
    camera.lookAt(at[0], at[1], at[2]);
  }, [camera, at]);
  return null;
}

/** Component rỗng đặt trong Suspense: chỉ gắn vào khi mọi thứ phía trên đã tải xong. */
function ReadySignal({ onReady }: { onReady: () => void }) {
  useEffect(() => {
    onReady();
  }, [onReady]);
  return null;
}

/**
 * Khung cảnh 3D (R3F): trời chuyển màu có mây tròn, ánh sáng ban ngày, sương nhẹ, tone mapping ACES (spec 03 mục 2).
 * Mức chất lượng (DPR, bóng) lấy từ cài đặt, tự hạ một mức nếu FPS dưới 40 trong 3 giây đầu.
 * Có màn hình tải (thanh tiến độ) cho tới khi mọi model của cảnh đã tải xong. Rời cảnh thì Canvas tự giải phóng,
 * các model giải phóng sau một lúc (xem modelLoader).
 *
 * Nằm trong chunk riêng: chỉ import ở trang 3D (lazy), không import ở trang đầu.
 */
export function Scene3D({
  children,
  className = '',
  quality,
  autoDowngrade = true,
  camera,
  lookAt,
  onCreated,
  fog = [60, 220],
  sunPosition,
  shadowExtent,
  onQualityLowered,
  onReady,
}: Scene3DProps) {
  const { level } = useQuality(quality);
  const { settings } = useSettings();
  const [ready, setReady] = useState(false);
  // Khử răng cưa chỉ chọn được lúc tạo khung vẽ: lấy theo mức ban đầu.
  const [antialias] = useState(level !== 'low');
  const markReady = useCallback(() => {
    setReady(true);
    onReady?.();
  }, [onReady]);
  const handleLow = useCallback(
    (fps: number) => {
      const next = lowerSessionCap(level);
      onQualityLowered?.(fps, next);
    },
    [level, onQualityLowered],
  );
  const dpr = effectiveDpr(level, typeof window === 'undefined' ? 1 : window.devicePixelRatio);

  return (
    <div className={`relative size-full overflow-hidden ${className}`}>
      <Canvas
        dpr={dpr}
        shadows={level === 'low' ? false : 'soft'}
        gl={{ antialias, powerPreference: 'high-performance', toneMapping: ACESFilmicToneMapping }}
        onCreated={onCreated}
        camera={{ position: camera?.position ?? [0, 4, 10], fov: camera?.fov ?? 45, near: camera?.near ?? 0.1, far: camera?.far ?? SKY_RADIUS * 2 }}
      >
        <QualityContext.Provider value={level}>
          {lookAt && <LookAt at={lookAt} />}
          {fog && <fog attach="fog" args={[SKY_HORIZON, fog[0], fog[1]]} />}
          <Suspense fallback={null}>
            <Sky animate={!settings.reducedMotion} />
            <DayLight level={level} sunPosition={sunPosition} shadowExtent={shadowExtent} />
            {children}
            <ReadySignal onReady={markReady} />
            {autoDowngrade && !quality && level !== 'low' && <FpsGuard key={level} onLow={handleLow} />}
          </Suspense>
        </QualityContext.Provider>
      </Canvas>
      <LoadingScreen visible={!ready} />
    </div>
  );
}
