import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { KNOW_QUIZ, KnowQuizDialog, villageKnowCards } from '@so-chung/core';

const noop = () => undefined;
const render = (village: 'lang-giay' | 'lang-det' | 'lang-khac-dau' | 'lang-bac', i: number, mode: 'collect' | 'review') =>
  renderToStaticMarkup(<KnowQuizDialog mode={mode} card={villageKnowCards(village)[i]} quiz={KNOW_QUIZ[village][i]} index={i} total={4} onCollect={noop} onClose={noop} />);

describe('KnowQuizDialog (thẻ có câu hỏi, P6b)', () => {
  it('chế độ nhặt, câu ABCD: có nội dung, ví dụ, câu hỏi, bốn phương án đúng thứ tự A B C D, nút Kiểm tra; chưa có đáp án, giải thích hay nút Cất vào sổ', () => {
    const html = render('lang-giay', 0, 'collect');
    expect(html).toContain('Blockchain là một cuốn sổ.');
    expect(html).toContain('data-testid="the-vi-du"');
    expect(html).toContain('Câu hỏi: ');
    const pos = ['A.', 'B.', 'C.', 'D.'].map((l) => html.indexOf(`aria-hidden="true">${l}</span>`));
    expect(pos.every((p) => p > 0)).toBe(true);
    expect([...pos].sort((a, b) => a - b)).toEqual(pos);
    expect(html).toContain('Kiểm tra');
    expect(html).not.toContain('data-testid="phan-hoi"');
    expect(html).not.toContain('Cất vào sổ');
    expect(html).toContain('data-phase="ask"');
  });
  it('câu điền số: ô văn bản với bàn phím số, KHÔNG dùng type="number"', () => {
    const html = render('lang-giay', 2, 'collect');
    expect(html).toContain('type="text"');
    expect(html).toContain('inputMode="numeric"');
    expect(html).toContain('pattern="[0-9]*"');
    expect(html).not.toContain('type="number"');
    expect(html).toContain('autoComplete="off"');
  });
  it('chế độ xem lại (thẻ đã nhặt): hiện đáp án đúng và giải thích, không có nút Kiểm tra, không có Cất vào sổ, nói rõ không cần trả lời lại', () => {
    const html = render('lang-bac', 1, 'review');
    expect(html).toContain('data-testid="phan-hoi"');
    expect(html).toContain('Đáp án đúng: 288');
    expect(html).toContain('Giải thích: ');
    expect(html).toContain('không cần trả lời lại');
    expect(html).not.toContain('Kiểm tra');
    expect(html).not.toContain('Cất vào sổ');
    expect(html).not.toContain('data-testid="o-nhap-so"');
    expect(html).toContain('data-phase="review"');
  });
  it('xem lại câu ABCD: đánh dấu đáp án đúng bằng chữ, mọi phương án khóa (fieldset disabled)', () => {
    const html = render('lang-det', 2, 'review');
    expect(html).toContain('Đáp án đúng: C. Không được ghi');
    expect(html).toContain('✓ </span>Đáp án đúng');
    expect(html).toContain('<fieldset');
    expect(html).toMatch(/<fieldset[^>]*disabled/);
  });
  it('dùng tên nhân vật hiện có, không viết cứng phản diện: {phanDien} đã được thay', () => {
    const html = render('lang-giay', 1, 'collect');
    expect(html).not.toContain('{phanDien}');
    expect(html).toContain('Tí');
  });
});
