/** Chế độ danh sách màn (`?man=1,2,5,10`): màn chuyển 2 giây rồi bot chơi từng màn, vào thẳng route (không đi bộ qua chợ hay làng). */
import { fmt } from '../../content/characters';
import { demoUi } from '../../content/demo';
import { levelById } from '../../content/levels';
import type { DemoContext } from '../context';
import type { SceneDef } from '../director';
import { hideTransition, showTransition } from '../transition';
import { man10 } from './bac';
import { man5 } from './det';
import { giayMan1, giayMan2 } from './giay';
import { listSceneMeta } from './order';

export const TRANSITION_MS = 2000;

const PLAY: Record<number, (ctx: DemoContext) => Promise<void>> = {
  1: giayMan1,
  2: giayMan2,
  5: man5,
  10: man10,
};

/** Các màn bot chơi được ở chế độ danh sách (đợt này: 1, 2, 5, 10). */
export const PLAYABLE_LEVELS: readonly number[] = Object.keys(PLAY).map(Number);

export const routeOfLevel = (n: number): string => `/lang/${levelById(n)?.lang}/man/${n}`;

export function buildListScenes(levels: readonly number[]): SceneDef<DemoContext>[] {
  const ok = levels.filter((n) => PLAY[n]);
  return listSceneMeta(ok).map((m) => {
    const n = Number(m.id.split('-')[1]);
    if (m.id.startsWith('chuyen-')) {
      return {
        ...m,
        run: async (ctx: DemoContext) => {
          showTransition(fmt(demoUi.manChuyen, { so: n }), fmt(levelById(n)?.ten ?? ''));
          try {
            await ctx.ctl.sleep(300);
            ctx.navigate(routeOfLevel(n));
            await ctx.ctl.sleep(TRANSITION_MS - 300);
          } finally {
            hideTransition();
          }
        },
      };
    }
    return { ...m, run: PLAY[n] };
  });
}
