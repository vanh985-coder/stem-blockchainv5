import React, { useEffect, useRef } from 'react';
import { sound } from '../../lib/sound';

export interface ModalProps {
  isOpen: boolean;
  onClose?: () => void;
  title?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
  showCloseButton?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'md',
  showCloseButton = true,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) {
        sound.playClick();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthClass = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  }[maxWidth];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title || 'Hộp thoại'}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2A2340]/60 backdrop-blur-sm"
    >
      <div
        ref={modalRef}
        className={`
          relative w-full ${maxWidthClass} bg-white rounded-[24px] border-2 border-[#E3E0EE]
          shadow-sticker-lg p-6 sm:p-7 overflow-hidden z-10 animate-modal-pop
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#E9E4FF]">
          {title ? (
            <h3 className="font-display font-bold text-xl text-[#2A2340]">{title}</h3>
          ) : (
            <div />
          )}
          {showCloseButton && onClose && (
            <button
              type="button"
              onClick={() => {
                sound.playClick();
                onClose();
              }}
              className="w-10 h-10 rounded-full bg-[#F6F5FB] border border-[#E3E0EE] text-[#6B6485] hover:text-[#2A2340] hover:bg-[#E9E4FF] flex items-center justify-center transition-colors focus-visible:outline-3 focus-visible:outline-[#5B3FD6]"
              aria-label="Đóng hộp thoại"
            >
              ✕
            </button>
          )}
        </div>

        {/* Body */}
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
};
