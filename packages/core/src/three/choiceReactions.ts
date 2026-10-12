/**
 * Kho sự kiện phản ứng khi chọn đáp án (spec 03 mục 4, `ChoiceReaction`). Không import three và không import React:
 * QuizCard và các trang bài học chỉ cần phát sự kiện vào đây; khung 3D (bước sau) chỉ nghe.
 *
 *  - rê chuột hoặc focus vào một đáp án (máy tính): `hover(rect)` rồi `hover(null)` khi rời;
 *  - chọn: `select(rect, touch)`. Chạm (điện thoại) thì nhân vật chỉ (point) 0,3 giây trước khi cho hiện kết quả;
 *  - có kết quả: `result(correct)`. Đúng thì học sinh `cheer`, {phanDien} giữ `idle` (`hurt` chỉ dành cho màn 5);
 *    sai thì học sinh `sad` và {phanDien} `cheer`.
 */
import { onAnswer } from '../audio/answerSignal';
import type { ClipName } from './clips';
import type { PoseName, Rect } from './poses';

/** Chạm rồi chờ chừng này mới hiện kết quả, để nhân vật kịp chỉ. */
export const TOUCH_POINT_MS = 300;

export function revealDelayMs(touch: boolean): number {
  return touch ? TOUCH_POINT_MS : 0;
}

/** Điều một nhân vật phải làm: một clip (phát lại khi `clipN` đổi) và/hoặc một tư thế (phát lại khi `poseN` đổi). */
export interface Reaction {
  clip: ClipName;
  clipN: number;
  pose: PoseName | null;
  poseN: number;
}

export interface ReactionState {
  /** Đáp án đang được nhìn/chỉ (khung màn hình, pixel). null nếu không có. */
  target: Rect | null;
  /** Đã chọn, đang chờ kết quả: rê chuột ra khỏi đáp án cũng không thả tay chỉ */
  locked: boolean;
  /** Học sinh */
  student: Reaction;
  /** {phanDien} */
  rival: Reaction;
}

const idle = (): Reaction => ({ clip: 'idle', clipN: 0, pose: null, poseN: 0 });

export const INITIAL_REACTION_STATE: ReactionState = { target: null, locked: false, student: idle(), rival: idle() };

export type ReactionEvent =
  | { type: 'hover'; target: Rect | null }
  | { type: 'select'; target: Rect | null }
  | { type: 'result'; correct: boolean }
  | { type: 'reset' };

/** Phát lại clip: tăng `clipN` để nhân vật phát lại dù là cùng một clip. */
const playClip = (r: Reaction, clip: ClipName): Reaction => ({ ...r, clip, clipN: r.clipN + 1, pose: null });
const playPose = (r: Reaction, pose: PoseName): Reaction => ({ ...r, clip: 'idle', pose, poseN: r.poseN + 1 });

/** Hàm thuần: trạng thái mới sau một sự kiện. */
export function reduceReaction(state: ReactionState, ev: ReactionEvent): ReactionState {
  switch (ev.type) {
    case 'hover':
      // Đã chọn thì giữ nguyên hướng nhìn tới khi có kết quả.
      return state.locked ? state : { ...state, target: ev.target };
    case 'select':
      return { ...state, target: ev.target ?? state.target, locked: true };
    case 'result':
      // Nhận kết quả: thả tay chỉ, mở khóa. Đúng thì {phanDien} giữ idle (không `hurt`: chỉ dành cho màn 5).
      return ev.correct
        ? { target: null, locked: false, student: playClip(state.student, 'cheer'), rival: { ...state.rival, clip: 'idle', pose: null } }
        : { target: null, locked: false, student: playPose(state.student, 'sad'), rival: playClip(state.rival, 'cheer') };
    case 'reset':
      return { ...INITIAL_REACTION_STATE, student: { ...idle(), clipN: state.student.clipN, poseN: state.student.poseN }, rival: { ...idle(), clipN: state.rival.clipN, poseN: state.rival.poseN } };
  }
}

export interface ReactionStore {
  getState(): ReactionState;
  subscribe(listener: () => void): () => void;
  dispatch(ev: ReactionEvent): void;
  /** Rê chuột hoặc focus vào đáp án (rect), hoặc rời đi (null). */
  hover(target: Rect | null): void;
  /**
   * Chọn một đáp án. Trả về Promise hoàn thành khi được phép hiện kết quả: ngay lập tức nếu bằng chuột hoặc bàn phím,
   * sau 0,3 giây nếu chạm (nhân vật chỉ trước).
   */
  select(target: Rect | null, touch: boolean): Promise<void>;
  /** Có kết quả: đúng thì cheer, sai thì sad. */
  result(correct: boolean): void;
  reset(): void;
}

/** Tạo một kho riêng (test dùng kho riêng; ứng dụng dùng `choiceReactions`). `delay` thay được bộ hẹn giờ trong test. */
/** Hai kết quả cùng chiều trong khoảng này (ms) là một (hộp phản hồi và trạm cùng báo một lần trả lời). */
export const RESULT_DEDUPE_MS = 250;

export function createReactionStore(
  delay: (ms: number, fn: () => void) => void = (ms, fn) => void setTimeout(fn, ms),
  now: () => number = () => Date.now(),
): ReactionStore {
  let state = INITIAL_REACTION_STATE;
  let lastResult: { correct: boolean; at: number } | null = null;
  const listeners = new Set<() => void>();
  const store: ReactionStore = {
    getState: () => state,
    subscribe(l) {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    dispatch(ev) {
      const next = reduceReaction(state, ev);
      if (next === state) return;
      state = next;
      listeners.forEach((l) => l());
    },
    hover: (target) => store.dispatch({ type: 'hover', target }),
    select(target, touch) {
      store.dispatch({ type: 'select', target });
      const ms = revealDelayMs(touch);
      if (ms <= 0) return Promise.resolve();
      return new Promise<void>((resolve) => delay(ms, resolve));
    },
    result(correct) {
      const t = now();
      if (lastResult && lastResult.correct === correct && t - lastResult.at < RESULT_DEDUPE_MS) return;
      lastResult = { correct, at: t };
      store.dispatch({ type: 'result', correct });
    },
    reset: () => store.dispatch({ type: 'reset' }),
  };
  return store;
}

/** Kho dùng chung của ứng dụng. */
export const choiceReactions: ReactionStore = createReactionStore();

// Mọi lần em trả lời đúng/sai (sound.playCorrect/playWrong) đều thành kết quả ở kho này: nối một lần cho cả 4 bài.
onAnswer((correct) => choiceReactions.result(correct));

// Chỉ ở chế độ dev: mở kho ra window để kiểm tra bằng trình duyệt (QuizCard có phát đúng sự kiện không).
if (import.meta.env.DEV && typeof window !== 'undefined') (window as unknown as { __choiceReactions?: ReactionStore }).__choiceReactions = choiceReactions;
