import { describe, expect, it } from 'vitest';
import { CHARACTER_IDS, EXTRA_VARS, fmt } from './characters';
import { BI_NHAC_LAI, BI_NHAC_NHIEM, MARKET_TALKERS, NHIEM_VU } from './dialogues';

const ALLOWED = new Set<string>(['ten', 'Ten', ...CHARACTER_IDS.filter((id) => id !== 'hocSinh'), ...EXTRA_VARS]);
const ALL: [string, string][] = [
  ...MARKET_TALKERS.flatMap((t, i) => t.lines.map((l, k): [string, string] => [`talker ${i}.${k}`, l])),
  ...BI_NHAC_NHIEM.map((l, i): [string, string] => [`bi ${i}`, l]),
  ...NHIEM_VU.map((l, i): [string, string] => [`nhiemVu ${i}`, l]),
  ['biNhacLai', BI_NHAC_LAI],
];

describe('dialogues.ts', () => {
  it('không câu nào rỗng; chỉ dùng chỗ giữ tên hợp lệ; không viết cứng tên phản diện', () => {
    for (const [name, text] of ALL) {
      expect(text.trim(), name).not.toBe('');
      for (const m of text.matchAll(/\{([^}]*)\}/g)) expect(ALLOWED.has(m[1]), `${name}: {${m[1]}}`).toBe(true);
      expect(text, name).not.toMatch(/(^|[^\p{L}])Tí(?![\p{L}])/u);
    }
  });

  it('nhiệm vụ đổi tên người dẫn theo bảng nhân vật', () => {
    expect(fmt(NHIEM_VU[0])).toBe('Đến Làng Giấy ở phía bắc gặp bác An.');
    expect(fmt(NHIEM_VU[1])).toBe('Đến Làng Dệt ở phía nam gặp cụ Bình.');
    expect(fmt(NHIEM_VU[2])).toBe('Đến Làng Khắc Dấu ở phía tây gặp chú Dũng.');
    expect(fmt(NHIEM_VU[3])).toBe('Đến Làng Bạc ở phía đông gặp thầy Linh.');
  });

  it('Bi nói đúng câu của bảng mục 5 (spec 04)', () => {
    expect(BI_NHAC_NHIEM[1]).toBe('Một trang rồi! Cổng Làng Dệt đã mở.');
    expect(BI_NHAC_NHIEM[2]).toBe('Hai trang! Giờ tới Làng Khắc Dấu.');
    expect(BI_NHAC_NHIEM[3]).toBe('Ba trang! Chỉ còn Làng Bạc thôi.');
    expect(BI_NHAC_NHIEM[4]).toBe('Đủ 4 trang rồi! Cả làng đang mở hội.');
  });

  it('{ten}: có tên thì dùng tên, không có thì "em"', () => {
    expect(fmt(MARKET_TALKERS[0].lines[0], { ten: 'Lan' })).toMatch(/^Chào Lan!/);
    expect(fmt(MARKET_TALKERS[0].lines[0])).toMatch(/^Chào em!/);
    expect(fmt(BI_NHAC_LAI, { ten: 'Lan', nd: fmt(NHIEM_VU[0]) })).toBe('Nhiệm vụ của Lan bây giờ: Đến Làng Giấy ở phía bắc gặp bác An.');
  });
});

describe('dialogues.ts: đơn vị đo thế kỷ XVI', () => {
  it('lời chú nông dân dùng "thước vải", không dùng "mét" (thế kỷ XVI chưa có mét)', () => {
    const all = MARKET_TALKERS.flatMap((t) => t.lines).join(' ');
    expect(MARKET_TALKERS[1].lines[2]).toBe('Bán xong gánh này là chú mua vài thước vải ở Làng Dệt về cho vợ chú.');
    expect(all).not.toMatch(/(^|[^\p{L}])mét(?![\p{L}])/u);
  });
});
