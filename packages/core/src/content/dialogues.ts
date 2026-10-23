import type { CharacterId } from './characters';

/**
 * Lời thoại ở chợ phiên 3D (spec 04 mục 3 và 5). Mọi câu đi qua fmt() trước khi hiện: {ten} là tên học sinh, tên nhân vật viết {bacAn}, {phanDien}…
 */

/** Một người đi lại ở chợ: ai nói (chân dung, tên) và 3 câu thoại vui về phiên chợ. */
export interface MarketTalker {
  speaker: CharacterId;
  lines: readonly string[];
}

/**
 * Lời của 4 dân làng đi lại, theo thứ tự đường đi trong bố cục (bắc, nam, tây, đông): bà cụ, chú nông dân, chú nông dân, bà cụ.
 * Mỗi người 3 câu (spec yêu cầu 2 đến 3 câu).
 */
export const MARKET_TALKERS: readonly MarketTalker[] = [
  {
    speaker: 'baCu',
    lines: [
      'Chào {ten}! Phiên chợ hôm nay đông quá, bà đi từ tờ mờ sáng mà vẫn chưa mua hết đồ.',
      'Em thấy gốc đa này không? Bà nghe kể cây đa này còn già hơn cả cái đình làng.',
      'Nải chuối bà vừa mua ngọt lịm. Lát nữa em ghé sạp bên kia mua thử nhé!',
    ],
  },
  {
    speaker: 'nongDan',
    lines: [
      'Chào {ten}! Lúa nhà chú năm nay trúng lắm, chú gánh ra chợ bán từ sớm.',
      'Em ngửi thử xem, gạo mới thơm chưa? Chú nói thật, gạo của chú không pha trộn gì đâu.',
      'Bán xong gánh này là chú mua vài thước vải ở Làng Dệt về cho vợ chú.',
    ],
  },
  {
    speaker: 'nongDan',
    lines: [
      'Ô, {ten} đấy à? Chú vừa bán hết một gánh rau, nhẹ cả vai!',
      'Chợ phiên là thế: ai cũng mang đồ nhà làm ra đổi lấy thứ mình cần. Vui lắm.',
      'Em cứ đi dọc con đường đất kia là tới cổng làng. Đi cẩn thận nhé!',
    ],
  },
  {
    speaker: 'baCu',
    lines: [
      'Ôi chao, lâu lắm bà mới thấy chợ vui thế này. Ai cũng cười, ai cũng trả giá!',
      'Bà mua cái nồi đất này để nấu canh cua. Canh cua mà nấu nồi đất thì ngon hết sảy.',
      'Chợ đông dễ lạc lắm, em nhớ đi cho tỉnh táo nhé.',
    ],
  },
];

/**
 * Bi nhắc nhiệm vụ khi nói chuyện (E), theo số Trang Sổ Vàng đang có (0 đến 4). Câu đầu là câu Bi nói của bảng mục 5 (0 trang: câu ở cảnh mở đầu,
 * mục 4); câu sau là nhiệm vụ hiện tại.
 */
export const BI_NHAC_NHIEM: readonly string[] = [
  'Chỉ còn cổng Làng Giấy mở. Đi thôi!',
  'Một trang rồi! Cổng Làng Dệt đã mở.',
  'Hai trang! Giờ tới Làng Khắc Dấu.',
  'Ba trang! Chỉ còn Làng Bạc thôi.',
  'Đủ 4 trang rồi! Cả làng đang mở hội.',
];

/** Dòng nhiệm vụ theo số Trang Sổ Vàng (mục 5; 0 trang là nhiệm vụ đầu tiên, mục 4). */
export const NHIEM_VU: readonly string[] = [
  'Đến Làng Giấy ở phía bắc gặp {bacAn}.',
  'Đến Làng Dệt ở phía nam gặp {cuBinh}.',
  'Đến Làng Khắc Dấu ở phía tây gặp {chuDung}.',
  'Đến Làng Bạc ở phía đông gặp {thayLinh}.',
  'Cả làng đang mở hội. Hãy đến dự hội làng nhé!',
];

/** Khi đủ 4 trang mà hội làng chưa ra mắt (cờ `FESTIVAL_LAUNCHED` = false, config/festival.ts): dòng nhiệm vụ và lời Bi thay cho `NHIEM_VU[4]` và `BI_NHAC_NHIEM[4]`. */
export const NHIEM_VU_HOI_SAP_MO = 'Em đã có đủ 4 Trang Sổ Vàng! Hội làng sắp mở.';
export const BI_NHAC_HOI_SAP_MO = 'Đủ 4 trang rồi! Hội làng sắp mở.';

/** Câu thứ hai của Bi: nhắc lại nhiệm vụ. {nd} là dòng nhiệm vụ đã fmt. */
export const BI_NHAC_LAI = 'Nhiệm vụ của {ten} bây giờ: {nd}';
