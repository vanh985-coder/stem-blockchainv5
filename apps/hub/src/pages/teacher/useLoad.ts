import { useCallback, useEffect, useRef, useState } from 'react';
import type { ApiResult } from '@so-chung/core/teacher/api';

export type LoadState<T> = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ok'; data: T };

/** Tải dữ liệu một lần khi `key` đổi; `reload()` tải lại. Kết quả của lần tải cũ bị bỏ khi đã có lần mới. */
export function useLoad<T>(load: () => Promise<ApiResult<T>>, key: string): { state: LoadState<T>; reload: () => void } {
  const [state, setState] = useState<LoadState<T>>({ status: 'loading' });
  const [tick, setTick] = useState(0);
  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });
    void loadRef.current().then((r) => {
      if (!cancelled) setState(r.ok ? { status: 'ok', data: r.data } : { status: 'error', message: r.message });
    });
    return () => {
      cancelled = true;
    };
  }, [key, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { state, reload };
}
