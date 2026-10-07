import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { sound } from '../../lib/sound';

export interface StoryCard {
  title: string;
  text: string;
  example?: string;
  svgIcon?: React.ReactNode;
}

export interface DidYouKnowModalProps {
  isOpen: boolean;
  onClose: () => void;
  cards: StoryCard[];
  lessonTitle?: string;
}

export const DidYouKnowModal: React.FC<DidYouKnowModalProps> = ({
  isOpen,
  onClose,
  cards,
  lessonTitle = 'Em có biết?',
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Reset về thẻ đầu tiên khi mở lại modal
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(0);
    }
  }, [isOpen]);

  // Điều khiển bằng bàn phím: mũi tên trái/phải, Esc (Modal đã xử lý Esc)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        if (currentIndex < cards.length - 1) {
          sound.playClick();
          setCurrentIndex((prev) => prev + 1);
        }
      } else if (e.key === 'ArrowLeft') {
        if (currentIndex > 0) {
          sound.playClick();
          setCurrentIndex((prev) => prev - 1);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentIndex, cards.length]);

  if (!isOpen || cards.length === 0) return null;

  const currentCard = cards[currentIndex];
  const isLast = currentIndex === cards.length - 1;

  const handleNext = () => {
    if (isLast) {
      sound.playClick();
      onClose();
    } else {
      sound.playClick();
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      sound.playClick();
      setCurrentIndex((prev) => prev - 1);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={lessonTitle} maxWidth="lg">
      <div className="flex flex-col gap-4">
        {/* Nội dung thẻ truyện hiện tại */}
        <div className="bg-white rounded-[18px] border-2 border-[#E9E4FF] p-5 shadow-sticker-sm">
          <div className="flex items-start gap-4">
            {currentCard.svgIcon && (
              <div className="w-14 h-14 rounded-2xl bg-[#5B3FD6]/10 border border-[#5B3FD6]/20 flex items-center justify-center shrink-0 text-[#5B3FD6]">
                {currentCard.svgIcon}
              </div>
            )}
            <div className="flex-1">
              <h4 className="font-display font-bold text-lg sm:text-xl text-[#5B3FD6] mb-2">
                {currentCard.title}
              </h4>
              <p className="text-[#2A2340] text-sm sm:text-base leading-relaxed max-prose-reading">
                {currentCard.text}
              </p>
            </div>
          </div>

          {/* Ví dụ thực tế trong khung nổi bật */}
          {currentCard.example && (
            <div className="mt-4 p-3.5 rounded-[12px] bg-[#F6F5FB] border-l-4 border-l-[#5B3FD6] border border-[#E3E0EE]">
              <div className="text-xs font-bold text-[#5B3FD6] uppercase tracking-wider mb-1">
                💡 Ví dụ thực tế
              </div>
              <p className="text-xs sm:text-sm text-[#2A2340] leading-normal font-medium">
                {currentCard.example}
              </p>
            </div>
          )}
        </div>

        {/* Thanh điều hướng: Chấm chỉ vị trí & nút bấm */}
        <div className="flex items-center justify-between pt-2">
          {/* Chấm chỉ vị trí */}
          <div className="flex items-center gap-2">
            {cards.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  sound.playClick();
                  setCurrentIndex(i);
                }}
                className={`w-3 h-3 rounded-full transition-all cursor-pointer ${
                  i === currentIndex
                    ? 'bg-[#5B3FD6] scale-125'
                    : 'bg-[#D0CCE0] hover:bg-[#6B6485]'
                }`}
                aria-label={`Trang ${i + 1} trên ${cards.length}`}
              />
            ))}
          </div>

          {/* Nút hành động */}
          <div className="flex items-center gap-2">
            {currentIndex > 0 && (
              <Button variant="secondary" size="sm" onClick={handlePrev}>
                Quay lại
              </Button>
            )}
            <Button
              variant={isLast ? 'primary' : 'purple'}
              size="sm"
              onClick={handleNext}
            >
              {isLast ? 'Mình hiểu rồi' : 'Tiếp tục'}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
