import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AssetImage } from '../assets/AssetImage';
import { asset, useManifest } from '../assets/store';
import { fmt } from '../content/characters';
import { ui } from '../content/ui';
import { Button } from './Button';
import { Panel } from './Panel';
import { PortraitFrame } from './PortraitFrame';

/** Một lượt của hộp thoại. Chữ trong `text`, `speaker` đã đi qua fmt() ở nơi gọi. */
export interface VnTurn {
  /** Tên người nói (hiện trên khung lời). Truyện kể thì bỏ trống. */
  speaker?: string;
  /** Chân dung lớn của người nói: tên file trong ui/portraits, ví dụ "bac-an". */
  portrait?: string;
  /** Ảnh minh họa phần trên (đường dẫn trong manifest, không đuôi). Có ảnh thì ưu tiên hơn chân dung. */
  image?: string;
  /** Lời. */
  text: string;
  /** Chân dung phụ kèm một câu ngắn, ví dụ {phanDien} cười "Hì hì!" */
  aside?: { portrait: string; speaker: string; text: string };
  /** Nội dung thêm dưới lời (ví dụ danh sách nhiệm vụ của làng). */
  extra?: ReactNode;
  /** Ảnh nền riêng cho lượt này (ghi đè `background` của hộp). */
  background?: string;
}

export interface VnDialogProps {
  turns: VnTurn[];
  /** Bấm nút ở lượt cuối. */
  onFinish: () => void;
  /** "Bỏ qua" (hoặc Esc). Không có thì gọi onFinish. */
  onSkip?: () => void;
  /** Tên nút ở lượt cuối; không có thì vẫn là "Tiếp ›". */
  finishLabel?: string;
  /**
   * Ảnh nền (đường dẫn trong manifest) làm mờ, tối nhẹ, phủ cả màn hình. Truyền vào (kể cả chuỗi rỗng "")
   * hoặc đặt `overlay` thì hộp nằm giữa màn hình; không thì hộp nằm ngay trong trang (nền là cảnh sẵn có).
   */
  background?: string;
  overlay?: boolean;
  /** Nhãn đọc cho người dùng đọc màn hình khi lượt không có tên người nói. */
  label?: string;
  /** Báo lượt hiện tại (đếm từ 0). */
  onTurnChange?: (index: number) => void;
  className?: string;
}

/** Phím tắt Enter/Space chỉ xử lý khi focus không nằm trên một điều khiển khác (nút tự xử lý). */
function isInteractive(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest('button, a, input, textarea, select, [role="button"]') !== null;
}
function isTyping(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest('input, textarea, select, [contenteditable="true"]') !== null;
}

const WIDE = '(min-width: 640px)';
function useWide(): boolean {
  const [wide, setWide] = useState(() => typeof window !== 'undefined' && window.matchMedia(WIDE).matches);
  useEffect(() => {
    const mq = window.matchMedia(WIDE);
    const on = () => setWide(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return wide;
}

/** Cỡ chân dung lớn: từ 160px trên máy tính, từ 112px trên điện thoại. */
export const PORTRAIT_SIZE_WIDE = 176;
export const PORTRAIT_SIZE_NARROW = 120;

const smallBtn =
  'inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-nut border-2 border-nau-go bg-giay/90 px-3 font-display text-base font-extrabold text-chu shadow-[0_2px_0_0_var(--color-nau-go)] focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-muc-tim disabled:cursor-not-allowed disabled:opacity-40';

/**
 * Hộp thoại kiểu visual novel dùng cho cả game (spec 03 mục 1): phần trên là ảnh minh họa hoặc chân dung lớn,
 * phần dưới là khung lời có tên người nói. Góc dưới trái "x/n", góc dưới phải "Tiếp ›"; góc trên có "‹" và "Bỏ qua".
 * Phím: → / Enter / Space tiếp, ← lùi, Esc bỏ qua.
 */
export function VnDialog({ turns, onFinish, onSkip, finishLabel, background, overlay, label, onTurnChange, className = '' }: VnDialogProps) {
  const [index, setIndex] = useState(0);
  const wide = useWide();
  const manifest = useManifest();
  const nextRef = useRef<HTMLButtonElement>(null);
  const handlers = useRef({ next: () => {}, back: () => {}, skip: () => {} });

  const last = turns.length - 1;
  const turn = turns[Math.min(index, Math.max(last, 0))];
  const isLast = index >= last;
  const asOverlay = overlay ?? background !== undefined;

  handlers.current = {
    next: () => (isLast ? onFinish() : setIndex((i) => i + 1)),
    back: () => setIndex((i) => Math.max(0, i - 1)),
    skip: () => (onSkip ?? onFinish)(),
  };

  // Mỗi lượt mới: đưa focus vào nút "Tiếp" để Enter/Space dùng được ngay; báo cho nơi gọi.
  useEffect(() => {
    nextRef.current?.focus({ preventScroll: true });
    onTurnChange?.(index);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  // Tải trước ảnh của lượt kế tiếp (ảnh truyện và ảnh nền).
  useEffect(() => {
    const nextTurn = turns[index + 1];
    for (const path of [nextTurn?.image, nextTurn?.background]) {
      const url = path ? asset(path) : null;
      if (url) new Image().src = url;
    }
  }, [index, turns, manifest]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey || isTyping(e.target)) return;
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        handlers.current.next();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlers.current.back();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handlers.current.skip();
      } else if ((e.key === 'Enter' || e.key === ' ') && !isInteractive(e.target)) {
        e.preventDefault();
        handlers.current.next();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (!turn) return null;

  const bgPath = turn.background ?? background;
  const bgUrl = bgPath ? asset(bgPath) : null;
  const size = wide ? PORTRAIT_SIZE_WIDE : PORTRAIT_SIZE_NARROW;
  const heading = turn.speaker ?? label ?? '';

  const box = (
    <Panel
      padded={false}
      role={asOverlay ? 'dialog' : 'region'}
      aria-modal={asOverlay ? true : undefined}
      aria-label={heading}
      className={['relative w-full max-w-[960px] overflow-hidden', className].join(' ')}
    >
      {/* Phần trên: ảnh minh họa hoặc chân dung lớn */}
      <div key={`m${index}`} className="animate-vn-in relative">
        {turn.image ? (
          <div className="aspect-video max-h-[56vh] w-full overflow-hidden border-b-4 border-nau-go bg-giay">
            <AssetImage path={turn.image} alt={ui.vn.anhNhan} className="size-full object-cover" />
          </div>
        ) : turn.portrait ? (
          <div className="grid place-items-center border-b-4 border-nau-go bg-gradient-to-b from-muc-tim/15 to-giay/0 px-4 pb-4 pt-12 sm:pt-10">
            <PortraitFrame portrait={turn.portrait} size={size} />
          </div>
        ) : (
          <div className="h-12" />
        )}
        <button
          type="button"
          onClick={() => handlers.current.back()}
          disabled={index === 0}
          aria-label={ui.vn.luiNhan}
          className={`${smallBtn} absolute left-2 top-2`}
        >
          {ui.vn.lui}
        </button>
        <button type="button" onClick={() => handlers.current.skip()} className={`${smallBtn} absolute right-2 top-2 text-sm`}>
          {ui.vn.boQua}
        </button>
      </div>

      {/* Khung lời */}
      <div key={`t${index}`} className="animate-vn-in px-4 pb-2 pt-4 sm:px-8">
        {turn.speaker && <p className="font-display text-xl font-extrabold text-nau-go-dam">{turn.speaker}</p>}
        <p aria-live="polite" className="mt-1 min-h-[3.5rem] text-base leading-relaxed sm:text-lg">
          {turn.text}
        </p>
        {turn.aside && (
          <div className="mt-3 flex items-center gap-3" aria-live="polite">
            <PortraitFrame portrait={turn.aside.portrait} size={56} />
            <p className="rounded-2xl border-2 border-nau-go bg-white/70 px-3 py-1.5 font-display text-lg font-extrabold">
              <span className="sr-only">{turn.aside.speaker}: </span>
              {turn.aside.text}
            </p>
          </div>
        )}
        {turn.extra && <div className="mt-3">{turn.extra}</div>}
      </div>

      {/* Chân hộp: tiến trình bên trái, nút Tiếp bên phải */}
      <div className="flex items-center justify-between gap-3 px-4 pb-4 pt-2 sm:px-8">
        <span
          className="font-display text-base font-extrabold text-nau-go-dam"
          aria-label={fmt(ui.vn.tienTrinhNhan, { x: index + 1, n: turns.length })}
        >
          {fmt(ui.vn.tienTrinh, { x: index + 1, n: turns.length })}
        </span>
        <Button ref={nextRef} onClick={() => handlers.current.next()}>
          {isLast && finishLabel ? finishLabel : ui.vn.tiep}
        </Button>
      </div>
    </Panel>
  );

  if (!asOverlay) return box;

  return (
    <div className="fixed inset-0 z-40 grid place-items-center overflow-y-auto p-3 sm:p-6">
      {/* Nền: ảnh làm mờ, tối nhẹ */}
      <div aria-hidden="true" className="fixed inset-0 -z-10 overflow-hidden bg-chu">
        {bgUrl && (
          <div
            className="absolute inset-[-24px] scale-105 bg-cover bg-center opacity-90 blur-xl"
            style={{ backgroundImage: `url("${bgUrl}")` }}
          />
        )}
        <div className="absolute inset-0 bg-chu/45" />
      </div>
      {box}
    </div>
  );
}
