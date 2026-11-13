import { describe, expect, it } from 'vitest';
import { DEMO_SPEED, parseSpeed } from './config';
import { DemoController, SkipScene, StopDemo } from './controller';
import { runDirector, type SceneDef, type SceneLog } from './director';

interface C {
  ctl: DemoController;
}

const scene = (id: string, run: (c: C) => Promise<void>, timeoutMs = 5000): SceneDef<C> => ({ id, title: id, timeoutMs, run });
const summary = (logs: SceneLog[]) => logs.map((l) => `${l.id}:${l.status}`);

describe('runDirector', () => {
  it('chạy lần lượt các cảnh và ghi thời lượng', async () => {
    const order: string[] = [];
    const ctx = { ctl: new DemoController(8) };
    const logs = await runDirector(
      [
        scene('a', async (c) => {
          order.push('a');
          await c.ctl.sleep(40);
        }),
        scene('b', async () => {
          order.push('b');
        }),
      ],
      ctx,
      () => undefined,
    );
    expect(order).toEqual(['a', 'b']);
    expect(summary(logs)).toEqual(['a:done', 'b:done']);
    expect(logs[0].ms).toBeGreaterThanOrEqual(0);
  });

  it('bỏ qua cảnh hiện tại (N) rồi chạy cảnh sau', async () => {
    const ctl = new DemoController(8);
    const seen: SceneLog[] = [];
    const logs = await runDirector(
      [
        scene('a', async (c) => {
          setTimeout(() => c.ctl.requestSkip(), 30);
          await c.ctl.sleep(5000);
        }),
        scene('b', async () => undefined),
      ],
      { ctl },
      (l) => seen.push(l),
    );
    expect(summary(logs)).toEqual(['a:skipped', 'b:done']);
    expect(seen).toHaveLength(2);
  });

  it('dừng demo (Esc) thì không chạy cảnh sau', async () => {
    const ctl = new DemoController(8);
    const logs = await runDirector(
      [
        scene('a', async (c) => {
          setTimeout(() => c.ctl.stop(), 20);
          await c.ctl.sleep(5000);
        }),
        scene('b', async () => undefined),
      ],
      { ctl },
      () => undefined,
    );
    expect(summary(logs)).toEqual(['a:stopped']);
  });

  it('cảnh quá hạn ghi timeout, cảnh lỗi ghi error, rồi chạy tiếp', async () => {
    const ctl = new DemoController(8);
    const logs = await runDirector(
      [
        scene(
          'slow',
          async (c) => {
            await c.ctl.sleep(60_000);
          },
          80,
        ),
        scene('bad', async () => {
          throw new Error('boom');
        }),
        scene('ok', async () => undefined),
      ],
      { ctl },
      () => undefined,
    );
    expect(summary(logs)).toEqual(['slow:timeout', 'bad:error', 'ok:done']);
    expect(logs[1].error).toBe('boom');
  });
});

describe('DemoController', () => {
  it('tạm dừng (P) giữ cảnh đứng yên rồi chạy tiếp', async () => {
    const ctl = new DemoController(8);
    ctl.togglePause();
    let done = false;
    const p = ctl.sleep(10).then(() => {
      done = true;
    });
    await new Promise((r) => setTimeout(r, 120));
    expect(done).toBe(false);
    ctl.togglePause();
    await p;
    expect(done).toBe(true);
  });

  it('checkpoint ném SkipScene hay StopDemo', async () => {
    const a = new DemoController();
    a.requestSkip();
    await expect(a.checkpoint()).rejects.toBeInstanceOf(SkipScene);
    a.clearSkip();
    await expect(a.checkpoint()).resolves.toBeUndefined();
    a.stop();
    await expect(a.checkpoint()).rejects.toBeInstanceOf(StopDemo);
  });

  it('waitFor trả giá trị khi có, báo lỗi rõ khi hết giờ', async () => {
    const ctl = new DemoController();
    let n = 0;
    await expect(ctl.waitFor(() => (++n > 2 ? 'x' : null), 'thing', 2000)).resolves.toBe('x');
    await expect(ctl.waitFor(() => null, 'never', 150)).rejects.toThrow('waitFor timeout: never');
  });
});

describe('nhịp ?tocdo', () => {
  it('chỉ nhận 0.75, 1, 1.5; còn lại là 1', () => {
    expect(parseSpeed('0.75')).toBe(0.75);
    expect(parseSpeed('1.5')).toBe(1.5);
    expect(parseSpeed('1')).toBe(1);
    expect(parseSpeed('2')).toBe(1);
    expect(parseSpeed(null)).toBe(1);
    expect(parseSpeed('abc')).toBe(1);
    expect(DEMO_SPEED).toBe(1);
  });
});
