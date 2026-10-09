import type { ReactNode } from 'react';
import { Button } from '@so-chung/core';
import { teacherTexts } from '@so-chung/core/content/teacher';
import type { LoadState } from './useLoad';

/** Hiện "Đang tải…", lỗi kèm nút "Thử lại", hoặc nội dung khi đã có dữ liệu. */
export function Async<T>({ state, onRetry, children }: { state: LoadState<T>; onRetry: () => void; children: (data: T) => ReactNode }) {
  if (state.status === 'loading') return <p role="status" className="py-6 text-center text-base">{teacherTexts.dangTai}</p>;
  if (state.status === 'error') {
    return (
      <div role="alert" className="space-y-3 py-6 text-center">
        <p className="text-base font-semibold text-do-son-dam">{state.message}</p>
        <Button size="sm" variant="secondary" onClick={onRetry}>
          {teacherTexts.thuLai}
        </Button>
      </div>
    );
  }
  return <>{children(state.data)}</>;
}
