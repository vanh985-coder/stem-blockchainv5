import { useCallback, useEffect, useRef, useSyncExternalStore, type FocusEvent, type KeyboardEvent, type PointerEvent, type RefObject } from 'react';
import { choiceReactions, type ReactionState, type ReactionStore } from './choiceReactions';
import type { Rect } from './poses';

/** Khung màn hình (pixel) của một phần tử. */
export function rectOf(el: Element): Rect {
  const r = el.getBoundingClientRect();
  return { x: r.x, y: r.y, width: r.width, height: r.height };
}

/** Trạng thái phản ứng hiện tại, để khung 3D nghe. */
export function useReaction(store: ReactionStore = choiceReactions): ReactionState {
  return useSyncExternalStore(store.subscribe, store.getState, store.getState);
}

export interface ChoiceHandlers {
  /** Gắn vào mỗi nút đáp án: rê chuột hoặc focus thì nhân vật nhìn/chỉ về đáp án đó */
  bindChoice: () => {
    onPointerEnter: (e: PointerEvent<HTMLElement>) => void;
    onPointerLeave: (e: PointerEvent<HTMLElement>) => void;
    onPointerDown: (e: PointerEvent<HTMLElement>) => void;
    onKeyDown: (e: KeyboardEvent<HTMLElement>) => void;
    onFocus: (e: FocusEvent<HTMLElement>) => void;
    onBlur: () => void;
  };
  /**
   * Gọi khi em chọn một đáp án (bấm, chạm hoặc Enter). Trả về Promise hoàn thành khi được phép hiện kết quả:
   * ngay nếu bằng chuột hoặc bàn phím, sau 0,3 giây nếu chạm (nhân vật chỉ trước).
   */
  select: (el: HTMLElement) => Promise<void>;
  /** Có kết quả: đúng thì cheer, sai thì sad */
  result: (correct: boolean) => void;
}

/**
 * Cách QuizCard và trang bài học phát sự kiện vào kho phản ứng. Không import three: nhẹ cho trang đầu.
 * Phân biệt chạm (điện thoại) với chuột theo `pointerType` của lần tương tác gần nhất.
 */
export function useChoiceHandlers(store: ReactionStore = choiceReactions): ChoiceHandlers {
  const last = useRef<string>('mouse');
  const bindChoice = useCallback(
    () => ({
      onPointerEnter: (e: PointerEvent<HTMLElement>) => {
        last.current = e.pointerType;
        if (e.pointerType !== 'touch') store.hover(rectOf(e.currentTarget));
      },
      onPointerLeave: (e: PointerEvent<HTMLElement>) => {
        if (e.pointerType !== 'touch') store.hover(null);
      },
      onPointerDown: (e: PointerEvent<HTMLElement>) => {
        last.current = e.pointerType;
      },
      onKeyDown: () => {
        last.current = 'keyboard';
      },
      onFocus: (e: FocusEvent<HTMLElement>) => {
        if (last.current !== 'touch') store.hover(rectOf(e.currentTarget));
      },
      onBlur: () => store.hover(null),
    }),
    [store],
  );
  const select = useCallback((el: HTMLElement) => store.select(rectOf(el), last.current === 'touch'), [store]);
  const result = useCallback((correct: boolean) => store.result(correct), [store]);
  return { bindChoice, select, result };
}

/** Nút người dùng bấm được, tính từ phần tử đang rê hoặc focus tới (bỏ qua nút bị vô hiệu). */
const CLICKABLE = 'button, [role="button"], input[type="button"], input[type="submit"], a[href]';

function clickableOf(target: EventTarget | null, root: Element): HTMLElement | null {
  const el = target instanceof Element ? target.closest<HTMLElement>(CLICKABLE) : null;
  if (!el || !root.contains(el)) return null;
  if (el instanceof HTMLButtonElement && el.disabled) return null;
  if (el.getAttribute('aria-disabled') === 'true') return null;
  return el;
}

/**
 * Nối một lần cho cả vùng bài học: rê chuột hoặc focus (Tab) vào bất kỳ nút nào trong `ref` thì phát `hover` vào kho,
 * rời đi thì `hover(null)`. Dùng event delegation nên không phải sửa từng trạm. Chạm không có rê nên bỏ qua; kết quả
 * đúng/sai đến từ `sound.playCorrect/playWrong` (xem `audio/answerSignal.ts`).
 */
export function useChoiceDelegation(ref: RefObject<HTMLElement | null>, enabled = true, store: ReactionStore = choiceReactions): void {
  useEffect(() => {
    const root = ref.current;
    if (!root || !enabled) return;
    let touched = false;
    const over = (e: Event) => {
      const pe = e as globalThis.PointerEvent;
      if (pe.pointerType === 'touch') {
        touched = true;
        return;
      }
      touched = false;
      const b = clickableOf(e.target, root);
      if (b) store.hover(rectOf(b));
    };
    const out = (e: Event) => {
      const pe = e as globalThis.PointerEvent;
      if (pe.pointerType === 'touch') return;
      const b = clickableOf(e.target, root);
      if (b && !b.contains(pe.relatedTarget as Node | null)) store.hover(null);
    };
    const focusIn = (e: Event) => {
      if (touched) return;
      const b = clickableOf(e.target, root);
      if (b) store.hover(rectOf(b));
    };
    const focusOut = () => store.hover(null);
    const down = (e: Event) => {
      touched = (e as globalThis.PointerEvent).pointerType === 'touch';
    };
    const key = () => {
      touched = false;
    };
    root.addEventListener('pointerover', over);
    root.addEventListener('pointerout', out);
    root.addEventListener('pointerdown', down);
    root.addEventListener('keydown', key);
    root.addEventListener('focusin', focusIn);
    root.addEventListener('focusout', focusOut);
    return () => {
      root.removeEventListener('pointerover', over);
      root.removeEventListener('pointerout', out);
      root.removeEventListener('pointerdown', down);
      root.removeEventListener('keydown', key);
      root.removeEventListener('focusin', focusIn);
      root.removeEventListener('focusout', focusOut);
      store.hover(null);
    };
  }, [ref, enabled, store]);
}
