import { useEffect, useState } from 'react';
import { fmt } from '../content/characters';
import { knowScrollUi } from '../content/knowScrolls';
import { ui } from '../content/ui';
import { countKnowCards, hasKnowCard } from '../progress/knowCards';
import type { StoryCard } from '../lessons/types';
import { Button } from './Button';
import type { KnowQuiz } from '../content/knowQuiz';
import { EmCoBietDialog } from './EmCoBietDialog';
import { KnowQuizDialog } from './KnowQuizDialog';
import { Panel } from './Panel';

export interface KnowCollectionDialogProps {
  /** Mọi thẻ của làng, theo thứ tự (thẻ thứ i ứng với bit i) */
  cards: readonly StoryCard[];
  /** Mặt nạ bit các thẻ đã nhặt (đã tính "coi như đủ") */
  mask: number;
  /** Số thẻ rải trong làng (có thể ít hơn số thẻ của bài học) */
  total: number;
  /** Câu hỏi của thẻ thứ i (P6b); có thì xem lại hiện cả câu hỏi, đáp án và giải thích (không bắt trả lời lại) */
  quizOf?: (index: number) => KnowQuiz | undefined;
  onClose: () => void;
}

/**
 * Menu "Em có biết?" của làng (bước X3): lưới các thẻ trong sổ. Thẻ đã nhặt hiện số và tiêu đề, bấm để đọc lại; thẻ chưa nhặt hiện dấu "?" và không đọc được. Nội dung thẻ lấy từ `villageKnowCards`
 * (không viết lại). Dùng chung cho 4 làng. Esc hoặc bấm ra ngoài để đóng.
 */
export function KnowCollectionDialog({ cards, mask, total, quizOf, onClose }: KnowCollectionDialogProps) {
  const [open, setOpen] = useState<number | null>(null);
  useEffect(() => {
    if (open !== null) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, open]);
  const shown = cards.slice(0, total);
  const got = countKnowCards(mask, total);
  if (open !== null && cards[open]) {
    const quiz = quizOf?.(open);
    if (quiz) return <KnowQuizDialog mode="review" card={cards[open]} quiz={quiz} index={open} total={total} onClose={() => setOpen(null)} />;
    return <EmCoBietDialog cards={[cards[open]]} onClose={() => setOpen(null)} />;
  }
  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-chu/40 p-4" onClick={onClose} data-walk-ui data-testid="bo-suu-tap-the">
      <Panel role="dialog" aria-modal="true" aria-label={ui.baiHoc.emCoBiet} className="w-full max-w-lg space-y-3" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-2xl">{fmt(knowScrollUi.suuTamTieuDe, { n: got, tong: total })}</h2>
        <ul className="grid grid-cols-2 gap-3">
          {shown.map((c, i) => {
            const have = hasKnowCard(mask, i);
            return (
              <li key={i}>
                <button
                  type="button"
                  disabled={!have}
                  onClick={() => setOpen(i)}
                  data-testid={have ? 'the-da-nhat' : 'the-chua-nhat'}
                  aria-label={have ? fmt(knowScrollUi.daNhatNhan, { so: i + 1, tieuDe: fmt(c.title) }) : fmt(knowScrollUi.chuaNhatNhan, { so: i + 1 })}
                  className={`flex min-h-24 w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border-[3px] p-3 text-center font-display font-extrabold disabled:cursor-not-allowed ${have ? 'border-vang bg-vang/20' : 'border-nau-go/60 bg-white/50 text-nau-go-dam'}`}
                >
                  <span className="text-3xl" aria-hidden="true">
                    {have ? i + 1 : '?'}
                  </span>
                  <span className="text-base leading-snug">{have ? fmt(c.title) : knowScrollUi.chuaNhat}</span>
                </button>
              </li>
            );
          })}
        </ul>
        <div className="flex justify-end pt-1">
          <Button size="sm" autoFocus onClick={onClose}>
            {knowScrollUi.suuTamDong}
          </Button>
        </div>
      </Panel>
    </div>
  );
}
