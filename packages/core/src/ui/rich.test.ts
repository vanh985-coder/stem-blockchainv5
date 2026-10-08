import { describe, expect, it } from 'vitest';
import { parseRich } from './rich';

describe('parseRich', () => {
  it('chữ thường không đổi', () => {
    expect(parseRich('Xin chào')).toEqual(['Xin chào']);
  });

  it('**đậm** nằm giữa câu, không cắt câu', () => {
    expect(parseRich('Chỉ một mình em giữ, dùng để **ký tên**. Tuyệt đối không để lộ!')).toEqual([
      'Chỉ một mình em giữ, dùng để ',
      { mark: 'b', children: ['ký tên'] },
      '. Tuyệt đối không để lộ!',
    ]);
  });

  it('~~nghiêng~~ và ^^chỉ số trên^^, lồng nhau được', () => {
    expect(parseRich('~~"x"~~ và **5^^x^^ mod 23**')).toEqual([
      { mark: 'i', children: ['"x"'] },
      ' và ',
      { mark: 'b', children: ['5', { mark: 'sup', children: ['x'] }, ' mod 23'] },
    ]);
  });

  it('dấu không có dấu đóng giữ nguyên là chữ', () => {
    expect(parseRich('2 ** 3')).toEqual(['2 ** 3']);
    expect(parseRich('chữ **dở')).toEqual(['chữ **dở']);
  });
});
