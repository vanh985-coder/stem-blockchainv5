import React from 'react';

export interface ProgressBarProps {
  current: number;
  max: number;
  className?: string;
  color?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  current,
  max,
  className = '',
  color = '#1FAF5A', // xanh-dung
}) => {
  const percentage = max > 0 ? Math.min(100, Math.max(0, (current / max) * 100)) : 0;

  return (
    <div
      role="progressbar"
      aria-valuenow={current}
      aria-valuemin={0}
      aria-valuemax={max}
      className={`w-full bg-[#E9E4FF] h-4 rounded-full p-0.5 border border-[#D5CBFF] overflow-hidden ${className}`}
    >
      <div
        style={{
          width: `${percentage}%`,
          backgroundColor: color,
        }}
        className="h-full rounded-full transition-all duration-300 ease-out relative overflow-hidden"
      >
        {/* Vệt sáng nhẹ tạo độ bóng 3D trên thanh */}
        <div className="absolute top-0 left-0 right-0 h-[40%] bg-white/30 rounded-t-full" />
      </div>
    </div>
  );
};
