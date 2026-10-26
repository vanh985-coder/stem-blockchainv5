/**
 * Bộ phát hoạt cảnh màn 11 (hàm thuần/TS thuần, không import three hay React): giữ bàn hiển thị, dòng thời gian đang phát, đồng hồ (dừng khi tạm dừng) và trạng thái cây ĐÃ HIỆN (ô nào đã có lá,
 * cành nào đã gộp, gốc đã sáng chưa). Cây chỉ đổi khi tới MỐC thời gian của dòng thời gian (lá bay tới nơi mới lấp ô), nên logic có thể đã sang trạng thái cuối mà cảnh vẫn đang diễn.
 *
 * Cảnh gọi `update(dtMs, paused, onMark)` mỗi khung hình: không cấp phát; mốc là đối tượng có sẵn trong dòng thời gian.
 */
import { emptyTimeline, planEvents, resetTimeline, stepClock, viewFromBoard, type BoardView, type Mark, type TileTrack, type Timeline } from './man11Anim';
import type { Board, Match3Event } from './match3Logic';

export class Man11Engine {
  /** Bàn hiển thị khi không có hoạt cảnh (và trạng thái cuối khi hoạt cảnh xong) */
  view: BoardView;
  /** Số ô của cây (4 hay 8) */
  count: number;
  timeline: Timeline = emptyTimeline();
  playing = false;
  /** Đồng hồ của dòng thời gian đang phát (ms) */
  clock = 0;
  /** Đồng hồ chạy mãi (ms, dừng khi tạm dừng): để hiệu ứng "mới xảy ra" của cây và vòng sáng của gốc */
  now = 0;
  /** Miếng nào có đường đi trong dòng thời gian đang phát (null: đứng yên theo `view`) */
  readonly trackOf: (TileTrack | null)[];
  /** Cây đã hiện */
  filled: boolean[];
  /** `merged[level - 1][index]`: cành mức `level` đã hiện */
  merged: boolean[][];
  /** Lúc (theo `now`) ô cây lấp, cành gộp, gốc xong; −1 là chưa */
  slotAt: number[];
  branchAt: number[][];
  treeAt = -1;
  private nextMark = 0;
  private finalView: BoardView | null = null;

  constructor(board: Board, count: number) {
    this.view = viewFromBoard(board);
    this.count = count;
    this.trackOf = new Array<TileTrack | null>(this.view.tiles.length).fill(null);
    this.filled = [];
    this.merged = [];
    this.slotAt = [];
    this.branchAt = [];
    this.resetTree(count);
  }

  private resetTree(count: number): void {
    this.count = count;
    const levels = Math.round(Math.log2(count));
    this.filled = new Array<boolean>(count).fill(false);
    this.slotAt = new Array<number>(count).fill(-1);
    this.merged = Array.from({ length: levels }, (_, i) => new Array<boolean>(count >> (i + 1)).fill(false));
    this.branchAt = Array.from({ length: levels }, (_, i) => new Array<number>(count >> (i + 1)).fill(-1));
    this.treeAt = -1;
  }

  /** Vòng mới: bàn mới, cây mới (chưa ô nào đầy). */
  startRound(board: Board, count: number): void {
    this.view = viewFromBoard(board);
    this.timeline = emptyTimeline();
    this.playing = false;
    this.finalView = null;
    this.clock = 0;
    this.nextMark = 0;
    this.trackOf.fill(null);
    this.resetTree(count);
  }

  /** Lập dòng thời gian cho các sự kiện của một thao tác và bắt đầu phát. Đang phát dở thì xong nốt (nhảy tới cuối) trước. */
  playEvents(events: readonly Match3Event[], reduced: boolean, onMark?: (m: Mark) => void): Timeline {
    if (this.playing) this.finish(onMark);
    const { timeline, view } = planEvents(this.view, events, reduced);
    resetTimeline(timeline);
    this.timeline = timeline;
    this.finalView = view;
    this.playing = true;
    this.clock = 0;
    this.nextMark = 0;
    this.trackOf.fill(null);
    for (const tr of timeline.tracks) this.trackOf[tr.id] = tr;
    return timeline;
  }

  private apply(m: Mark): void {
    if (m.type === 'slot' && m.slot !== undefined) {
      this.filled[m.slot] = true;
      this.slotAt[m.slot] = this.now;
    } else if (m.type === 'branch' && m.level !== undefined && m.index !== undefined) {
      this.merged[m.level - 1][m.index] = true;
      this.branchAt[m.level - 1][m.index] = this.now;
    } else if (m.type === 'tree') this.treeAt = this.now;
  }

  /** Phát nốt mọi mốc còn lại và đặt bàn hiển thị về trạng thái cuối. */
  finish(onMark?: (m: Mark) => void): void {
    if (!this.playing) return;
    const marks = this.timeline.marks;
    while (this.nextMark < marks.length) {
      const m = marks[this.nextMark++];
      this.apply(m);
      onMark?.(m);
    }
    if (this.finalView) this.view = this.finalView;
    this.finalView = null;
    this.playing = false;
    this.trackOf.fill(null);
    this.clock = this.timeline.duration;
  }

  /** Tiến đồng hồ (ms); tạm dừng thì đứng yên. Trả về true ở khung hình hoạt cảnh vừa xong. */
  update(dtMs: number, paused: boolean, onMark?: (m: Mark) => void): boolean {
    if (!paused) this.now += Math.min(100, Math.max(0, dtMs));
    if (!this.playing) return false;
    this.clock = stepClock(this.clock, dtMs, paused, this.timeline.duration);
    const marks = this.timeline.marks;
    while (this.nextMark < marks.length && marks[this.nextMark].t <= this.clock) {
      const m = marks[this.nextMark++];
      this.apply(m);
      onMark?.(m);
    }
    if (this.clock >= this.timeline.duration) {
      this.finish(onMark);
      return true;
    }
    return false;
  }
}
