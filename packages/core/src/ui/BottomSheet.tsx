import { useEffect, type ReactNode } from 'react';
import { LazyMotion, domAnimation, m } from 'motion/react';
import { useSettings } from '../settings/SettingsProvider';

export interface BottomSheetProps {
  isOpen: boolean;
  onClose?: () => void;
  children: ReactNode;
  variant?: 'default' | 'success' | 'error';
  className?: string;
}

const VARIANT = {
  default: 'bg-giay border-nau-go',
  success: 'bg-giay border-xanh-la',
  error: 'bg-giay border-do-son',
} as const;

/** Tấm trượt từ dưới lên. Bật "Giảm chuyển động" thì hiện ngay, không trượt. */
export function BottomSheet({ isOpen, onClose, children, variant = 'default', className = '' }: BottomSheetProps) {
  const { settings } = useSettings();

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex flex-col justify-end">
      <div onClick={onClose} className="pointer-events-auto fixed inset-0 bg-chu/30" />
      <LazyMotion features={domAnimation}>
        <m.div
          initial={settings.reducedMotion ? false : { y: '100%' }}
          animate={{ y: '0%' }}
          transition={settings.reducedMotion ? { duration: 0 } : { type: 'spring', damping: 25, stiffness: 300 }}
          className={[
            'pointer-events-auto relative z-10 mx-auto w-full max-w-2xl rounded-t-3xl border-x-4 border-t-4 p-5 sm:p-6',
            'shadow-[0_-4px_0_0_rgba(59,42,32,0.15)]',
            VARIANT[variant],
            className,
          ].join(' ')}
        >
          <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-nau-go/40" />
          {children}
        </m.div>
      </LazyMotion>
    </div>
  );
}
