/** Danh sách "đơn vị cảnh" của chế độ trọn (phần chạy). Dữ liệu từng đơn vị ở `starts.ts`. `&tu=<mã đoạn>` bắt đầu từ đơn vị chứa mã đó. */
import type { DemoContext } from '../context';
import type { SceneDef } from '../director';
import { tronGiayCards, tronGiayM1, tronGiayM2, tronGiayM3, tronGiayTrao, tronGiayWalk, tronIntro } from './giay';
import { TRON_UNIT_META } from './starts';

const RUN: Record<string, (ctx: DemoContext) => Promise<void>> = {
  'mo-dau': tronIntro,
  'giay-di-bo': tronGiayWalk,
  'giay-the': tronGiayCards,
  'giay-man-1': tronGiayM1,
  'giay-man-2': tronGiayM2,
  'giay-man-3': async (ctx) => {
    await tronGiayM3(ctx);
    await tronGiayTrao(ctx);
  },
};

export function buildTronScenes(from: string | null): SceneDef<DemoContext>[] {
  const first = from ? TRON_UNIT_META.findIndex((u) => u.codes.includes(from)) : 0;
  if (from && first < 0) throw new Error('unknown segment code: ' + from);
  return TRON_UNIT_META.slice(Math.max(0, first)).map((u) => {
    const run = RUN[u.id];
    if (!run) throw new Error('missing tron scene impl: ' + u.id);
    return {
      id: u.id,
      title: u.id,
      timeoutMs: u.timeoutMs,
      run: async (ctx) => {
        console.info('[tron] unit ' + u.id + ' start');
        await run(ctx);
      },
    };
  });
}
