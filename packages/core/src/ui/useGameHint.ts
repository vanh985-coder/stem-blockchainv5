import { useEffect, useRef } from 'react';

/**
 * Game đăng ký hàm nhắc việc cho nút "?" của `MiniGameLevel` (bước HD): `hint` là hàm thuần `hintFor(state)` của game gói trong một closure đọc trạng thái hiện tại (chữ chưa qua fmt, có thể có {phanDien}).
 * Khung chỉ gọi hàm này lúc em bấm "?" (lúc đó game đã tạm dừng), nên không cần gọi lại mỗi khung hình.
 */
export function useGameHint(setHint: (fn: (() => string) | null) => void, hint: () => string): void {
  const latest = useRef(hint);
  latest.current = hint;
  useEffect(() => {
    setHint(() => latest.current());
    return () => setHint(null);
  }, [setHint]);
}
