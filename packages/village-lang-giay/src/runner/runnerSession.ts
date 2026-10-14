/**
 * Một ván chạy: trạng thái của `runnerLogic`, hàng đợi lệnh, bước thời gian cố định 1/60 giây và hai ảnh chụp (bước trước, bước hiện tại) để vẽ nội suy.
 * Không phụ thuộc React hay three nên test được; `update(dt)` được gọi mỗi khung hình vẽ. Không cấp phát khi chạy (các ảnh chụp và `input` dùng lại).
 */
import { CommandQueue, FIXED_STEP, FixedStepper, commandToInput, type RunnerCommand } from './runnerCommands';
import { createRunner, runnerScore, stepRunner, type RunnerEvent, type RunnerInput, type RunnerOptions, type RunnerState } from './runnerLogic';
import { lerp } from './runnerView';

/** Phần vị trí của nhân vật cần nội suy. */
export interface Snapshot {
  z: number;
  x: number;
  y: number;
  /** Vị trí {phanDien} (z) */
  villainZ: number;
}

export class RunnerSession {
  readonly state: RunnerState;
  readonly queue = new CommandQueue(4);
  readonly stepper = new FixedStepper(FIXED_STEP);
  /** Vị trí ở cuối bước trước và bước hiện tại (vẽ nội suy giữa hai vị trí theo `alpha`) */
  readonly prev: Snapshot = { z: 0, x: 0, y: 0, villainZ: 0 };
  readonly cur: Snapshot = { z: 0, x: 0, y: 0, villainZ: 0 };
  /** Vị trí nội suy của khung hình hiện tại (do `refreshView` ghi, nhiều nơi vẽ cùng đọc) */
  readonly view: Snapshot = { z: 0, x: 0, y: 0, villainZ: 0 };
  /** Giờ mô phỏng đã chạy (giây, theo số bước cố định) */
  time = 0;
  /** Tổng số bước đã chạy */
  steps = 0;
  /** Mọi sự kiện của các bước đã chạy trong lần `update` gần nhất (`state.events` chỉ giữ bước cuối); nơi vẽ đọc để phát âm thanh và hiệu ứng */
  readonly frameEvents: RunnerEvent[] = [];
  private readonly input: RunnerInput = {};
  private pendingAnswer: boolean | undefined = undefined;
  private pendingResume = false;

  /** Hạt giống của ván (dùng cho cả việc chọn câu hỏi) */
  readonly seed: number;

  constructor(opts: RunnerOptions) {
    this.seed = opts.seed;
    this.state = createRunner(opts);
    this.snapshot(this.cur);
    this.snapshot(this.prev);
  }

  private snapshot(out: Snapshot): void {
    const s = this.state;
    out.z = s.z;
    out.x = s.x;
    out.y = s.y;
    out.villainZ = s.z + s.villain.ahead;
  }

  /** Thêm một lệnh từ phím hay vuốt; dùng ở bước mô phỏng kế tiếp. */
  command(c: RunnerCommand): void {
    this.queue.push(c);
  }

  /** Em trả lời câu hỏi (đúng/sai): dùng ở bước mô phỏng kế tiếp; chỉ nhận lần đầu mỗi câu. */
  answerQuiz(correct: boolean): void {
    if (this.pendingAnswer === undefined) this.pendingAnswer = correct;
  }

  /** Đã xem giải thích: chạy tiếp (hoặc kết thúc ván nếu hết tim hay hết 4 vòng). */
  resumeQuiz(): void {
    this.pendingResume = true;
  }

  /** Hết tim (hay kết thúc) chưa. */
  get over(): boolean {
    return this.state.phase === 'over';
  }

  get score(): number {
    return runnerScore(this.state);
  }

  /**
   * Chạy `dt` giây thời gian thật: số bước cố định tương ứng, mỗi bước dùng nhiều nhất một lệnh trong hàng đợi. Trả về số bước đã chạy.
   * `paused` thì không chạy gì và bỏ phần thời gian dồn (khỏi nhảy vọt khi tiếp tục).
   */
  update(dt: number, paused: boolean): number {
    this.frameEvents.length = 0;
    if (paused || this.over) {
      this.stepper.reset();
      return 0;
    }
    const n = this.stepper.add(dt);
    for (let i = 0; i < n; i++) {
      const input = this.input;
      input.move = undefined;
      input.jump = undefined;
      input.slide = undefined;
      input.answer = undefined;
      input.resume = undefined;
      const c = this.queue.shift();
      if (c) commandToInput(c, input);
      if (this.pendingAnswer !== undefined) {
        input.answer = this.pendingAnswer;
        this.pendingAnswer = undefined;
      }
      if (this.pendingResume) {
        input.resume = true;
        this.pendingResume = false;
      }
      this.prev.z = this.cur.z;
      this.prev.x = this.cur.x;
      this.prev.y = this.cur.y;
      this.prev.villainZ = this.cur.villainZ;
      stepRunner(this.state, input, FIXED_STEP);
      const ev = this.state.events;
      for (let k = 0; k < ev.length; k++) this.frameEvents.push(ev[k]);
      this.snapshot(this.cur);
      this.time += FIXED_STEP;
      this.steps++;
      if (this.over) break;
    }
    return n;
  }

  /** Cập nhật `view` (gọi một lần mỗi khung hình, sau `update`). */
  refreshView(): Snapshot {
    return this.interpolated(this.view);
  }

  /** Vị trí nội suy để vẽ (ghi vào `out`). Khi đã hết ván thì đứng yên ở vị trí cuối. */
  interpolated(out: Snapshot): Snapshot {
    const a = this.over ? 1 : this.stepper.alpha;
    out.z = lerp(this.prev.z, this.cur.z, a);
    out.x = lerp(this.prev.x, this.cur.x, a);
    out.y = lerp(this.prev.y, this.cur.y, a);
    out.villainZ = lerp(this.prev.villainZ, this.cur.villainZ, a);
    return out;
  }
}
