import type { VillageId } from '../village';

/** Thứ tự 4 làng: Giấy, Dệt, Khắc Dấu, Bạc. Mỗi làng có 3 màn liên tiếp: bài học, game 1, game 2. */
export const VILLAGE_ORDER: readonly VillageId[] = ['lang-giay', 'lang-det', 'lang-khac-dau', 'lang-bac'];

export type LevelKind = 'lesson' | 'game';

/** 'ready': chơi được. 'coming-soon': biển "Sắp ra mắt", không vào được, được tính như đã qua khi xét mở khóa. */
export type LevelStatus = 'ready' | 'coming-soon';

export interface LevelDef {
  /** Số màn, 1 đến 12 */
  id: number;
  lang: VillageId;
  kind: LevelKind;
  /** Tên màn; qua fmt() trước khi hiện (có {phanDien}) */
  ten: string;
  /** Chữ trên biển gỗ ở cảnh làng; qua fmt() trước khi hiện */
  bien: string;
  status: LevelStatus;
}

/**
 * 12 màn (tên lấy từ spec 05 đến 08).
 * Mốc 1: chỉ 4 bài học (màn 1, 4, 7, 10) là 'ready'. Đổi một game sang 'ready' khi làm xong game đó.
 */
export const LEVELS: readonly LevelDef[] = [
  { id: 1, lang: 'lang-giay', kind: 'lesson', ten: 'Trang nối trang', bien: 'Học cùng bác An', status: 'ready' },
  { id: 2, lang: 'lang-giay', kind: 'game', ten: 'Đuổi theo {phanDien}', bien: 'Đuổi theo {phanDien}', status: 'coming-soon' },
  { id: 3, lang: 'lang-giay', kind: 'game', ten: 'Ghép lại cuốn sổ', bien: 'Ghép lại cuốn sổ', status: 'coming-soon' },
  { id: 4, lang: 'lang-det', kind: 'lesson', ten: 'Cả làng cùng giữ sổ', bien: 'Học cùng cụ Bình', status: 'ready' },
  { id: 5, lang: 'lang-det', kind: 'game', ten: 'Đập {phanDien}', bien: 'Đập {phanDien}', status: 'coming-soon' },
  { id: 6, lang: 'lang-det', kind: 'game', ten: 'Diều đưa sổ', bien: 'Diều đưa sổ', status: 'coming-soon' },
  { id: 7, lang: 'lang-khac-dau', kind: 'lesson', ten: 'Khuôn riêng, mẫu chung', bien: 'Học cùng chú Dũng', status: 'ready' },
  { id: 8, lang: 'lang-khac-dau', kind: 'game', ten: 'Lật thẻ tìm cặp khóa', bien: 'Lật thẻ tìm cặp khóa', status: 'coming-soon' },
  { id: 9, lang: 'lang-khac-dau', kind: 'game', ten: 'Chữa đàn gà', bien: 'Chữa đàn gà', status: 'coming-soon' },
  { id: 10, lang: 'lang-bac', kind: 'lesson', ten: 'Cây gộp sổ', bien: 'Học cùng thầy Linh', status: 'ready' },
  { id: 11, lang: 'lang-bac', kind: 'game', ten: 'Ghép lá cây sổ', bien: 'Ghép lá cây sổ', status: 'coming-soon' },
  { id: 12, lang: 'lang-bac', kind: 'game', ten: 'Leo cây tìm lá giả', bien: 'Leo cây tìm lá giả', status: 'coming-soon' },
];

export function levelById(id: number): LevelDef | undefined {
  return LEVELS.find((l) => l.id === id);
}

export function levelsOfVillage(lang: VillageId): LevelDef[] {
  return LEVELS.filter((l) => l.lang === lang);
}
