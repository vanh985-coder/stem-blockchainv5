import { MiniGameLevel } from '@so-chung/core';
import { CLIMB_SPEC } from '../climb/climbConfig';
import { ClimbGame } from '../climb/ClimbGame';

/** Màn 12 "Leo cây tìm lá giả": game leo cây trên Scene25D, bọc trong khung game phụ (thẻ bắt đầu, màn kết quả). Cao trào làm ở bước B5. */
export default function Man12() {
  return <MiniGameLevel levelId={12} medals={CLIMB_SPEC.medals} renderGame={(p) => <ClimbGame {...p} />} />;
}
