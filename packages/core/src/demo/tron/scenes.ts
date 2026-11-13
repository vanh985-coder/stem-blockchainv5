/** Danh sách "đơn vị cảnh" của chế độ trọn (phần chạy). Dữ liệu từng đơn vị ở `starts.ts`. `&tu=<mã đoạn>` bắt đầu từ đơn vị chứa mã đó. */
import type { DemoContext } from '../context';
import type { SceneDef } from '../director';
import { tronGiayCards, tronGiayM1, tronGiayM2, tronGiayM3, tronGiayTrao, tronGiayWalk, tronIntro } from './giay';
import { tronDetM4, tronDetM5, tronDetM6, tronDetThe, tronDetTrao, tronDetVao } from './det';
import { tronKdM7, tronKdM8, tronKdM9, tronKdThe, tronKdTrao, tronKdVao } from './khacdau';
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
  'det-vao': tronDetVao,
  'det-the': tronDetThe,
  'det-man-4': tronDetM4,
  'det-man-5': tronDetM5,
  'det-man-6': async (ctx) => {
    await tronDetM6(ctx);
    await tronDetTrao(ctx);
  },
  'kd-vao': tronKdVao,
  'kd-the': tronKdThe,
  'kd-man-7': tronKdM7,
  'kd-man-8': tronKdM8,
  'kd-man-9': async (ctx) => {
    await tronKdM9(ctx);
    await tronKdTrao(ctx);
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
