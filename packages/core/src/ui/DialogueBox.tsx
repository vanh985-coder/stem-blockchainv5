import { useEffect, useRef, useState } from 'react';
import { CHARACTERS, fmt, speakerLabel, type CharacterId, type FmtVars } from '../content/characters';
import { ui } from '../content/ui';
import { Button } from './Button';
import { Panel } from './Panel';
import { PortraitFrame } from './PortraitFrame';

export interface DialogueTurn {
  characterId: CharacterId;
  /** Lời thoại; đi qua fmt() nên được dùng {ten}, {phanDien}… */
  text: string;
  /** Chân dung phụ kèm một câu ngắn, ví dụ {phanDien} cười "Hì hì!" */
  aside?: { characterId: CharacterId; text: string };
}

export interface DialogueBoxProps {
  turns: DialogueTurn[];
  /** Gọi khi bấm "Tiếp" ở lượt cuối */
  onFinish: () => void;
  /** Gọi khi bấm "Bỏ qua"; không có thì gọi onFinish */
  onSkip?: () => void;
  /** Biến cho fmt(), ví dụ { ten: 'Lan' } */
  vars?: FmtVars;
  className?: string;
}

/** Phím tắt chỉ xử lý khi focus không nằm trên một điều khiển khác (nút tự xử lý Enter/Space). */
function isInteractive(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest('button, a, input, textarea, select, [role="button"]') !== null;
}

/** Hộp thoại có chân dung: nhiều lượt nói, nút "Tiếp" (Enter hoặc Space) và "Bỏ qua". */
export function DialogueBox({ turns, onFinish, onSkip, vars, className = '' }: DialogueBoxProps) {
  const [index, setIndex] = useState(0);
  const nextRef = useRef<HTMLButtonElement>(null);
  const turn = turns[index];

  const next = () => {
    if (index >= turns.length - 1) onFinish();
    else setIndex(index + 1);
  };

  // Mỗi lượt mới: đưa focus vào nút "Tiếp" để Enter/Space dùng được ngay.
  useEffect(() => {
    nextRef.current?.focus({ preventScroll: true });
  }, [index]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || (e.key !== 'Enter' && e.key !== ' ')) return;
      if (isInteractive(e.target)) return;
      e.preventDefault();
      next();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (!turn) return null;
  const info = CHARACTERS[turn.characterId];

  return (
    <Panel className={['w-full max-w-2xl', className].join(' ')} role="region" aria-label={speakerLabel(turn.characterId, vars)}>
      <div className="flex items-start gap-3 sm:gap-4">
        <PortraitFrame portrait={info.portrait} size={88} />
        <div className="min-w-0 flex-1">
          <p className="font-display text-xl font-extrabold text-nau-go">{speakerLabel(turn.characterId, vars)}</p>
          <p aria-live="polite" className="mt-1 text-base leading-relaxed sm:text-lg">
            {fmt(turn.text, vars)}
          </p>
          {turn.aside && (
            <div className="mt-3 flex items-center gap-2" aria-live="polite">
              <PortraitFrame portrait={CHARACTERS[turn.aside.characterId].portrait} size={56} />
              <p className="rounded-2xl border-2 border-nau-go bg-white/70 px-3 py-1.5 font-display text-lg font-extrabold">
                <span className="sr-only">{speakerLabel(turn.aside.characterId, vars)}: </span>
                {fmt(turn.aside.text, vars)}
              </p>
            </div>
          )}
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-end gap-3">
        <Button variant="secondary" size="sm" onClick={onSkip ?? onFinish}>
          {ui.chung.boQua}
        </Button>
        <Button ref={nextRef} onClick={next}>
          {ui.chung.tiep}
        </Button>
      </div>
    </Panel>
  );
}
