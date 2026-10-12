import { useCallback, useRef, useSyncExternalStore, type FocusEvent, type KeyboardEvent, type PointerEvent } from 'react';
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
