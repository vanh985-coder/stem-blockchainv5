import React, { useEffect } from 'react';
import { BottomSheet } from '../ui/BottomSheet';
import { Button } from '../ui/Button';
import { Mascot } from '../ui/Mascot';
import { sound } from '../../lib/sound';

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

export const FeedbackSheet: React.FC<FeedbackSheetProps> = ({
  isOpen,
  isCorrect,
  title,
  whatHappened,
  whyHappened,
  howToFix,
  onContinue,
  continueLabel = 'Tiếp tục',
}) => {
  // Phát âm thanh và hỗ trợ phím Enter
  useEffect(() => {
    if (!isOpen) return;

    if (isCorrect) {
      sound.playCorrect();
    } else {
      sound.playWrong();
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        onContinue();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isCorrect, onContinue]);

  if (!isOpen) return null;

  const defaultTitle = isCorrect ? 'Chính xác!' : 'Chưa đúng';

  return (
    <BottomSheet isOpen={isOpen} variant={isCorrect ? 'success' : 'error'}>
      {/* Vùng aria-live cho bộ đọc màn hình (Screen Reader) */}
      <div aria-live="polite" className="sr-only">
        {isCorrect ? 'Chúc mừng em, câu trả lời chính xác!' : 'Chưa đúng, hãy xem giải thích.'}
        {whatHappened}
      </div>

      <div className="flex flex-col sm:flex-row items-start gap-4">
        {/* Linh vật Bi phản ứng theo kết quả */}
        <div className="hidden sm:block shrink-0">
          <Mascot mood={isCorrect ? 'vui' : 'suy_nghi'} size="sm" />
        </div>

        <div className="flex-1 w-full">
          {/* Tiêu đề kết quả */}
          <div className="flex items-center gap-2 mb-2">
            <span
              className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-white text-sm ${
                isCorrect ? 'bg-[#1FAF5A]' : 'bg-[#E5484D]'
              }`}
            >
              {isCorrect ? '✓' : '✗'}
            </span>
            <h3
              className={`font-display font-black text-xl sm:text-2xl ${
                isCorrect ? 'text-[#1FAF5A]' : 'text-[#E5484D]'
              }`}
            >
              {title || defaultTitle}
            </h3>
          </div>

          {/* Giải thích 3 bước theo trình tự: Chuyện gì xảy ra -> Vì sao -> Cách sửa */}
          <div className="space-y-2 text-sm text-[#2A2340]">
            <p className="font-semibold text-base leading-snug">{whatHappened}</p>

            {whyHappened && (
              <p className="text-[#6B6485] leading-relaxed">
                <span className="font-bold text-[#2A2340]">Vì sao: </span>
                {whyHappened}
              </p>
            )}

            {howToFix && (
              <p className="text-[#5B3FD6] bg-[#5B3FD6]/10 p-2 rounded-[10px] font-medium leading-relaxed">
                <span className="font-bold">Cách sửa: </span>
                {howToFix}
              </p>
            )}
          </div>

          {/* Nút Tiếp tục (Nhấn Enter) */}
          <div className="mt-4 flex justify-end">
            <Button
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
};
