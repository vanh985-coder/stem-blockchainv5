import { MiniGameLevel } from '@so-chung/core';
import { MEMORY_SPEC } from '../memory/memoryConfig';
import { MemoryGame } from '../memory/MemoryGame';

/** Màn 8 "Lật thẻ tìm cặp khóa": game lật thẻ trên Scene25D, bọc trong khung game phụ (thẻ bắt đầu, màn kết quả). */
export default function Man8() {
  return <MiniGameLevel levelId={8} medals={MEMORY_SPEC.medals} renderGame={(p) => <MemoryGame {...p} />} />;
}
