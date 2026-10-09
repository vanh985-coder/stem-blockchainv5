import { describe, expect, it } from 'vitest';
import { CSV_BOM, buildCsv, csvField, csvLine, safeFileName } from './csv';

describe('csv', () => {
  it('ô thường giữ nguyên, kể cả tiếng Việt có dấu', () => {
    expect(csvField('Nguyễn Văn An')).toBe('Nguyễn Văn An');
    expect(csvField('')).toBe('');
  });

  it('ô có dấu phẩy được bao trong ngoặc kép', () => {
    expect(csvField('An, Bình')).toBe('"An, Bình"');
  });

  it('ngoặc kép bên trong được nhân đôi', () => {
    expect(csvField('Bạn "Bi" nhỏ')).toBe('"Bạn ""Bi"" nhỏ"');
  });

  it('ô có xuống dòng được bao trong ngoặc kép', () => {
    expect(csvField('a\nb')).toBe('"a\nb"');
  });

  it('ô bắt đầu bằng ký tự công thức được thêm dấu nháy để Excel không chạy công thức', () => {
    expect(csvField('=SUM(A1)')).toBe("'=SUM(A1)");
    expect(csvField('@lenh')).toBe("'@lenh");
    expect(csvField('+84')).toBe("'+84");
    expect(csvField('-1')).toBe("'-1");
    expect(csvField('a=b')).toBe('a=b');
  });

  it('một dòng ngăn cách bằng dấu phẩy', () => {
    expect(csvLine(['a', 'b,c', 'd"e'])).toBe('a,"b,c","d""e"');
  });

  it('cả file: có BOM UTF-8 ở đầu, dòng cách nhau CRLF, kết thúc bằng CRLF', () => {
    const out = buildCsv(['Học sinh', 'Màn 1'], [['An', '★3 ★2 ★1'], ['Bình, lớp 10', '']]);
    expect(out.startsWith(CSV_BOM)).toBe(true);
    expect(out.charCodeAt(0)).toBe(0xfeff);
    expect(out.slice(1)).toBe('Học sinh,Màn 1\r\nAn,★3 ★2 ★1\r\n"Bình, lớp 10",\r\n');
  });

  it('mã hóa UTF-8 thành 3 byte EF BB BF ở đầu file', () => {
    const bytes = new TextEncoder().encode(buildCsv(['a'], []));
    expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
  });

  it('safeFileName bỏ ký tự cấm trong tên file', () => {
    expect(safeFileName('Lớp 10A1/2')).toBe('Lớp-10A1-2');
    expect(safeFileName('  ')).toBe('lop');
    expect(safeFileName('a:b*c')).toBe('a-b-c');
  });
});
