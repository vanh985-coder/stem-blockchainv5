import React, { useEffect } from 'react';
import { LazyMotion, domAnimation, m } from 'motion/react';

export interface BottomSheetProps {
  isOpen: boolean;
  onClose?: () => void;
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'error';
  className?: string;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  children,
  variant = 'default',
  className = '',
}) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const variantStyles = {
    default: 'bg-white border-t-2 border-x-2 border-[#E3E0EE]',
    success: 'bg-[#F0FDF4] border-t-4 border-x-2 border-[#1FAF5A]',
    error: 'bg-[#FEF2F2] border-t-4 border-x-2 border-[#E5484D]',
  };

  return (
    <div className="fixed inset-0 z-50 pointer-events-none flex flex-col justify-end">
      {/* Backdrop mờ nhẹ */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/20 pointer-events-auto transition-opacity"
      />

      <LazyMotion features={domAnimation}>
        <m.div
          initial={{ y: '100%' }}
          animate={{ y: '0%' }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className={`
            relative w-full max-w-2xl mx-auto rounded-t-[24px] shadow-sticker-lg p-5 sm:p-6
            pointer-events-auto z-10 ${variantStyles[variant]} ${className}
          `}
        >
          {/* Thanh kéo nhỏ ở đỉnh */}
          <div className="w-12 h-1.5 bg-[#D0CCE0] rounded-full mx-auto mb-3" />
          {children}
        </m.div>
      </LazyMotion>
    </div>
  );
};
