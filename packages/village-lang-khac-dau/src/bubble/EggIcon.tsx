import { useEffect, useRef } from 'react';
import { drawEgg, eggImageIndex, type BubbleImages } from './bubbleArt';

export interface EggIconProps {
  value: number;
  /** Chỗ màu của số trong đợt (bubbleSlots.ts) */
  slot: number;
  /** Cạnh canvas (điểm ảnh CSS) */
  size: number;
  images?: BubbleImages;
  dim?: boolean;
  className?: string;
}

/** Quả trứng nhỏ vẽ bằng canvas 2D cho nút và khay (cùng hình với trứng trên bàn). Số luôn hiện rõ, không dưới 14 điểm ảnh. */
export function EggIcon({ value, slot, size, images, dim = false, className = '' }: EggIconProps) {
  const ref = useRef<HTMLCanvasElement>(null);
  const img = images?.trung[eggImageIndex(slot)] ?? null;
  useEffect(() => {
    const c = ref.current;
    const g = c?.getContext('2d');
    if (!c || !g) return;
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    c.width = Math.round(size * dpr);
    c.height = Math.round(size * dpr);
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, c.width, c.height);
    const d = size * dpr * 0.88;
    drawEgg(g, c.width / 2, c.height / 2, d, value, slot, img, Math.max(14, Math.round(size * 0.42)) * dpr);
  }, [value, slot, size, img]);
  return <canvas ref={ref} width={size} height={size} aria-hidden="true" className={`${dim ? 'opacity-40' : ''} ${className}`} style={{ width: size, height: size }} />;
}
