import { useEffect, type ReactNode } from 'react';
import { sound } from '../audio/sound';
import { ui } from '../content/ui';
import { Panel } from './Panel';

export interface ModalProps {
  isOpen: boolean;
  onClose?: () => void;
  title?: string;
  children: ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
  showCloseButton?: boolean;
}

const MAX_WIDTH = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg', xl: 'max-w-xl' } as const;

/** Hộp thoại giữa màn hình: Esc hoặc nút ✕ để đóng; nền mờ phía sau. */
export function Modal({ isOpen, onClose, title, children, maxWidth = 'md', showCloseButton = true }: ModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) {
        sound.playClick();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-chu/50 p-4">
      <Panel
        role="dialog"
        aria-modal="true"
        aria-label={title || ui.hopThoai.macDinh}
        className={`relative w-full ${MAX_WIDTH[maxWidth]} max-h-[92vh] overflow-y-auto`}
      >
        <div className="flex items-center justify-between gap-3 border-b-2 border-nau-go/30 pb-3">
          {title ? <h3 className="text-xl">{title}</h3> : <div />}
          {showCloseButton && onClose && (
            <button
              type="button"
              onClick={() => {
                sound.playClick();
                onClose();
              }}
              className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-full border-2 border-nau-go bg-giay text-lg focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-muc-tim"
              aria-label={ui.hopThoai.dong}
            >
              <span aria-hidden="true">✕</span>
            </button>
          )}
        </div>
        <div className="mt-4">{children}</div>
      </Panel>
    </div>
  );
}
