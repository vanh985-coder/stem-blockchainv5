import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Medium } from '../../../packages/village-lang-giay/src/bai-1/Medium';
import { Hard } from '../../../packages/village-lang-giay/src/bai-1/Hard';
import { tutorialTexts } from '@so-chung/core';

describe('Màn 1 Trạm Trung bình - Tích hợp Hướng dẫn focus & Làm thử (P8b)', () => {
  it('tự động bật hướng dẫn làm thử khi vừa mount màn 1 trạm Trung bình', () => {
    const html = renderToStaticMarkup(
      <Medium onComplete={() => {}} saved={null} />
    );

    // Tiêu đề và vùng làm thử
    expect(html).toContain(tutorialTexts.man1Tb.tieuDe);
    expect(html).toContain('data-tutorial="practice-area"');
    expect(html).toContain('data-tutorial="chain-strip"');
    expect(html).toContain('data-tutorial="formula-box"');
    expect(html).toContain('data-tutorial="check-button"');
    expect(html).toContain('data-tutorial="code-input"');

    // Có lớp phủ spotlight và tooltip
    expect(html).toContain('data-testid="tutorial-spotlight"');
    expect(html).toContain('data-testid="tutorial-tooltip"');
    expect(html).toContain(tutorialTexts.chung.boQua);
  });

  it('dữ liệu mẫu làm thử Trung bình cố định: trang bìa 12, nội dung trang 2 đổi thành 9, mã trước 29', () => {
    const html = renderToStaticMarkup(
      <Medium onComplete={() => {}} saved={null} />
    );
    // Khung công thức thế số cho ví dụ mẫu: 29 và 9
    expect(html).toContain('(29 × 2 + 9) mod 100 = ?');
    expect(tutorialTexts.man1Tb.chuaNhap).toBe(
      'Em chưa nhập mã trang. Hãy tính nhẩm và nhập số từ 0 đến 99 vào ô mã trang nhé!'
    );
  });
});

describe('Màn 1 Trạm Khó - Tích hợp Hướng dẫn focus & Làm thử (P8b)', () => {
  it('tự động bật hướng dẫn làm thử khi vừa mount màn 1 trạm Khó', () => {
    const html = renderToStaticMarkup(
      <Hard onComplete={() => {}} />
    );

    // Tiêu đề và thanh thống kê stats-bar
    expect(html).toContain(tutorialTexts.man1Kho.tieuDe);
    expect(html).toContain('data-tutorial="stats-bar"');
    expect(html).toContain('data-tutorial="practice-area"');
    expect(html).toContain('data-tutorial="chain-strip"');
    expect(html).toContain('data-tutorial="formula-box"');
    expect(html).toContain('data-tutorial="check-button"');
    expect(html).toContain('data-tutorial="code-input"');

    // Có lớp phủ spotlight và tooltip
    expect(html).toContain('data-testid="tutorial-spotlight"');
    expect(html).toContain('data-testid="tutorial-tooltip"');
    expect(html).toContain(tutorialTexts.chung.boQua);
  });

  it('dữ liệu mẫu làm thử Khó cố định: trang bìa 10, trang 1 mã 24, trang 2 nội dung 7', () => {
    const html = renderToStaticMarkup(
      <Hard onComplete={() => {}} />
    );
    // Khung công thức thế số cho ví dụ mẫu: 24 và 7
    expect(html).toContain('(24 × 2 + 7) mod 100 = ?');
    expect(tutorialTexts.man1Kho.chuaNhap).toBe(
      'Em chưa nhập mã trang. Hãy tính nhẩm và nhập số từ 0 đến 99 vào ô mã trang nhé!'
    );
  });
});
