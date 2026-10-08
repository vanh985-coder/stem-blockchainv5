import { describe, expect, it, vi } from 'vitest';
import { CHARACTERS, CHARACTER_IDS, characterNames, capitalize, fmt, formatText, makeFmt, phanDien, portraitAlt, speakerLabel } from './characters';
import { ui } from './ui';

/** Mọi chuỗi trong ui.ts, kể cả lồng nhau. */
function allStrings(node: unknown, out: string[] = []): string[] {
  if (typeof node === 'string') out.push(node);
  else if (node && typeof node === 'object') for (const v of Object.values(node)) allStrings(v, out);
  return out;
}

describe('bảng nhân vật', () => {
  it('đủ 11 id ở spec 03 mục 3.1, mỗi id có tên và id chân dung', () => {
    expect(CHARACTER_IDS).toEqual([
      'hocSinh', 'phanDien', 'baCu', 'nongDan', 'bacAn', 'cuBinh', 'coChi', 'chuDung', 'thayLinh', 'laiBuon', 'bi',
    ]);
    for (const id of CHARACTER_IDS) {
      expect(CHARACTERS[id].name).not.toBe('');
      expect(CHARACTERS[id].portrait).not.toBe('');
    }
    expect(CHARACTERS.baCu.portrait).toBe('ba-cu');
    expect(CHARACTERS.nongDan.portrait).toBe('nong-dan');
    expect(CHARACTERS.hocSinh.portrait).toBe('hoc-sinh-nam');
  });

  it('phanDien là "Tí" và tên người nói viết hoa chữ đầu', () => {
    expect(phanDien).toBe('Tí');
    expect(speakerLabel('phanDien')).toBe('Tí');
    expect(speakerLabel('bacAn')).toBe('Bác An');
    expect(speakerLabel('cuBinh')).toBe('Cụ Bình');
    expect(speakerLabel('hocSinh')).toBe('Em');
    expect(speakerLabel('hocSinh', { ten: 'lan' })).toBe('Lan');
    expect(portraitAlt('ba-cu')).toBe('Bà cụ');
  });
});

describe('fmt', () => {
  it('thay {phanDien} và tên nhân vật khác', () => {
    expect(fmt('{phanDien} chạy mất rồi')).toBe('Tí chạy mất rồi');
    expect(fmt('Hỏi {bacAn} và {coChi}')).toBe('Hỏi bác An và cô Chi');
  });

  it('{ten} và {Ten}: tên người chơi, thiếu thì là "em" và "Em"', () => {
    expect(fmt('Chào {ten}, {Ten} giỏi lắm')).toBe('Chào em, Em giỏi lắm');
    expect(fmt('Chào {ten}, {Ten} giỏi lắm', { ten: 'minh' })).toBe('Chào minh, Minh giỏi lắm');
    expect(fmt('{Ten}', { ten: '   ' })).toBe('Em');
  });

  it('{Ten} chỉ viết hoa chữ đầu, giữ nguyên phần còn lại', () => {
    expect(fmt('{Ten}', { ten: 'đức Anh' })).toBe('Đức Anh');
    expect(capitalize('ăn')).toBe('Ăn');
  });

  it('chỗ giữ số thay bằng giá trị truyền vào', () => {
    expect(fmt('Em được {so} sao', { so: 3 })).toBe('Em được 3 sao');
  });

  it('đổi phanDien thì mọi chuỗi có {phanDien} đổi theo', () => {
    const cuoi = makeFmt({ ...characterNames(), phanDien: 'Cuội' });
    const coTen = allStrings(ui).filter((s) => s.includes('{phanDien}'));
    expect(coTen.length).toBeGreaterThan(0);
    for (const s of coTen) {
      expect(cuoi(s)).toContain('Cuội');
      expect(cuoi(s)).not.toContain('Tí');
      expect(cuoi(s)).not.toContain('{phanDien}');
      expect(fmt(s)).toContain('Tí');
    }
  });

  it('chỗ giữ tên không có trong danh sách: giữ nguyên và chỉ cảnh báo', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(formatText('Xin chào {khongCo}!', characterNames())).toBe('Xin chào {khongCo}!');
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });
});
