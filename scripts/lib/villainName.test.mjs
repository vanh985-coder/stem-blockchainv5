import { describe, expect, it } from 'vitest';
import { findVillainName, readVillainName } from './villainName.mjs';

const hit = (s) => findVillainName(s, 'Tí').length;

describe('check:text: luật không viết cứng tên phản diện (chỉ bắt cả từ)', () => {
  it('bắt tên đứng một mình, đầu câu, trước dấu câu, trong chuỗi hay JSX', () => {
    expect(hit('Tí chạy')).toBe(1);
    expect(hit('của Tí.')).toBe(1);
    expect(hit('"Tí"')).toBe(1);
    expect(hit('<p>Gặp Tí, em nhé</p>')).toBe(1);
    expect(hit('Tí và Tí')).toBe(2);
    expect(hit('Tí')).toBe(1);
  });

  it('bắt cả khi chữ có dấu gõ kiểu tổ hợp (i + dấu sắc rời)', () => {
    expect(hit('Tí chạy')).toBe(1);
  });

  it('bỏ qua các từ chỉ bắt đầu giống tên: Tính, Tím, Tích, Tín, Tìm, Tỉ', () => {
    for (const s of ['Tính bằng máy', 'màu Tím', 'Tích số', 'Tín hiệu', 'Tìm thẻ', 'Tỉ lệ', 'Tính', 'Tím']) expect(hit(s), s).toBe(0);
  });

  it('bỏ qua khi chữ cái hay số dính sát hai bên (từ khác chứa tên)', () => {
    for (const s of ['Típ', 'aTí', 'Tí2', '2Tí', 'Tíếng']) expect(hit(s), s).toBe(0);
  });

  it('chỉ dựa vào chữ hoa: "tí nữa", "tí xíu" (từ khác nghĩa, viết thường) không bị bắt', () => {
    expect(hit('chờ tí nữa')).toBe(0);
  });

  it('readVillainName đọc tên từ dòng khai báo trong characters.ts', () => {
    expect(readVillainName("export const phanDien = 'Tí';")).toBe('Tí');
    expect(readVillainName('export const phanDien = "Cuội";')).toBe('Cuội');
    expect(readVillainName('const x = 1;')).toBeNull();
  });

  it('tên khác (đổi ở characters.ts) cũng bắt đúng cả từ, ký tự đặc biệt được thoát', () => {
    expect(findVillainName('Gặp Cuội ở đây', 'Cuội').length).toBe(1);
    expect(findVillainName('Cuộia', 'Cuội').length).toBe(0);
    expect(findVillainName('a.b', 'a.b').length).toBe(1);
    expect(findVillainName('axb', 'a.b').length).toBe(0);
  });
});
