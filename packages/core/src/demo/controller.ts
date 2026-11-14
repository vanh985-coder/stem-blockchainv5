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

import { timeScale } from './timeScale';

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
    // đang tua (video hướng dẫn): nhịp bot nhanh bằng hệ số thời gian của game; hệ số đọc lại mỗi lát để đổi giữa chừng
    let left = ms / this.speed;
    while (left > 0) {
      await this.checkpoint();
      const step = Math.min(SLICE_MS, left);
      await new Promise((r) => setTimeout(r, step));
      left -= step * timeScale();
    }
    await this.checkpoint();
  }

  /** Chờ tới khi `fn` trả giá trị thật; hết `timeoutMs` thì báo lỗi nói rõ đang chờ gì. */
  async waitFor<T>(fn: () => T | null | undefined | false, label: string, timeoutMs = 20000): Promise<T> {
    const t0 = performance.now();
    let warned = false;
    for (;;) {
      await this.checkpoint();
      const v = fn();
      if (v) return v;
      // chờ lâu: ghi lên console để biết bot đang đợi gì (cho người quay đọc)
      if (!warned && performance.now() - t0 > 8000) {
        warned = true;
        console.warn(`[demo] waiting: ${label}`);
      }
      if (performance.now() - t0 > timeoutMs) throw new Error(`waitFor timeout: ${label}`);
      await new Promise((r) => setTimeout(r, 60));
    }
  }
}
