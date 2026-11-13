import type { Ctx } from './actions';

/** Ngữ cảnh đưa cho mỗi cảnh. */
export interface DemoContext extends Ctx {
  navigate: (to: string) => void;
}
