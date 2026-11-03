/** Bộ điều khiển nhịp của demo: tạm dừng (P), bỏ qua cảnh (N), dừng (Esc), tốc độ. Mọi chờ đợi của cảnh đi qua đây. */
export class SkipScene extends Error {
  constructor() {
    super('skip-scene');
  }
}
export class StopDemo extends Error {
  constructor() {
    super('stop-demo');
  }
}

const SLICE_MS = 40;

export class DemoController {
  speed: number;
  paused = false;
  private skipFlag = false;
  private stopFlag = false;

  constructor(speed = 1) {
    this.speed = speed;
  }

  togglePause(): boolean {
    this.paused = !this.paused;
    return this.paused;
  }
  requestSkip(): void {
    this.skipFlag = true;
  }
  clearSkip(): void {
    this.skipFlag = false;
  }
  stop(): void {
    this.stopFlag = true;
  }
  get stopped(): boolean {
    return this.stopFlag;
  }

  /** Ném nếu đã yêu cầu dừng hay bỏ qua; chờ tiếp khi đang tạm dừng. */
  async checkpoint(): Promise<void> {
    for (;;) {
      if (this.stopFlag) throw new StopDemo();
      if (this.skipFlag) throw new SkipScene();
      if (!this.paused) return;
      await new Promise((r) => setTimeout(r, SLICE_MS));
    }
  }

  /** Chờ `ms` (đã chia cho nhịp); thời gian tạm dừng không tính. */
  async sleep(ms: number): Promise<void> {
    let left = ms / this.speed;
    while (left > 0) {
      await this.checkpoint();
      const step = Math.min(SLICE_MS, left);
      await new Promise((r) => setTimeout(r, step));
      left -= step;
    }
    await this.checkpoint();
  }

  /** Chờ tới khi `fn` trả giá trị thật; hết `timeoutMs` thì báo lỗi nói rõ đang chờ gì. */
  async waitFor<T>(fn: () => T | null | undefined | false, label: string, timeoutMs = 20000): Promise<T> {
    const t0 = performance.now();
    for (;;) {
      await this.checkpoint();
      const v = fn();
      if (v) return v;
      if (performance.now() - t0 > timeoutMs) throw new Error(`waitFor timeout: ${label}`);
      await new Promise((r) => setTimeout(r, 60));
    }
  }
}
