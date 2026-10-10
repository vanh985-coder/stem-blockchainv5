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

/** Trang cốt truyện /truyen đổi bộ icon và màu nền theo lượt (1 đến 14): 1–2 'mo', 3–11 'lang', 12–14 'hoi'. */
export const STORY_THEME_RANGES: readonly { from: number; to: number; theme: NenTheme }[] = [
  { from: 1, to: 2, theme: 'mo' },
  { from: 3, to: 11, theme: 'lang' },
  { from: 12, to: 14, theme: 'hoi' },
];

/** Hàm thuần: bộ icon của lượt truyện thứ n (đếm từ 1). Ngoài khoảng thì lấy bộ gần nhất. */
export function storyTheme(n: number): NenTheme {
  const hit = STORY_THEME_RANGES.find((r) => n >= r.from && n <= r.to);
  if (hit) return hit.theme;
  return n < STORY_THEME_RANGES[0].from ? STORY_THEME_RANGES[0].theme : STORY_THEME_RANGES[STORY_THEME_RANGES.length - 1].theme;
}

/**
 * Màu nền ấm của /truyen theo bộ (thay lớp phủ tối): 'mo' tím than → tím nhạt; 'lang' giấy dó #F6EBD3 → be ấm;
 * 'hoi' cam nhạt → vàng. Ảnh truyện mờ chỉ phủ lên trên khoảng 35%.
 */
export const THEME_GRADIENT: Record<NenTheme, string> = {
  mo: 'linear-gradient(160deg, #2b2a6b 0%, #5b4fb5 55%, #b9a9ec 100%)',
  lang: 'linear-gradient(160deg, #F6EBD3 0%, #e8cfa0 100%)',
  hoi: 'linear-gradient(160deg, #ffd3a0 0%, #ffe48a 100%)',
  giay: 'linear-gradient(160deg, #F6EBD3 0%, #e8cfa0 100%)',
  det: 'linear-gradient(160deg, #F6EBD3 0%, #e8cfa0 100%)',
  khacdau: 'linear-gradient(160deg, #F6EBD3 0%, #e8cfa0 100%)',
  bac: 'linear-gradient(160deg, #F6EBD3 0%, #e8cfa0 100%)',
};

/** Phần trăm ảnh truyện mờ phủ lên màu nền của /truyen (30 đến 40%). */
export const STORY_IMAGE_OPACITY = 0.35;

/** Thời gian chuyển dần màu nền và icon khi đổi bộ (mili giây). */
export const THEME_FADE_MS = 600;

