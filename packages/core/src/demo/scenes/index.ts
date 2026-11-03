import type { SceneDef } from '../director';
import type { DemoContext } from '../context';
import { choDenLangGiay, giayThe, gioiThieu } from './intro';
import { giayMan1, giayMan2, giayMan3, giayTraoTrang } from './giay';
import { SCENE_META } from './order';

const IMPL: Record<string, (ctx: DemoContext) => Promise<void>> = {
  'gioi-thieu': gioiThieu,
  'cho-den-lang-giay': choDenLangGiay,
  'giay-the': giayThe,
  'giay-man-1': giayMan1,
  'giay-man-2': giayMan2,
  'giay-man-3': giayMan3,
  'giay-trao-trang': giayTraoTrang,
};

/** Danh sách cảnh đầy đủ (thứ tự theo `SCENE_META`). */
export function buildScenes(): SceneDef<DemoContext>[] {
  return SCENE_META.map((m) => {
    const run = IMPL[m.id];
    if (!run) throw new Error(`missing scene impl: ${m.id}`);
    return { id: m.id, title: m.title, timeoutMs: m.timeoutMs, run };
  });
}
