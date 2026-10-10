import { useEffect, useState } from 'react';
import { NenTrangTri, THEME_FADE_MS, THEME_GRADIENT, STORY_IMAGE_OPACITY, asset, useManifest, useSettings, type NenTheme } from '@so-chung/core';

const THEMES: readonly NenTheme[] = ['mo', 'lang', 'hoi'];

/**
 * Nền của /truyen: màu ấm theo chủ đề (không còn lớp phủ tối), ảnh truyện làm mờ phủ lên khoảng 35%, icon của bộ.
 * Đổi chủ đề thì màu nền và icon chuyển dần (khoảng 0,6 giây); bật "Giảm chuyển động" thì đổi ngay.
 */
export function StoryBackdrop({ theme, image }: { theme: NenTheme; image: string }) {
  useManifest();
  const { settings } = useSettings();
  const url = asset(image);
  // Chỉ dựng lớp icon của bộ đã từng hiện, để không tải/vẽ thừa.
  const [visited, setVisited] = useState<ReadonlySet<NenTheme>>(() => new Set([theme]));
  useEffect(() => {
    setVisited((v) => (v.has(theme) ? v : new Set(v).add(theme)));
  }, [theme]);

  const fade = settings.reducedMotion ? '' : 'transition-opacity';
  const style = (on: boolean) => ({ opacity: on ? 1 : 0, transitionDuration: `${THEME_FADE_MS}ms` });

  return (
    <>
      {THEMES.map((t) => (
        <div key={`c${t}`} className={`absolute inset-0 ${fade}`} style={{ background: THEME_GRADIENT[t], ...style(t === theme) }} />
      ))}
      {url && (
        // Lớp ngoài làm hiệu ứng hiện nhẹ khi đổi ảnh; lớp trong giữ độ phủ 35%.
        <div key={image} className="animate-vn-in absolute inset-0">
          <div
            className="absolute inset-[-24px] bg-cover bg-center blur-xl"
            style={{ backgroundImage: `url("${url}")`, opacity: STORY_IMAGE_OPACITY }}
          />
        </div>
      )}
      {THEMES.filter((t) => visited.has(t)).map((t) => (
        <div key={`i${t}`} className={`absolute inset-0 ${fade}`} style={style(t === theme)}>
          <NenTrangTri theme={t} image={null} />
        </div>
      ))}
    </>
  );
}
