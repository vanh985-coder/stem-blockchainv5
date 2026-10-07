import React, { useEffect } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Stars } from '../ui/Stars';
import { Mascot } from '../ui/Mascot';
import { sound } from '../../lib/sound';
import { formatTime, formatXP } from '../../lib/format';

export interface LevelCompleteProps {
  stars: number; // 1..3
  xpGained: number;
  timeSpentSec?: number;
  keyTakeaway: string; // "Điều em vừa học"
  reflectionQuestion?: {
    question: string;
    options?: string[];
  };
  onPlayAgain: () => void;
  onNextLevel: () => void;
  hasNextLevel?: boolean;
  nextLabel?: string;
  nextLessonUrl?: string;
}

export const LevelComplete: React.FC<LevelCompleteProps> = ({
  stars,
  xpGained,
  timeSpentSec,
  keyTakeaway,
  reflectionQuestion,
  onPlayAgain,
  onNextLevel,
  hasNextLevel = true,
  nextLabel,
  nextLessonUrl,
}) => {
  // Hiệu ứng pháo giấy canvas-confetti import động và âm thanh chúc mừng
  useEffect(() => {
    sound.playLevelComplete();

    let isMounted = true;
    import('canvas-confetti')
      .then((confettiModule) => {
        if (!isMounted) return;
        const confetti = confettiModule.default;
        // Bắn pháo giấy chúc mừng rực rỡ
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#5B3FD6', '#1FAF5A', '#FFC21A', '#2E90E8', '#E5484D'],
        });
      })
      .catch((err) => {
        console.warn('Không thể nạp canvas-confetti:', err);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="max-w-xl mx-auto w-full px-4 py-8 animate-in fade-in zoom-in-95 duration-300">
      <Card variant="paper" className="p-6 sm:p-8 text-center relative overflow-hidden">
        {/* Linh vật ăn mừng */}
        <div className="flex justify-center mb-4">
          <Mascot mood="an_mung" size="lg" />
        </div>

        {/* Tiêu đề ăn mừng */}
        <h2 className="font-display font-black text-3xl text-[#5B3FD6] mb-2">
          Hoàn thành xuất sắc!
        </h2>
        <p className="text-sm text-[#6B6485] mb-6">
          Em đã vượt qua thử thách này một cách tuyệt vời!
        </p>

        {/* Số sao đạt được */}
        <div className="flex justify-center mb-4">
          <Stars earned={stars} max={3} size="lg" />
        </div>

        {/* Thống kê XP và Thời gian */}
        <div className="grid grid-cols-2 gap-4 my-6">
          <div className="p-4 rounded-[16px] bg-white border-2 border-[#E3E0EE] shadow-sticker-sm">
            <span className="text-xs font-semibold text-[#6B6485] uppercase tracking-wider block mb-1">
              Kinh nghiệm
            </span>
            <span className="font-display font-extrabold text-2xl text-[#1FAF5A]">
              {formatXP(xpGained)}
            </span>
          </div>

          <div className="p-4 rounded-[16px] bg-white border-2 border-[#E3E0EE] shadow-sticker-sm">
            <span className="text-xs font-semibold text-[#6B6485] uppercase tracking-wider block mb-1">
              Thời gian hoàn thành
            </span>
            <span className="font-display font-extrabold text-2xl text-[#2A2340]">
              {timeSpentSec !== undefined ? formatTime(timeSpentSec) : '--:--'}
            </span>
          </div>
        </div>

        {/* Hộp "Điều em vừa học" */}
        <div className="p-4 rounded-[16px] bg-white border-2 border-[#5B3FD6]/30 text-left mb-6 shadow-sticker-sm">
          <div className="text-xs font-bold text-[#5B3FD6] uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <span>✨</span> Điều em vừa học
          </div>
          <p className="text-sm sm:text-base text-[#2A2340] font-semibold leading-relaxed">
            {keyTakeaway}
          </p>
        </div>

        {/* Câu hỏi suy ngẫm (nếu có, không tính điểm) */}
        {reflectionQuestion && (
          <div className="p-4 rounded-[16px] bg-[#F6F5FB] border border-[#E3E0EE] text-left mb-6">
            <div className="text-xs font-bold text-[#6B6485] uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <span>💭</span> Câu hỏi suy ngẫm
            </div>
            <p className="text-xs sm:text-sm text-[#2A2340] mb-3">
              {reflectionQuestion.question}
            </p>
            {reflectionQuestion.options && (
              <div className="space-y-2">
                {reflectionQuestion.options.map((opt, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => sound.playClick()}
                    className="w-full text-left p-2.5 rounded-[10px] bg-white border border-[#E3E0EE] text-xs font-medium hover:border-[#5B3FD6] transition-colors focus-visible:outline-2 focus-visible:outline-[#5B3FD6]"
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Nút hành động */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Button variant="secondary" size="md" onClick={onPlayAgain} fullWidth className="sm:w-auto">
            Chơi lại
          </Button>
          {hasNextLevel ? (
            <Button variant="primary" size="md" onClick={onNextLevel} fullWidth className="sm:w-auto">
              {nextLabel || 'Màn tiếp theo'}
            </Button>
          ) : (
            <Button
              variant="primary"
              size="md"
              onClick={() => {
                if (onNextLevel) onNextLevel();
                window.location.hash = nextLessonUrl || '#/lesson/2';
              }}
              fullWidth
              className="sm:w-auto"
            >
              {nextLabel || 'Sang Bài 2'}
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
};
