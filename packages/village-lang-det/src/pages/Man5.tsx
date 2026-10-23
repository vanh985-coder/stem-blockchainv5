import { MiniGameLevel } from '@so-chung/core';
import { WHACK_SPEC } from '../whack/whackConfig';
import { WhackGame } from '../whack/WhackGame';

/** Màn 5 "Đập {phanDien}" (spec 06): game phụ 1 của Làng Dệt, bọc trong khung game phụ (thẻ bắt đầu, nút "?", màn kết quả). */
export default function Man5() {
  return <MiniGameLevel levelId={5} medals={WHACK_SPEC.medals} renderGame={(p) => <WhackGame {...p} />} />;
}
