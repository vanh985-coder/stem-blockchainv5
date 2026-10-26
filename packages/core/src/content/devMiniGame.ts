/**
 * Chữ của trang thử `/dev/minigame` (chỉ có khi chạy dev, `apps/hub/src/DevMiniGame.tsx`): game giả với các nút kết thúc có điểm cho trước và các dòng điểm mẫu (độ dài như thật để thử màn kết quả ở điện thoại ngang).
 * Nằm ở content/ vì `pnpm check:text` không cho chữ tiếng Việt nằm ngoài thư mục này.
 */
import type { ScorePart } from '../ui/MiniGameLevel';

export const devMiniGameText = {
  tieuDe: 'Dev: game giả (lần {so})',
  ketThuc5: 'Kết thúc 340 điểm, 5 dòng',
  ketThuc4: 'Kết thúc 682 điểm, 4 dòng',
  ketThucDiem: 'Kết thúc {so} điểm',
} as const;

/** Năm dòng điểm mẫu (như màn 3). */
export const DEV_PARTS_5: readonly ScorePart[] = [
  { label: 'Vòng 1 (số lần sai)', count: 1, points: 90 },
  { label: 'Vòng 2 (số lần sai)', count: 0, points: 100 },
  { label: 'Vòng 2: bỏ đúng trang giả vào rổ', count: 1, points: 30 },
  { label: 'Vòng 3 (số lần sai)', count: 1, points: 90 },
  { label: 'Vòng 3: bỏ đúng trang giả vào rổ', count: 1, points: 30 },
];

/** Bốn dòng điểm mẫu (như màn 2). */
export const DEV_PARTS_4: readonly ScorePart[] = [
  { label: 'Trang sổ nhặt được', count: 42, points: 420 },
  { label: 'Tiền đồng', count: 34, points: 34 },
  { label: 'Quãng đường chạy (mét)', count: 1080, points: 108 },
  { label: 'Câu hỏi trả lời đúng', count: 4, points: 120 },
];
