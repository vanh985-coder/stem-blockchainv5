import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Mascot } from '../components/ui/Mascot';
import { useProgress } from '../app/ProgressContext';
import { formatNumber } from '../lib/format';

export const Summary: React.FC = () => {
  const navigate = useNavigate();
  const { progress } = useProgress();

  return (
    <div className="min-h-screen bg-[#F6F5FB] flex flex-col">
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b-2 border-[#E3E0EE] px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="w-10 h-10 rounded-full bg-[#F6F5FB] border border-[#E3E0EE] hover:bg-[#E9E4FF] text-[#2A2340] flex items-center justify-center font-bold cursor-pointer"
            aria-label="Quay lại trang chủ"
          >
            ←
          </button>
          <h1 className="font-display font-black text-xl text-[#2A2340]">
            Tổng kết khóa học
          </h1>
          <div className="w-10" />
        </div>
      </header>

      <main className="flex-1 max-w-xl mx-auto w-full p-6 flex flex-col justify-center">
        <Card variant="paper" className="p-8 text-center space-y-6">
          <div className="flex justify-center">
            <Mascot mood="an_mung" size="lg" />
          </div>

          <h2 className="font-display font-black text-3xl text-[#5B3FD6]">
            Chúc mừng {progress.userName || 'em'}!
          </h2>

          <div className="p-4 bg-white rounded-[16px] border border-[#E3E0EE]">
            <span className="text-xs font-semibold text-[#6B6485] uppercase tracking-wider block mb-1">
              Tổng kinh nghiệm tích lũy
            </span>
            <span className="font-display font-black text-3xl text-[#1FAF5A]">
              ⭐ {formatNumber(progress.totalXp)} XP
            </span>
          </div>

          <div className="p-4 bg-[#F6F5FB] rounded-[16px] text-sm text-[#6B6485] leading-relaxed">
            🚧 Trang Tổng kết chi tiết & Chứng nhận tốt nghiệp hoàn chỉnh sẽ được mở ở Prompt 7 sau khi hoàn thành 5 bài học!
          </div>

          <div className="pt-2">
            <Button variant="primary" size="md" onClick={() => navigate('/')}>
              Về trang chủ
            </Button>
          </div>
        </Card>
      </main>
    </div>
  );
};
