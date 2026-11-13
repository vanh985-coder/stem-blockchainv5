import { useProgress } from '@react-three/drei';
import { useEffect, useState } from 'react';
import { asset } from '../../assets/store';
import { ui } from '../../content/ui';
import { LoadingScreen } from '../../ui/LoadingScreen';
import type { VillageId } from '../../village';

/** Ảnh tranh của từng làng (có trong manifest.json); dùng để nạp sẵn khi làng đang được chuẩn bị. Màn chờ vẫn dùng một ảnh nền chung. */
export const CURTAIN_IMAGE: Readonly<Record<VillageId | 'cho', string>> = {
  cho: 'ui/man-hinh-tai',
  'lang-giay': 'scenes/bai-hoc-lang-giay',
  'lang-det': 'scenes/bai-hoc-lang-det',
  'lang-khac-dau': 'scenes/bai-hoc-lang-khac-dau',
  'lang-bac': 'scenes/bai-hoc-lang-bac',
};

/** Hàm thuần: tên nơi sắp vào; không biết làng thì là chợ phiên. */
export function curtainName(place: VillageId | null): string {
  return place ? ui.lang[place] : ui.manCho.tenCho;
}

/** Nạp sẵn ảnh nền chung của màn chờ để màn chờ hiện ngay khi bước vào làng. Gọi nhiều lần cũng chỉ nạp một lần. */
const preloaded = new Set<string>();
export function preloadCurtainImage(): void {
  const url = asset(CURTAIN_IMAGE.cho);
  if (!url || preloaded.has(url) || typeof Image === 'undefined') return;
  preloaded.add(url);
  const img = new Image();
  img.decoding = 'async';
  img.src = url;
}

/**
 * `cond` đã đúng liền trong `frames` khung hình thì true (camera và người chơi kịp đặt đúng chỗ rồi mới mở màn chờ); `cond` sai thì false ngay.
 */
export function useSettled(cond: boolean, frames = 2): boolean {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    if (!cond) {
      setOk(false);
      return undefined;
    }
    let n = 0;
    let id = 0;
    const tick = () => {
      if (++n >= frames) setOk(true);
      else id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [cond, frames]);
  return ok;
}

export interface WorldCurtainProps {
  /** Còn cần che không (false thì lên 100% rồi mờ dần 0,4 giây) */
  shown: boolean;
  /** Làng sắp vào; null là chợ phiên */
  place: VillageId | null;
  /** Tiến độ dựng vùng làng (0 đến 100) khi đang vào làng; null thì lấy tiến độ tải cảnh của drei */
  zonePercent: number | null;
}

/** Màn chờ của thế giới mở (vào chợ, vào làng): màn chờ chung kèm tên nơi sắp vào và tiến độ tải cảnh hay dựng vùng làng. */
export function WorldCurtain({ shown, place, zonePercent }: WorldCurtainProps) {
  const sceneProgress = useProgress((s) => s.progress);
  return <LoadingScreen shown={shown} subtitle={ui.manCho.dangVao} title={curtainName(place)} percent={zonePercent ?? sceneProgress} data={{ place: place ?? 'cho' }} />;
}
