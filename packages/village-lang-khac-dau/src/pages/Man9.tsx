import { MiniGameLevel } from '@so-chung/core';
import { BUBBLE_SPEC, bubbleMaxScore } from '../bubble/bubbleConfig';
import { BubbleGame } from '../bubble/BubbleGame';

/** Màn 9 "Bắn trứng khắc dấu": game bắn trứng kiểu Bubble Shooter vẽ bằng canvas 2D, bọc trong khung game phụ (thẻ bắt đầu, màn kết quả). Điểm cao nhất cũ vượt điểm tối đa mới thì hiện "Kỷ lục từ phiên bản trước". */
export default function Man9() {
  return <MiniGameLevel levelId={9} medals={BUBBLE_SPEC.medals} maxScore={bubbleMaxScore()} renderGame={(p) => <BubbleGame {...p} />} />;
}
