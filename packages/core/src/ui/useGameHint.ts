import { useEffect, useRef } from 'react';
import { hintText } from '../content/huongDanGame';

/**
 * Game đăng ký hàm nhắc việc cho nút "?" của `MiniGameLevel` (bước HD): `getKeys` là hàm thuần `hintFor(state)` của game (gói trong closure đọc trạng thái hiện tại) và chỉ trả KHÓA câu nhắc;
 * câu chữ nằm ở `content/huongDanGame.ts` (khóa `nhac` của màn `levelId`). Khung chỉ gọi lúc em bấm "?" (lúc đó game đã tạm dừng), nên không cần gọi lại mỗi khung hình.
 */
export function useGameHint(setHint: (fn: (() => string) | null) => void, levelId: number, getKeys: () => readonly string[]): void {
  const latest = useRef(getKeys);
  latest.current = getKeys;
  useEffect(() => {
    setHint(() => hintText(levelId, latest.current()));
    return () => setHint(null);
  }, [setHint, levelId]);
}
