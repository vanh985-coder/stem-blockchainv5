/**
 * Câu nhắc của nút "?" ở màn 3 (bước HD): hàm thuần theo trạng thái ván. Chữ ở `content/gameHints.ts` (`gameHints.man3`). KHÔNG lộ đáp án: không nói thẻ nào đặt vào đâu, thẻ nào là trang giả
 * hay mã trang là số mấy; chỉ nhắc luật ghép (mã trang trước khớp, mã trang đúng công thức) và việc cần làm theo vòng.
 */
import { gameHints } from '@so-chung/core';
import type { RebuildState } from './rebuildLogic';

export function hintFor(s: Pick<RebuildState, 'phase' | 'deal' | 'chain' | 'fakeBinned' | 'keep'>): string {
  const h = gameHints.man3;
  switch (s.phase) {
    case 'over':
      return h.het;
    case 'roundDone':
      return h.xongVong;
    case 'villain':
      return h.nhetTrang;
    case 'keep':
      if (!s.keep || !s.keep.running) return h.giuSoChuaChay;
      return s.keep.slots.some((c) => c === null) ? h.oTrong : h.giuSo;
    default:
      if (s.deal.fake && !s.fakeBinned) return h.coTrangGia;
      return s.chain.length === 0 ? h.batDau : h.ghep;
  }
}
