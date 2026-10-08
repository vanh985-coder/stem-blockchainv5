export interface ProgressBarProps {
  current: number;
  max: number;
  className?: string;
}

/** Thanh tiến độ nhỏ (ví dụ câu hỏi thứ mấy trong bài). Số bước có trong thuộc tính ARIA, không chỉ dựa vào màu. */
export function ProgressBar({ current, max, className = '' }: ProgressBarProps) {
  const percentage = max > 0 ? Math.min(100, Math.max(0, (current / max) * 100)) : 0;
  return (
    <div
      role="progressbar"
      aria-valuenow={current}
      aria-valuemin={0}
      aria-valuemax={max}
      className={`h-4 w-full overflow-hidden rounded-full border-2 border-nau-go/40 bg-giay p-0.5 ${className}`}
    >
      <div style={{ width: `${percentage}%` }} className="relative h-full overflow-hidden rounded-full bg-xanh-la transition-all duration-300 ease-out">
        <div className="absolute inset-x-0 top-0 h-[40%] rounded-t-full bg-white/30" />
      </div>
    </div>
  );
}
