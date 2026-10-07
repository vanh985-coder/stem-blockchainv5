import React, { useEffect } from 'react';

export interface ToastProps {
  message: string;
  type?: 'info' | 'success' | 'warning';
  duration?: number;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({
  message,
  type = 'info',
  duration = 3000,
  onClose,
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const typeStyles = {
    info: 'bg-[#5B3FD6] text-white',
    success: 'bg-[#1FAF5A] text-white',
    warning: 'bg-[#FFC21A] text-[#2A2340]',
  }[type];

  return (
    <div className="fixed bottom-6 right-6 z-50 pointer-events-none">
      <div
        className={`
          pointer-events-auto px-4 py-2.5 rounded-[14px] shadow-sticker-lg font-display font-bold text-sm
          flex items-center gap-2 ${typeStyles} animate-toast-pop
        `}
      >
        {message}
      </div>
    </div>
  );
};
