import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { usePlayerState } from '../WalkWorld';
import { nearestScroll } from '../village/scrollTargets';
import type { VillageScroll } from '../village/villageLayout';

/** Chọn lại thẻ gần nhất mỗi bấy nhiêu giây (không cần mỗi khung hình). */
const TICK = 0.4;

export interface ScrollTargetPickerProps {
  /** Thẻ của làng người chơi đang ở trong; bỏ trống (hoặc không có thẻ nào chưa nhặt) thì không có đích */
  scrolls: readonly VillageScroll[] | undefined;
  /** Mặt nạ bit các thẻ đã nhặt */
  collected: number;
  /** Báo chỉ số thẻ chưa nhặt gần người chơi nhất, hoặc −1 nếu không có; chỉ gọi khi giá trị ĐỔI */
  onChange: (index: number) => void;
}

/**
 * Theo dõi thẻ "Em có biết?" chưa nhặt gần người chơi nhất (bước X3) để mũi tên dưới chân dẫn tới đó và để Bi gợi ý khu có thẻ. Đặt trong <WalkWorld> (đọc vị trí người chơi). Không cấp phát trong useFrame.
 */
export function ScrollTargetPicker({ scrolls, collected, onChange }: ScrollTargetPickerProps) {
  const player = usePlayerState();
  const live = useRef({ onChange, last: -2, t: TICK });
  live.current.onChange = onChange;
  const list = useMemo(() => scrolls ?? [], [scrolls]);
  // đổi danh sách hay mặt nạ thì chọn lại ngay
  useEffect(() => {
    live.current.t = TICK;
  }, [list, collected]);
  useFrame((_, dt) => {
    const s = live.current;
    s.t += dt;
    if (s.t < TICK) return;
    s.t = 0;
    let index = -1;
    if (player && list.length > 0) index = nearestScroll(list, collected, player.x, player.z)?.index ?? -1;
    if (index !== s.last) {
      s.last = index;
      s.onChange(index);
    }
  });
  return null;
}
