import type { StoryCard } from '../lessons/types';
import type { DialogueTurn } from '../ui/DialogueBox';

/** 3 trạm của một bài học 2D: Dễ, Trung bình, Khó. Cũng là khóa sao trong level_progress. */
export type StationId = 'de' | 'tb' | 'kho';
export const STATION_ORDER: readonly StationId[] = ['de', 'tb', 'kho'];

/** 4 thời điểm người dẫn nói trong một bài. */
export type Moment = 'dauBai' | 'truocTb' | 'truocKho' | 'cuoiBai';

/** Lời người dẫn theo thời điểm; mỗi bài khai báo trong content/lessons/. */
export type LessonDialogue = Record<Moment, DialogueTurn[]>;

/** Cảnh trao Trang Sổ Vàng: dòng chú thích và lời người dẫn ("Kết thúc làng"). */
export interface GoldenAward {
  chuThich: string;
  loi: DialogueTurn[];
}

/** Chữ giới thiệu một trạm (LevelIntro). */
export interface StationMeta {
  tieuDe: string;
  mucTieu: string;
  meo?: string;
}

/** Kết quả một trạm: sao 1 đến 3, thời gian làm, điều học được. */
export interface StationResult {
  stars: 1 | 2 | 3;
  timeMs: number;
  learned: string;
}

export interface LessonContent {
  dialogue: LessonDialogue;
  award: GoldenAward;
  stations: Record<StationId, StationMeta>;
  /** "Điều em vừa học" ở màn hoàn thành cả bài */
  keyTakeaway: string;
  emCoBiet: StoryCard[];
  /** Thẻ "Em có biết?" chỉ hiện khi đang ở trạm Khó (Bài 2: Đặt cọc) */
  emCoBietKho?: StoryCard[];
}
