import type { ReactNode } from 'react';
import { HUB_MAP_URL } from '../config/urls';
import { fmt } from '../content/characters';
import { ui } from '../content/ui';
import { Button } from './Button';
import { Panel } from './Panel';

/** Trang tạm cho màn bài học, thay bằng bài học thật khi chuyển từng bài. */
export function LessonPlaceholder({ lesson, children }: { lesson: number; children?: ReactNode }) {
  return (
    <main className="grid min-h-screen place-items-center p-4 text-center">
      <Panel className="w-full max-w-md space-y-4">
        <h1 className="text-2xl">{fmt(ui.trangTam.tieuDe, { so: lesson })}</h1>
        {children}
        <Button onClick={() => window.location.assign(HUB_MAP_URL)}>{ui.chung.veBanDo}</Button>
      </Panel>
    </main>
  );
}
