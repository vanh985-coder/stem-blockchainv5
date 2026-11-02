/**
 * Câu nhắc của nút "?" ở màn 3 (bước HD): hàm thuần theo trạng thái ván, CHỈ TRẢ KHÓA (chữ nằm ở `content/huongDanGame.ts`, màn 3, mục `nhac`). KHÔNG lộ đáp án: không nói thẻ nào đặt vào đâu, thẻ nào là
 * trang giả hay mã trang là số mấy; chỉ nhắc luật ghép (mã trang trước khớp, mã trang đúng công thức) và việc cần làm theo vòng.
 */
import type { NhacKey } from '@so-chung/core';
import type { RebuildState } from './rebuildLogic';

export type RebuildHintKey = NhacKey<3>;

export function hintFor(s: Pick<RebuildState, 'phase' | 'deal' | 'chain' | 'fakeBinned'>): readonly RebuildHintKey[] {
  switch (s.phase) {
    case 'over':
      return ['hetVan'];
    case 'roundDone':
      return ['xongVong'];
    case 'villain':
      return ['nhetTrang'];
    default:
      if (s.deal.fake && !s.fakeBinned) return ['coTrangGia'];
      return [s.chain.length === 0 ? 'batDau' : 'ghep'];
  }
}
