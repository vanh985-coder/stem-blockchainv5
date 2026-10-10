import type { VillageId } from '../village';

/**
 * Bảng gán bộ icon nền trang trí (NenTrangTri) cho từng trang. Muốn đổi bộ icon của trang nào thì sửa ở đây.
 * Bộ: 'mo' (cảnh mở đầu, giấc mơ), 'lang' (chợ phiên, làng chung), 'hoi' (hội làng),
 * và 4 bộ theo làng: 'giay', 'det', 'khacdau', 'bac'.
 */
export type NenTheme = 'mo' | 'lang' | 'hoi' | 'giay' | 'det' | 'khacdau' | 'bac';

/** Trang không thuộc làng nào. */
export const PAGE_THEME = {
  trangChu: 'lang',
  hoSo: 'lang',
  dangNhap: 'lang',
  dangKy: 'lang',
  quyenRiengTu: 'lang',
  banDo: 'lang',
  /** Trang giáo viên: icon đứng yên, rất mờ (variant 'still') */
  giaoVien: 'lang',
} as const satisfies Record<string, NenTheme>;

export type PageKey = keyof typeof PAGE_THEME;

/**
 * Bộ icon của từng làng: dùng ở trang bài học (màn 1, 4, 7, 10; chỉ hai khoảng trống hai bên bảng),
 * cảnh trao Trang Sổ Vàng và giới thiệu làng.
 */
export const VILLAGE_THEME: Record<VillageId, NenTheme> = {
  'lang-giay': 'giay',
  'lang-det': 'det',
  'lang-khac-dau': 'khacdau',
  'lang-bac': 'bac',
};

/** Trang cốt truyện /truyen đổi bộ icon theo lượt (1 đến 14): 1–5 'mo', 6–11 'lang', 12–14 'hoi'. */
export const STORY_THEME_RANGES: readonly { from: number; to: number; theme: NenTheme }[] = [
  { from: 1, to: 5, theme: 'mo' },
  { from: 6, to: 11, theme: 'lang' },
  { from: 12, to: 14, theme: 'hoi' },
];

/** Hàm thuần: bộ icon của lượt truyện thứ n (đếm từ 1). Ngoài khoảng thì lấy bộ gần nhất. */
export function storyTheme(n: number): NenTheme {
  const hit = STORY_THEME_RANGES.find((r) => n >= r.from && n <= r.to);
  if (hit) return hit.theme;
  return n < STORY_THEME_RANGES[0].from ? STORY_THEME_RANGES[0].theme : STORY_THEME_RANGES[STORY_THEME_RANGES.length - 1].theme;
}
