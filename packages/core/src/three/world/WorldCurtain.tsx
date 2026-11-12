import { useProgress } from '@react-three/drei';
import { useEffect, useRef, useState } from 'react';
import { AssetImage } from '../../assets/AssetImage';
import { asset } from '../../assets/store';
import { fmt } from '../../content/characters';
import { ui } from '../../content/ui';
import { ProgressBar } from '../../ui/ProgressBar';
import type { VillageId } from '../../village';

/** Ảnh nền màn chờ: chợ phiên dùng ảnh "đang tải"; mỗi làng dùng ảnh tranh bài học của làng đó (có trong manifest.json) */
export const CURTAIN_IMAGE: Readonly<Record<VillageId | 'cho', string>> = {
  cho: 'ui/man-hinh-tai',
  'lang-giay': 'scenes/bai-hoc-lang-giay',
  'lang-det': 'scenes/bai-hoc-lang-det',
  'lang-khac-dau': 'scenes/bai-hoc-lang-khac-dau',
  'lang-bac': 'scenes/bai-hoc-lang-bac',
};

/** Thời gian mờ dần khi ẩn màn chờ (ms) */
export const CURTAIN_FADE_MS = 400;

/** Hàm thuần: tên nơi sắp vào và ảnh nền; không biết làng thì là chợ phiên. */
export function curtainTarget(place: VillageId | null): { name: string; image: string } {
  return place ? { name: ui.lang[place], image: CURTAIN_IMAGE[place] } : { name: ui.manCho.tenCho, image: CURTAIN_IMAGE.cho };
}

/** Nạp sẵn ảnh nền của một làng (làng đang được chuẩn bị) để màn chờ hiện ngay khi bước vào làng. Gọi nhiều lần cho cùng làng cũng chỉ nạp một lần. */
const preloaded = new Set<string>();
export function preloadCurtainImage(place: VillageId): void {
  const url = asset(CURTAIN_IMAGE[place]);
  if (!url || preloaded.has(url) || typeof Image === 'undefined') return;
  preloaded.add(url);
  const img = new Image();
  img.decoding = 'async';
  img.src = url;
}

/** Hàm thuần: phần trăm không bao giờ lùi trong một lần hiện màn chờ, kẹp 0 đến 100. */
export function nextPercent(prev: number, now: number): number {
  return Math.round(Math.min(100, Math.max(prev, now, 0)));
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
  /** Còn cần che không (false thì mờ dần trong 0,4 giây rồi nhường chuột cho cảnh) */
  shown: boolean;
  /** Làng sắp vào; null là chợ phiên */
  place: VillageId | null;
  /** Tiến độ dựng vùng làng (0 đến 100) khi đang vào làng; null thì lấy tiến độ tải cảnh của drei */
  zonePercent: number | null;
  /** "Giảm chuyển động": ẩn ngay không mờ dần */
  reducedMotion: boolean;
}

/**
 * Màn chờ chung của thế giới mở (vào chợ, vào làng): che kín toàn màn hình bằng ảnh tranh, tên nơi sắp vào, thanh tiến độ và phần trăm, trên một lớp tối nhẹ cho chữ dễ đọc.
 * Dùng viền và nền phẳng (không bóng, không lọc) vì phủ lên cảnh WebGL.
 */
export function WorldCurtain({ shown, place, zonePercent, reducedMotion }: WorldCurtainProps) {
  const sceneProgress = useProgress((s) => s.progress);
  const best = useRef(0);
  const wasShown = useRef(shown);
  if (shown && !wasShown.current) best.current = 0; // lần hiện mới: tính lại từ 0
  wasShown.current = shown;
  // chưa xong hẳn thì tối đa 99% (tải model xong chưa có nghĩa là cảnh đã dựng và camera đã đặt); khi mờ dần mới là 100%
  const percent = shown ? Math.min(99, nextPercent(best.current, zonePercent ?? sceneProgress)) : 100;
  if (shown) best.current = percent;
  const { name, image } = curtainTarget(place);
  return (
    <div
      data-testid="man-cho-tai"
      data-shown={shown ? 'true' : 'false'}
      data-place={place ?? 'cho'}
      aria-hidden={!shown}
      className={`fixed inset-0 z-[60] grid place-items-center overflow-hidden bg-giay p-6 ${shown ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
      style={{ transition: shown || reducedMotion ? 'none' : `opacity ${CURTAIN_FADE_MS}ms ease-out` }}
    >
      <AssetImage key={image} path={image} alt="" className="absolute inset-0 size-full object-cover" />
      <div aria-hidden="true" className="absolute inset-0 bg-black/35" />
      <div className="relative z-10 flex w-full max-w-sm flex-col items-center gap-3 rounded-bang border-2 border-white/40 bg-black/45 p-5 text-center text-white">
        <p className="font-display text-base font-bold">{ui.manCho.dangVao}</p>
        <h2 data-testid="man-cho-tai-ten" className="font-display text-3xl font-extrabold">
          {name}
        </h2>
        <ProgressBar current={percent} max={100} />
        <p role="status" className="font-display text-xl font-bold">
          {fmt(ui.tai3d.phanTram, { so: percent })}
        </p>
      </div>
    </div>
  );
}
