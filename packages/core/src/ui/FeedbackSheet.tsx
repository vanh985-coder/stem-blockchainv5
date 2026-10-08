import { useEffect } from 'react';
import { sound } from '../audio/sound';
import { ui } from '../content/ui';
import { BottomSheet } from './BottomSheet';
import { Button } from './Button';
import { PortraitFrame } from './PortraitFrame';

export interface FeedbackSheetProps {
  isOpen: boolean;
  isCorrect: boolean;
  title?: string;
  whatHappened: string; // Chuyện gì xảy ra
  whyHappened?: string; // Vì sao lại như vậy
  howToFix?: string; // Cách sửa hoặc bài học rút ra
  onContinue: () => void;
  continueLabel?: string;
}

/** Hộp phản hồi đúng/sai. Đúng/sai thể hiện bằng biểu tượng + chữ, không chỉ bằng màu. */
export function FeedbackSheet({
  isOpen,
  isCorrect,
  title,
  whatHappened,
  whyHappened,
  howToFix,
  onContinue,
  continueLabel = ui.phanHoi.tiepTuc,
}: FeedbackSheetProps) {
  // Phát âm thanh và hỗ trợ phím Enter
  useEffect(() => {
    if (!isOpen) return;
    if (isCorrect) sound.playCorrect();
    else sound.playWrong();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        onContinue();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, isCorrect, onContinue]);

  if (!isOpen) return null;

  const tone = isCorrect ? 'text-xanh-la-dam' : 'text-do-son-dam';

  return (
    <BottomSheet isOpen={isOpen} variant={isCorrect ? 'success' : 'error'}>
      {/* Vùng aria-live cho bộ đọc màn hình */}
      <div aria-live="polite" className="sr-only">
        {isCorrect ? ui.phanHoi.docDung : ui.phanHoi.docSai} {whatHappened}
      </div>

      <div className="flex flex-col items-start gap-4 sm:flex-row">
        {/* Bi đứng cạnh phản hồi */}
        <div className="hidden shrink-0 sm:block">
          <PortraitFrame portrait="bi" size={80} />
        </div>

        <div className="w-full flex-1">
          <div className="mb-2 flex items-center gap-2">
            <span
              aria-label={isCorrect ? ui.phanHoi.bieuTuongDung : ui.phanHoi.bieuTuongSai}
              role="img"
              className={`flex size-8 shrink-0 items-center justify-center rounded-full text-lg font-bold text-white ${
                isCorrect ? 'bg-xanh-la-dam' : 'bg-do-son'
              }`}
            >
              {isCorrect ? '✓' : '✗'}
            </span>
            <h3 className={`font-display text-xl font-extrabold sm:text-2xl ${tone}`}>
              {title || (isCorrect ? ui.phanHoi.tieuDeDung : ui.phanHoi.tieuDeSai)}
            </h3>
          </div>

          {/* Giải thích 3 bước: Chuyện gì xảy ra, Vì sao, Cách sửa */}
          <div className="space-y-2 text-base">
            <p className="font-semibold leading-snug">{whatHappened}</p>
            {whyHappened && (
              <p className="whitespace-pre-line leading-relaxed">
                <span className="font-bold">{ui.phanHoi.nhanViSao}</span>
                {whyHappened}
              </p>
            )}
            {howToFix && (
              <p className="rounded-xl border-2 border-muc-tim/40 bg-muc-tim/10 p-2 font-medium leading-relaxed text-muc-tim-dam">
                <span className="font-bold">{ui.phanHoi.nhanCachSua}</span>
                {howToFix}
              </p>
            )}
          </div>

          <div className="mt-4 flex justify-end">
            <Button
              autoFocus
              variant={isCorrect ? 'primary' : 'danger'}
              size="md"
              onClick={onContinue}
              className="w-full sm:w-auto"
            >
              {continueLabel}
            </Button>
          </div>
        </div>
      </div>
    </BottomSheet>
  );
}
