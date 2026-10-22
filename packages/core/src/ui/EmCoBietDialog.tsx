import { useEffect, useState } from 'react';
import { fmt } from '../content/characters';
import { ui } from '../content/ui';
import type { StoryCard } from '../lessons/types';
import { Button } from './Button';
import { Panel } from './Panel';

export interface EmCoBietDialogProps {
  cards: readonly StoryCard[];
  /** Bấm nút ở thẻ cuối, bấm ra ngoài hộp hoặc Esc */
  onClose: () => void;
  /** Chữ nút ở thẻ cuối (mặc định "Đóng"; vào làng lần đầu là "Vào làng") */
  finishLabel?: string;
  /** Gọi khi bấm nút ở thẻ cuối (đã đọc hết các thẻ), ngay trước `onClose`; không gọi khi đóng bằng Esc hay bấm ra ngoài */
  onFinish?: () => void;
}

/**
 * Hộp "Em có biết?" dùng chung (trang bài học 2D và cảnh làng 3D; mốc 3 dùng lại cho 3 làng còn lại): các thẻ kiến thức xem lần lượt, mỗi lần một thẻ, "Thẻ n/tổng",
 * nút "Trước" và "Tiếp", ở thẻ cuối nút đổi thành `finishLabel`. Nội dung thẻ lấy từ `content/` (xem `villageKnowCards`), không viết lại ở đây.
 */
export function EmCoBietDialog({ cards, onClose, finishLabel, onFinish }: EmCoBietDialogProps) {
  const [i, setI] = useState(0);
  const card = cards[Math.min(i, cards.length - 1)];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!card) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-chu/40 p-4" onClick={onClose} data-walk-ui>
      <Panel role="dialog" aria-modal="true" aria-label={ui.baiHoc.emCoBiet} className="w-full max-w-lg space-y-3" onClick={(e) => e.stopPropagation()}>
        <p className="text-sm font-bold uppercase tracking-wider text-nau-go-dam">
          {ui.baiHoc.emCoBiet} · {fmt(ui.baiHoc.theSo, { n: i + 1, tong: cards.length })}
        </p>
        <h2 className="text-2xl">{fmt(card.title)}</h2>
        <p className="text-lg leading-relaxed">{fmt(card.text)}</p>
        {card.example && <p className="rounded-xl border-2 border-vang bg-vang/15 p-3 text-base">{fmt(card.example)}</p>}
        <div className="flex flex-wrap justify-between gap-2 pt-1">
          <Button variant="secondary" size="sm" disabled={i === 0} onClick={() => setI(i - 1)}>
            {ui.baiHoc.truoc}
          </Button>
          {i < cards.length - 1 ? (
            <Button size="sm" onClick={() => setI(i + 1)}>
              {ui.baiHoc.sau}
            </Button>
          ) : (
            <Button
              size="sm"
              autoFocus
              onClick={() => {
                onFinish?.();
                onClose();
              }}
            >
              {finishLabel ?? ui.baiHoc.dong}
            </Button>
          )}
        </div>
      </Panel>
    </div>
  );
}
