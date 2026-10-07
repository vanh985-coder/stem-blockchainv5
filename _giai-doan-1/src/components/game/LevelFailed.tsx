import React, { useEffect } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Mascot } from '../ui/Mascot';
import { sound } from '../../lib/sound';

export interface LevelFailedProps {
  tip: string;
  onRetry: () => void;
  onExit?: () => void;
}

export const LevelFailed: React.FC<LevelFailedProps> = ({
  tip,
  onRetry,
  onExit,
}) => {
  useEffect(() => {
    sound.playWrong();
  }, []);

  return (
    <div className="max-w-md mx-auto w-full px-4 py-8 animate-in fade-in zoom-in-95 duration-200">
      <Card variant="paper" className="p-6 sm:p-8 text-center relative overflow-hidden">
        {/* Linh vật Bi buồn */}
        <div className="flex justify-center mb-4">
          <Mascot mood="buon" size="lg" />
        </div>

        {/* Tiêu đề hết tim */}
        <h2 className="font-display font-black text-2xl sm:text-3xl text-[#E5484D] mb-2">
          Hết tim mất rồi!
        </h2>
        <p className="text-sm text-[#6B6485] mb-6">
          Đừng nản lòng nhé, mỗi lần thử là một lần hiểu sâu hơn về blockchain!
        </p>

        {/* Hộp mẹo giải quyết */}
        <div className="p-4 rounded-[16px] bg-[#FFF0ED] border-2 border-[#E5484D]/30 text-left mb-6 shadow-sticker-sm">
          <div className="text-xs font-bold text-[#E5484D] uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <span>💡</span> Mẹo cho lượt chơi sau
          </div>
          <p className="text-sm text-[#2A2340] leading-relaxed font-medium">
            {tip}
          </p>
        </div>

        {/* Nút hành động */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          {onExit && (
            <Button variant="secondary" size="md" onClick={onExit} fullWidth className="sm:w-auto">
              Thoát
            </Button>
          )}
          <Button variant="danger" size="md" onClick={onRetry} fullWidth className="sm:w-auto">
            Thử lại
          </Button>
        </div>
      </Card>
    </div>
  );
};
