import { MiniGameLevel } from '@so-chung/core';
import { MATCH3_SPEC } from '../match3/match3Config';
import { Match3Game } from '../match3/Match3Game';

/**
 * Màn 11 "Ghép lá cây sổ": game ghép ba kiểu Candy Crush trên Scene25D, bọc trong khung game phụ (thẻ bắt đầu, màn kết quả). Mốc theo nghĩa: Vàng ≈ xong 3 cây, Bạc ≈ xong 2 cây, Đồng ≈ xong 1 cây
 * (spec 08, mục cân bằng lượt 2). Sau màn kết quả, "Chơi tiếp" sang màn 12.
 */
export default function Man11() {
  return <MiniGameLevel levelId={11} medals={MATCH3_SPEC.medals} renderGame={(p) => <Match3Game {...p} />} />;
}
