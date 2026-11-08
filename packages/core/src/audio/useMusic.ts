import { useEffect } from 'react';
import { useLocation } from 'react-router';
import { music } from './musicManager';
import { trackForPath, type SfxKey } from './musicLogic';

/** Gắn một lần ở gốc ứng dụng (trong Router): nhạc nền đổi theo đường dẫn trang. Trang không có nhạc thì tạm dừng. */
export function useSceneMusic(): void {
  const { pathname } = useLocation();
  useEffect(() => {
    music.setTrack(trackForPath(pathname));
  }, [pathname]);
}

/** Trong lúc `active` (mặc định luôn): có câu hỏi hoặc lời thoại đang hiện, nhạc nền nhỏ xuống còn khoảng 30%; đóng thì trở lại. */
export function useMusicDuck(active = true): void {
  useEffect(() => {
    if (!active) return;
    return music.duck();
  }, [active]);
}

/** Phát một đoạn âm ngắn (vd. tiếng chiêng khi hiện câu hỏi) một lần khi phần tử hiện ra. */
export function useSfxOnMount(key: SfxKey): void {
  useEffect(() => {
    music.playSfx(key);
  }, [key]);
}
