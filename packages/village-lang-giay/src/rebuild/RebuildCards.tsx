import { memo, useCallback, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent as ReactPointerEvent, type RefObject } from 'react';
import { fmt, rebuildUi } from '@so-chung/core';
import { AREAS, GAP_CQW, cardHeight, slotLeft } from './rebuildLayout';
import type { Card } from './rebuildLogic';

/** Nhãn đọc của một thẻ cho người dùng đọc màn hình. */
export const cardLabel = (c: Pick<Card, 'prev' | 'content' | 'code'>): string => fmt(rebuildUi.theNhan, { truoc: c.prev, noidung: c.content, ma: c.code });

export type CardMood = 'normal' | 'selected' | 'shake' | 'new' | 'snap';

const MOOD_CLASS: Record<CardMood, string> = {
  normal: 'border-nau-go',
  selected: 'border-muc-tim ring-[0.5cqw] ring-muc-tim/60 -translate-y-[0.8cqw]',
  shake: 'border-do-son animate-shake',
  new: 'border-vang animate-chain-snap',
  snap: 'border-xanh-la animate-chain-snap',
};

/**
 * Một thẻ trang bằng giấy dó, ba dòng từ trên xuống: mã trang trước · nội dung · mã trang (khớp dòng chú thích "Mỗi thẻ ghi: ..."). Cỡ chữ theo bề rộng thẻ (cqw),
 * nên thẻ co giãn cùng khung. Không có chữ tiếng Việt viết thẳng: nhãn đọc lấy từ `rebuildUi`.
 */
export function CardFace({ card, width, mood = 'normal', className = '', style }: { card: Pick<Card, 'prev' | 'content' | 'code'>; width: number; mood?: CardMood; className?: string; style?: CSSProperties }) {
  const h = cardHeight(width);
  return (
    <div
      className={`relative flex select-none flex-col items-center justify-between overflow-hidden rounded-[0.9cqw] border-[0.3cqw] bg-giay py-[0.5cqw] text-chu shadow-md transition-transform duration-150 ${MOOD_CLASS[mood]} ${className}`}
      style={{ width: `${width}cqw`, height: `${h}cqw`, ...style }}
    >
      <span className="font-bold text-nau-go-dam" style={{ fontSize: `${width * 0.27}cqw`, lineHeight: 1 }} data-part="truoc">
        {card.prev}
      </span>
      <span className="font-display font-extrabold" style={{ fontSize: `${width * 0.42}cqw`, lineHeight: 1 }} data-part="noidung">
        {card.content}
      </span>
      <span className="rounded-full bg-muc-tim px-[0.6cqw] font-display font-extrabold text-white" style={{ fontSize: `${width * 0.27}cqw`, lineHeight: 1.35 }} data-part="ma">
        {card.code}
      </span>
    </div>
  );
}

/** Trang bìa (bên trái chuỗi): chữ G và mã G. */
export function CoverFace({ code, width }: { code: number; width: number }) {
  const h = cardHeight(width);
  return (
    <div
      role="img"
      aria-label={fmt(rebuildUi.biaMa, { so: code })}
      className="flex select-none flex-col items-center justify-around rounded-[0.9cqw] border-[0.3cqw] border-muc-tim bg-giay py-[0.5cqw] text-chu shadow-md"
      style={{ width: `${width}cqw`, height: `${h}cqw` }}
      data-testid="trang-bia"
    >
      <span className="font-display font-extrabold text-muc-tim" style={{ fontSize: `${width * 0.4}cqw`, lineHeight: 1 }}>
        G
      </span>
      <span className="rounded-full bg-muc-tim px-[0.6cqw] font-display font-extrabold text-white" style={{ fontSize: `${width * 0.3}cqw`, lineHeight: 1.35 }}>
        {code}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Kéo thả (chuột và ngón tay, qua Pointer Events) hoặc chạm chọn rồi chạm đặt

export type DropTarget = 'chain' | 'basket';

export interface DragGhost {
  id: string;
  /** Góc trên trái của thẻ đang kéo, điểm ảnh, so với khung phủ */
  left: number;
  top: number;
  /** Cỡ thẻ lúc nhấc lên, điểm ảnh */
  width: number;
  height: number;
}

/** Đi quá ngần này điểm ảnh từ chỗ nhấn mới tính là kéo; ngắn hơn là chạm. */
export const DRAG_START_PX = 8;

/** Vùng thả dưới con trỏ (phần tử có `data-drop`), hoặc null. Dùng `elementsFromPoint` nên thẻ đang kéo (pointer-events: none) không che. */
export function dropTargetAt(x: number, y: number, doc: Pick<Document, 'elementsFromPoint'> = document): DropTarget | null {
  for (const el of doc.elementsFromPoint(x, y)) {
    const v = (el as HTMLElement).dataset?.drop;
    if (v === 'chain' || v === 'basket') return v;
  }
  return null;
}

export interface UseCardDragOptions {
  /** Khung phủ (chứa mọi thẻ), để đổi tọa độ chuột sang tọa độ trong khung */
  overlayRef: RefObject<HTMLElement | null>;
  enabled: boolean;
  /** Chạm (không kéo) vào thẻ: chọn hoặc bỏ chọn */
  onTap: (id: string) => void;
  /** Thả thẻ: vào chuỗi, vào rổ, hoặc ra ngoài (null: thẻ về chỗ cũ, không phạt) */
  onDrop: (id: string, target: DropTarget | null) => void;
}

interface Pending {
  id: string;
  pointerId: number;
  startX: number;
  startY: number;
  /** Chỗ nắm trên thẻ, so với góc trên trái */
  offX: number;
  offY: number;
  width: number;
  height: number;
  dragging: boolean;
}

/** Điều khiển kéo thả cho các thẻ ở khay. Mỗi thẻ gắn `bind(id)`; thẻ đang kéo hiện qua `ghost`. */
export function useCardDrag({ overlayRef, enabled, onTap, onDrop }: UseCardDragOptions) {
  const pending = useRef<Pending | null>(null);
  const [ghost, setGhost] = useState<DragGhost | null>(null);
  const [hover, setHover] = useState<DropTarget | null>(null);

  const place = useCallback(
    (p: Pending, clientX: number, clientY: number) => {
      const o = overlayRef.current?.getBoundingClientRect();
      setGhost({ id: p.id, left: clientX - (o?.left ?? 0) - p.offX, top: clientY - (o?.top ?? 0) - p.offY, width: p.width, height: p.height });
    },
    [overlayRef],
  );

  const bind = useCallback(
    (id: string) => ({
      onPointerDown: (e: ReactPointerEvent<HTMLElement>) => {
        if (!enabled || (e.pointerType === 'mouse' && e.button !== 0)) return;
        const r = e.currentTarget.getBoundingClientRect();
        pending.current = { id, pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, offX: e.clientX - r.left, offY: e.clientY - r.top, width: r.width, height: r.height, dragging: false };
        e.currentTarget.setPointerCapture(e.pointerId);
      },
      onPointerMove: (e: ReactPointerEvent<HTMLElement>) => {
        const p = pending.current;
        if (!p || p.pointerId !== e.pointerId) return;
        if (!p.dragging && Math.hypot(e.clientX - p.startX, e.clientY - p.startY) >= DRAG_START_PX) p.dragging = true;
        if (p.dragging) {
          place(p, e.clientX, e.clientY);
          setHover(dropTargetAt(e.clientX, e.clientY));
        }
      },
      onPointerUp: (e: ReactPointerEvent<HTMLElement>) => {
        const p = pending.current;
        if (!p || p.pointerId !== e.pointerId) return;
        pending.current = null;
        setGhost(null);
        setHover(null);
        if (p.dragging) onDrop(p.id, dropTargetAt(e.clientX, e.clientY));
        else onTap(p.id);
      },
      onPointerCancel: (e: ReactPointerEvent<HTMLElement>) => {
        if (pending.current?.pointerId !== e.pointerId) return;
        pending.current = null;
        setGhost(null);
        setHover(null);
      },
    }),
    [enabled, onDrop, onTap, place],
  );

  return { ghost, hover, bind };
}

// ---------------------------------------------------------------------------
// Hàng chuỗi, khay, rổ

const enterOrSpace = (fn: () => void) => (e: KeyboardEvent<HTMLElement>) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    fn();
  }
};

export interface ChainRowProps {
  /** Số ô gồm cả trang bìa */
  slots: number;
  width: number;
  genesis: number;
  chain: readonly Card[];
  /** Ô kế tiếp nhấp nháy khi em đang chọn hoặc kéo một thẻ */
  armed: boolean;
  hover: boolean;
  /** Tăng mỗi lần đặt sai để ô kế tiếp nháy đỏ */
  badFlash: number;
  onActivate: () => void;
  /** Tăng mỗi khi luật sửa trạng thái tại chỗ (mảng `chain` giữ nguyên tham chiếu), để thành phần vẽ lại */
  version: number;
}

/** Hàng chuỗi: trang bìa mã G rồi các ô; cả hàng là vùng thả (`data-drop="chain"`) và bấm được (đặt thẻ đang chọn). */
export const ChainRow = memo(function ChainRow({ slots, width, genesis, chain, armed, hover, badFlash, onActivate, version }: ChainRowProps) {
  void version;
  const h = cardHeight(width);
  const next = chain.length + 1;
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={rebuildUi.chuoi}
      data-drop="chain"
      data-testid="chuoi"
      onClick={onActivate}
      onKeyDown={enterOrSpace(onActivate)}
      className={`absolute rounded-[1cqw] outline-offset-4 ${hover ? 'bg-vang/30' : ''}`}
      style={{ left: `${AREAS.chain.x0 - 1}cqw`, top: `${AREAS.chain.y0}%`, width: `${AREAS.chain.x1 - AREAS.chain.x0 + 2}cqw`, height: `${h + 1}cqw` }}
    >
      {Array.from({ length: slots }).map((_, i) => {
        const left = slotLeft(i, width, AREAS.chain.x0) - (AREAS.chain.x0 - 1);
        const pos: CSSProperties = { position: 'absolute', left: `${left}cqw`, top: '0.5cqw' };
        if (i === 0) return (
          <div key="g" style={pos}>
            <CoverFace code={genesis} width={width} />
          </div>
        );
        const card = chain[i - 1];
        if (card) {
          return (
            <div key={card.id} style={pos} data-testid="o-chuoi" aria-label={fmt(rebuildUi.oChuoiDay, { so: i, the: cardLabel(card) })}>
              <CardFace card={card} width={width} mood="snap" />
            </div>
          );
        }
        const isNext = i === next;
        return (
          <div
            key={`e${i}`}
            style={{ ...pos, width: `${width}cqw`, height: `${h}cqw` }}
            aria-label={fmt(rebuildUi.oChuoi, { so: i })}
            className={`rounded-[0.9cqw] border-[0.3cqw] border-dashed ${isNext && armed ? 'animate-pulse border-muc-tim bg-muc-tim/15' : 'border-nau-go/70 bg-giay/40'}`}
          >
            {isNext && badFlash > 0 && <span key={badFlash} className="absolute inset-0 animate-shake rounded-[0.9cqw] bg-do-son/35" />}
          </div>
        );
      })}
    </div>
  );
});

export interface TrayProps {
  cards: readonly Card[];
  width: number;
  selected: string | null;
  shake: { id: string; n: number } | null;
  /** Thẻ vừa được nhét vào khay (trang giả) hoặc vừa nhấc ra: id của thẻ mới */
  fresh: string | null;
  dragId: string | null;
  enabled: boolean;
  bind: (id: string) => Record<string, unknown>;
  onSelectKey: (id: string) => void;
  /** Tăng mỗi khi luật sửa trạng thái tại chỗ (mảng `cards` giữ nguyên tham chiếu), để thành phần vẽ lại */
  version: number;
}

/** Khay các thẻ chưa ghép: mỗi thẻ là một nút (bàn phím: Enter hoặc Space để chọn) vừa chạm được vừa kéo được. */
export const Tray = memo(function Tray({ cards, width, selected, shake, fresh, dragId, enabled, bind, onSelectKey, version }: TrayProps) {
  void version;
  const h = cardHeight(width);
  return (
    <div role="group" aria-label={rebuildUi.khay} data-testid="khay" className="absolute" style={{ left: `${AREAS.tray.x0}cqw`, top: `${AREAS.tray.y0}%`, width: `${AREAS.tray.x1 - AREAS.tray.x0}cqw`, height: `${h + 1.6}cqw` }}>
      {cards.map((c, i) => {
        const mood: CardMood = shake?.id === c.id ? 'shake' : selected === c.id ? 'selected' : fresh === c.id ? 'new' : 'normal';
        return (
          <button
            key={`${c.id}:${shake?.id === c.id ? shake.n : 0}`}
            type="button"
            disabled={!enabled}
            aria-label={selected === c.id ? fmt(rebuildUi.theChon, { the: cardLabel(c) }) : cardLabel(c)}
            aria-pressed={selected === c.id}
            data-card-id={c.id}
            data-testid="the-khay"
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelectKey(c.id);
              }
            }}
            className="absolute cursor-grab touch-none rounded-[0.9cqw] p-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-muc-tim"
            style={{ left: `${i * (width + GAP_CQW)}cqw`, top: '0.8cqw', opacity: dragId === c.id ? 0.25 : 1, touchAction: 'none' }}
            {...bind(c.id)}
          >
            <CardFace card={c} width={width} mood={mood} />
          </button>
        );
      })}
    </div>
  );
});

/** Rổ trang giả: vùng thả (`data-drop="basket"`) và bấm được (bỏ thẻ đang chọn vào rổ); hình cái rổ là hình rời của Scene25D phía sau. */
export const Basket = memo(function Basket({ armed, hover, onActivate, label }: { armed: boolean; hover: boolean; onActivate: () => void; label: string }) {
  const b = AREAS.basket;
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={rebuildUi.roNhan}
      data-drop="basket"
      data-testid="ro-trang-gia"
      onClick={onActivate}
      onKeyDown={enterOrSpace(onActivate)}
      className={`absolute flex items-end justify-center rounded-[1.2cqw] border-[0.35cqw] border-dashed pb-[0.6cqw] ${hover ? 'border-xanh-la bg-xanh-la/25' : armed ? 'animate-pulse border-muc-tim/80' : 'border-transparent'}`}
      style={{ left: `${b.x0}cqw`, top: `${b.y0}%`, width: `${b.x1 - b.x0}cqw`, height: `${b.y1 - b.y0}%` }}
    >
      <span className="rounded-nut bg-giay/90 px-[1cqw] py-[0.3cqw] font-display font-bold text-chu shadow" style={{ fontSize: '1.7cqw' }}>
        {label}
      </span>
    </div>
  );
});
