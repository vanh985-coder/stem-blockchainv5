import { useProgress } from '@react-three/drei';
import { fmt } from '../content/characters';
import { ui } from '../content/ui';
import { AssetImage } from '../assets/AssetImage';
import { ProgressBar } from '../ui/ProgressBar';

export interface LoadingScreenProps {
  /** Còn hiện màn hình tải không (false thì mờ đi và nhường chuột cho cảnh) */
  visible: boolean;
}

/**
 * Màn hình tải cảnh 3D: nền giấy dó, thanh tiến độ theo phần trăm đã tải (useProgress của drei đo mọi file mà
 * LoadingManager đang tải: model, texture). Phủ lên khung của <Scene3D>.
 */
export function LoadingScreen({ visible }: LoadingScreenProps) {
  const { progress } = useProgress();
  const percent = Math.round(Math.min(100, Math.max(0, progress)));
  return (
    <div
      aria-hidden={!visible}
      className={`absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-giay p-6 transition-opacity duration-500 ${
        visible ? 'opacity-100' : 'pointer-events-none opacity-0'
      }`}
    >
      <AssetImage path="ui/man-hinh-tai" alt="" className="absolute inset-0 -z-0 size-full object-cover opacity-40" />
      <div className="relative z-10 flex w-full max-w-sm flex-col items-center gap-3">
        <p role="status" className="font-display text-2xl font-extrabold">
          {ui.tai3d.dangTai}
        </p>
        <ProgressBar current={percent} max={100} />
        <p className="font-display text-xl font-bold text-nau-go-dam">{fmt(ui.tai3d.phanTram, { so: percent })}</p>
      </div>
    </div>
  );
}
