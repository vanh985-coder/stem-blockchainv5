import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Easy } from '../../../packages/village-lang-giay/src/bai-1/Easy';
import { tutorialTexts } from '@so-chung/core';

describe('Màn 1 Trạm Dễ - Tích hợp Hướng dẫn focus & Làm thử (P8a)', () => {
  it('tự động bật hướng dẫn làm thử khi vừa mount màn 1 trạm Dễ', () => {
    const html = renderToStaticMarkup(
      <Easy onComplete={() => {}} onChainBuilt={() => {}} />
    );

    // Tiêu đề và dải chuỗi ở chế độ làm thử
    expect(html).toContain(tutorialTexts.man1De.tieuDe);
    expect(html).toContain('data-tutorial="chain-strip"');
    expect(html).toContain('data-tutorial="formula-box"');
    expect(html).toContain('data-tutorial="check-button"');
    expect(html).toContain('data-tutorial="code-input"');

    // Có lớp phủ spotlight và tooltip
    expect(html).toContain('data-testid="tutorial-spotlight"');
    expect(html).toContain('data-testid="tutorial-tooltip"');
    expect(html).toContain(tutorialTexts.man1De.intro);
    expect(html).toContain(tutorialTexts.chung.boQua);
  });

  it('dữ liệu mẫu làm thử cố định: trang bìa 12, nội dung 5', () => {
    const html = renderToStaticMarkup(
      <Easy onComplete={() => {}} onChainBuilt={() => {}} />
    );
    // Khung công thức thế số cho ví dụ mẫu: 12 và 5
    expect(html).toContain('(12 × 2 + 5) mod 100 = ?');
  });
});
