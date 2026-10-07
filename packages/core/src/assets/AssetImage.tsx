import { useState, type CSSProperties, type ImgHTMLAttributes } from 'react';
import { lookupAsset } from './manifest';
import { ASSETS_URL, devWarn, useManifest } from './store';

/** Màu ổn định theo đường dẫn, dùng cho ô thay thế. */
function placeholderColor(path: string): string {
  let h = 0;
  for (let i = 0; i < path.length; i++) h = (h * 31 + path.charCodeAt(i)) % 360;
  return `hsl(${h} 45% 78%)`;
}

export interface AssetImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'alt'> {
  path: string;
  alt: string;
}

/** Ảnh theo manifest. Thiếu file (hoặc ảnh lỗi) thì hiện ô màu thay thế, không làm lỗi trang. */
export function AssetImage({ path, alt, className, style, ...rest }: AssetImageProps) {
  const manifest = useManifest();
  const [failed, setFailed] = useState(false);
  const src = failed ? null : lookupAsset(manifest, ASSETS_URL, path);

  if (!src) {
    if (manifest && !failed) devWarn(`Thiếu ảnh "${path}" trong manifest`);
    const box: CSSProperties = { background: placeholderColor(path), ...style };
    return <div role="img" aria-label={alt} className={className} style={box} />;
  }
  return (
    <img
      {...rest}
      src={src}
      alt={alt}
      className={className}
      style={style}
      onError={() => {
        devWarn(`Không tải được ảnh "${path}" (${src})`);
        setFailed(true);
      }}
    />
  );
}
