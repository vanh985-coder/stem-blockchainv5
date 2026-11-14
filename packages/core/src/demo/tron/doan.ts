/** Số chữ lời thuyết minh của từng mã đoạn trong KICH-BAN-VIDEO-TRON-GAME.md (không kể chỗ [SL: ...]). Mỗi đoạn kéo dài tối thiểu số chữ / 2,5 giây (đọc khoảng 150 chữ/phút). Sinh từ file kịch bản. */
export const DOAN_WORDS: Readonly<Record<string, number>> = {
  S01: 48,
  S02: 97,
  S03: 103,
  G01: 32,
  G03: 75,
  G04: 45,
  G05: 52,
  G06: 61,
  G07: 97,
  G08: 93,
  G09: 86,
  G10: 97,
  G11: 55,
  G12: 88,
  G13: 59,
  G14: 105,
  D01: 35,
  D03: 89,
  D04: 68,
  D05: 46,
  D06: 30,
  D07: 97,
  D08: 60,
  D09: 140,
  D10: 43,
  D11: 47,
  K01: 39,
  K02: 99,
  K03: 56,
  K04: 50,
  K05: 56,
  K06: 89,
  K07: 95,
  K08: 44,
  K09: 61,
  B01: 39,
  B02: 80,
  B03: 66,
  B04: 73,
  B05: 81,
  B06: 87,
  B07: 87,
  B08: 92,
  B09: 56,
  B11: 59,
};

export const DOAN_CODES: readonly string[] = Object.keys(DOAN_WORDS);

/** Số giây đọc mỗi chữ: 150 chữ/phút = 2,5 chữ/giây */
export const WORDS_PER_SEC = 2.5;

/** Thời lượng tối thiểu (mili giây) của một đoạn. */
export function minDoanMs(code: string): number {
  const n = DOAN_WORDS[code];
  if (n === undefined) throw new Error(`unknown segment: ${code}`);
  return Math.ceil((n / WORDS_PER_SEC) * 1000);
}
