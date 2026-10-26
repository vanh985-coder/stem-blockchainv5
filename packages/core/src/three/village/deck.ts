/**
 * Bến gỗ của Làng Bạc (mốc 3, bước L5): sàn ván đặc nhô ra mặt nước, có dốc ở phía bờ, như bến tàu của chợ (`groundHeight` ở marketLayout.ts). Bến là đồ nhỏ `ben-go` do code dựng; gốc ở GIỮA bến,
 * trục z của đồ chạy từ phía bờ (−z) ra nước (+z). Hàm thuần: độ cao mặt đi được tại một điểm và danh sách bến trong một danh sách đồ nhỏ. Người chơi đi lên bến bằng dốc (độ cao tăng dần, như cầu chợ).
 */
import type { PropPlacement } from '../cho/marketLayout';

export const DECK = {
  /** Nửa bề rộng bến (cùng bến tàu của chợ) */
  hx: 1.7,
  /** Nửa chiều dài (bến dài 9) */
  hz: 4.5,
  /** Mặt sàn cao bấy nhiêu */
  top: 0.5,
  /** Dốc dài bấy nhiêu ở phía bờ (từ −hz) */
  ramp: 2.2,
} as const;

type DeckPose = Pick<PropPlacement, 'x' | 'z' | 'yaw'>;

/** Các bến trong danh sách đồ nhỏ (loại `ben-go`). */
export function decksOf(props: readonly PropPlacement[]): PropPlacement[] {
  return props.filter((p) => p.kind === 'ben-go');
}

/** Điểm (x, z) trong hệ của bến: lz dọc bến (−hz là chân dốc, +hz là mũi bến), lx ngang bến. */
export function deckLocal(d: DeckPose, x: number, z: number): { lx: number; lz: number } {
  const dx = x - d.x;
  const dz = z - d.z;
  const c = Math.cos(d.yaw);
  const s = Math.sin(d.yaw);
  return { lx: dx * c - dz * s, lz: dx * s + dz * c };
}

/** Độ cao mặt đi được của MỘT bến tại (x, z): 0 ngoài bến; dốc tuyến tính ở `ramp` đầu tiên; sàn phẳng `top` tới mũi bến. */
export function deckHeight(d: DeckPose, x: number, z: number): number {
  const { lx, lz } = deckLocal(d, x, z);
  if (Math.abs(lx) > DECK.hx || lz < -DECK.hz || lz > DECK.hz) return 0;
  const up = lz + DECK.hz;
  return up >= DECK.ramp ? DECK.top : (DECK.top * up) / DECK.ramp;
}

/** Hàm độ cao mặt đi được cho một nhóm bến (lớn nhất trong các bến chồng nhau; không có bến thì luôn 0). */
export function decksHeight(decks: readonly DeckPose[]): (x: number, z: number) => number {
  return (x, z) => {
    let h = 0;
    for (const d of decks) h = Math.max(h, deckHeight(d, x, z));
    return h;
  };
}
