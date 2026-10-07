import React from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Mascot, MascotMood } from '../ui/Mascot';

export interface LevelIntroProps {
  title: string;
  objective: string;
  mascotMood?: MascotMood;
  tip?: string;
  onStart: () => void;
  startLabel?: string;
  lessonName?: string;
  difficultyLabel?: string;
}

export const LevelIntro: React.FC<LevelIntroProps> = ({
  title,
  objective,
  mascotMood = 'vui',
  tip,
  onStart,
  startLabel = 'Bắt đầu',
  lessonName,
  difficultyLabel,
}) => {
  return (
    <div className="max-w-xl mx-auto w-full px-4 py-8 animate-in fade-in zoom-in-95 duration-200">
      <Card variant="paper" className="p-6 sm:p-8 relative overflow-hidden">
        {/* Nhãn bài & độ khó */}
        <div className="flex items-center gap-2 mb-4">
          {lessonName && (
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#5B3FD6]/10 text-[#5B3FD6]">
              {lessonName}
            </span>
          )}
          {difficultyLabel && (
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-white border border-[#E3E0EE] text-[#6B6485]">
              Mức: {difficultyLabel}
            </span>
          )}
        </div>

        {/* Tiêu đề thử thách */}
        <h2 className="font-display font-black text-2xl sm:text-3xl text-[#2A2340] mb-4">
          {title}
        </h2>

        {/* Khu vực linh vật Bi cùng mục tiêu */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 my-6 bg-white/80 p-5 rounded-[16px] border border-[#E3E0EE]">
          <Mascot mood={mascotMood} size="lg" className="shrink-0" />

          <div className="flex-1 space-y-2 text-center sm:text-left">
            <h4 className="font-display font-bold text-lg text-[#5B3FD6]">
              Mục tiêu của em:
            </h4>
            <p className="text-[#2A2340] text-base sm:text-lg leading-relaxed max-prose-reading font-medium">
              {objective}
            </p>
          </div>
        </div>

        {/* Mẹo nhỏ nếu có */}
        {tip && (
          <div className="p-3.5 rounded-[12px] bg-[#FFC21A]/10 border border-[#FFC21A]/30 text-xs sm:text-sm text-[#2A2340] mb-6 flex items-start gap-2">
            <span className="text-base leading-none">💡</span>
            <p className="leading-snug">
              <span className="font-bold text-[#D9A000]">Mẹo từ Bi: </span>
              {tip}
            </p>
          </div>
        )}

        {/* Nút Bắt đầu */}
        <div className="mt-6 flex justify-center sm:justify-end">
          <Button variant="primary" size="lg" onClick={onStart} fullWidth className="sm:w-auto">
            {startLabel}
          </Button>
        </div>
      </Card>
    </div>
  );
};
