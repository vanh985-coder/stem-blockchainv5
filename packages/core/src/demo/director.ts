/** "Đạo diễn" demo: chạy lần lượt các cảnh theo thứ tự cốt truyện, đo thời lượng, chịu được bỏ qua (N), dừng (Esc) và hết giờ từng cảnh. */
import { DemoController, SkipScene, StopDemo } from './controller';

export interface SceneDef<C> {
  id: string;
  /** Tên ngắn cho nhật ký (tiếng Anh, dev) */
  title: string;
  /** Quá hạn này (mili giây) thì coi là kẹt: ghi lỗi rồi sang cảnh sau */
  timeoutMs: number;
  run: (ctx: C) => Promise<void>;
}

export type SceneStatus = 'done' | 'skipped' | 'timeout' | 'error' | 'stopped';

export interface SceneLog {
  id: string;
  ms: number;
  status: SceneStatus;
  error?: string;
}

/** Hàm thuần: kiểm tra danh sách cảnh (id không trùng, có hạn giờ dương). Trả danh sách lỗi (rỗng là hợp lệ). */
export function validateScenes(scenes: readonly Pick<SceneDef<unknown>, 'id' | 'timeoutMs'>[]): string[] {
  const errs: string[] = [];
  const seen = new Set<string>();
  for (const s of scenes) {
    if (seen.has(s.id)) errs.push(`duplicate scene id: ${s.id}`);
    seen.add(s.id);
    if (!(s.timeoutMs > 0)) errs.push(`bad timeout: ${s.id}`);
  }
  return errs;
}

export async function runDirector<C extends { ctl: DemoController }>(scenes: readonly SceneDef<C>[], ctx: C, onLog: (l: SceneLog) => void): Promise<SceneLog[]> {
  const logs: SceneLog[] = [];
  const push = (l: SceneLog) => {
    logs.push(l);
    onLog(l);
  };
  for (const scene of scenes) {
    const t0 = performance.now();
    ctx.ctl.clearSkip();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let timedOut = false;
    // Hết giờ: yêu cầu bỏ qua; cảnh dừng ở lần chờ kế tiếp (mọi chờ đều qua bộ điều khiển) nên không có cảnh "ma" chạy tiếp.
    timer = setTimeout(() => {
      timedOut = true;
      ctx.ctl.requestSkip();
    }, scene.timeoutMs / Math.min(1, ctx.ctl.speed));
    try {
      await scene.run(ctx);
      push({ id: scene.id, ms: Math.round(performance.now() - t0), status: timedOut ? 'timeout' : 'done' });
    } catch (e) {
      const ms = Math.round(performance.now() - t0);
      if (e instanceof StopDemo) {
        push({ id: scene.id, ms, status: 'stopped' });
        break;
      }
      if (timedOut) push({ id: scene.id, ms, status: 'timeout' });
      else if (e instanceof SkipScene) push({ id: scene.id, ms, status: 'skipped' });
      else push({ id: scene.id, ms, status: 'error', error: e instanceof Error ? e.message : String(e) });
    } finally {
      clearTimeout(timer);
      ctx.ctl.clearSkip();
    }
  }
  return logs;
}
