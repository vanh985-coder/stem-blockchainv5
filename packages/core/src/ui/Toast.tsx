import { useEffect } from 'react';

export interface ToastProps {
  message: string;
  type?: 'info' | 'success' | 'warning';
  duration?: number;
  onClose: () => void;
}

const TONE = {
  info: 'bg-muc-tim text-white',
  success: 'bg-xanh-la-dam text-white',
  warning: 'bg-vang text-chu',
} as const;

/** Thông báo nổi ở góc dưới, tự tắt sau `duration` mili giây. */
export function Toast({ message, type = 'info', duration = 3000, onClose }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(onClose, duration);
    return () => clearTimeout(t);
  }, [duration, onClose]);

  return (
    <div role="status" className="pointer-events-none fixed bottom-6 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2">
      <div className={`pointer-events-auto flex animate-toast-pop items-center gap-2 rounded-nut px-4 py-3 font-display text-base font-bold shadow-lg ${TONE[type]}`}>
        {message}
      </div>
    </div>
  );
}
