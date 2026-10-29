import { MiniGameLevel } from '@so-chung/core';
import { REBUILD_SPEC } from '../rebuild/rebuildConfig';
import { REBUILD_MAX_SCORE } from '../rebuild/rebuildLogic';
import { RebuildGame } from '../rebuild/RebuildGame';

/** Màn 3 "Ghép lại cuốn sổ": game ghép chuỗi trang trên Scene25D, bọc trong khung game phụ (thẻ bắt đầu, màn kết quả). */
export default function Man3() {
  return <MiniGameLevel levelId={3} medals={REBUILD_SPEC.medals} maxScore={REBUILD_MAX_SCORE} renderGame={(p) => <RebuildGame {...p} />} />;
}
