import { MiniGameLevel } from '@so-chung/core';
import { CHICKEN_SPEC } from '../chicken/chickenConfig';
import { ChickenGame } from '../chicken/ChickenGame';

/** Màn 9 "Chữa đàn gà": game bắn ná cao su trên Scene25D, bọc trong khung game phụ (thẻ bắt đầu, màn kết quả). */
export default function Man9() {
  return <MiniGameLevel levelId={9} medals={CHICKEN_SPEC.medals} renderGame={(p) => <ChickenGame {...p} />} />;
}
