import { MiniGameLevel } from '@so-chung/core';
import { KITE_SPEC } from '../kite/kiteConfig';
import { KiteGame } from '../kite/KiteGame';

/** Màn 6 "Diều đưa sổ" (spec 06): game phụ 2 của Làng Dệt, bọc trong khung game phụ (thẻ bắt đầu, nút "?", màn kết quả). */
export default function Man6() {
  return <MiniGameLevel levelId={6} medals={KITE_SPEC.medals} renderGame={(p) => <KiteGame {...p} />} />;
}
