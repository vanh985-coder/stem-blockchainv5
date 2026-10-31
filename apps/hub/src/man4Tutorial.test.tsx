import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Easy } from '../../../packages/village-lang-det/src/bai-2/Easy';
import { Medium } from '../../../packages/village-lang-det/src/bai-2/Medium';
import { Hard } from '../../../packages/village-lang-det/src/bai-2/Hard';
import { tutorialTexts } from '@so-chung/core';

describe('Màn 4 Trạm Dễ - Tích hợp Hướng dẫn focus & Làm thử (P8c)', () => {
  it('tự động bật hướng dẫn làm thử khi vừa mount màn 4 trạm Dễ', () => {
    const html = renderToStaticMarkup(
      <Easy onComplete={() => {}} onFail={() => {}} />
    );

    // Tiêu đề và vùng spotlight data-tutorial
    expect(html).toContain(tutorialTexts.man4De.tieuDe);
    expect(html).toContain('data-tutorial="my-ledger"');
    expect(html).toContain('data-tutorial="proposal-card"');
    expect(html).toContain('data-tutorial="calculator"');
    expect(html).toContain('data-tutorial="decision-buttons"');

    // Có lớp phủ spotlight và tooltip
    expect(html).toContain('data-testid="tutorial-spotlight"');
    expect(html).toContain('data-testid="tutorial-tooltip"');
    expect(html).toContain(tutorialTexts.chung.boQua);
  });

  it('dữ liệu mẫu làm thử Dễ cố định: sổ của em X = 40, c = 15, mã đề xuất 95', () => {
    const html = renderToStaticMarkup(
      <Easy onComplete={() => {}} onFail={() => {}} />
    );
    // Có mã cuối 40 của sổ của em trong phần làm thử
    expect(html).toContain('40');
    // Có số lượng dải lụa c = 15
    expect(html).toContain('15');
    // Có mã đề xuất 95
    expect(html).toContain('95');
  });
});

describe('Màn 4 Trạm Trung bình - Tích hợp Hướng dẫn focus & Làm thử (P8c)', () => {
  it('tự động bật hướng dẫn làm thử khi vừa mount màn 4 trạm Trung bình', () => {
    const html = renderToStaticMarkup(
      <Medium onComplete={() => {}} onFail={() => {}} />
    );

    // Tiêu đề và vùng spotlight data-tutorial
    expect(html).toContain(tutorialTexts.man4Tb.tieuDe);
    expect(html).toContain('data-tutorial="my-ledger"');
    expect(html).toContain('data-tutorial="compare-ledgers"');
    expect(html).toContain('data-tutorial="sender-ledger"');
    expect(html).toContain('data-tutorial="calculator"');
    expect(html).toContain('data-tutorial="decision-buttons"');

    // Có lớp phủ spotlight và tooltip
    expect(html).toContain('data-testid="tutorial-spotlight"');
    expect(html).toContain('data-testid="tutorial-tooltip"');
    expect(html).toContain(tutorialTexts.chung.boQua);
  });

  it('dữ liệu mẫu làm thử Trung bình cố định: Tí gửi sổ bị sửa lén ở trang 2 từ 14 sang 15', () => {
    const html = renderToStaticMarkup(
      <Medium onComplete={() => {}} onFail={() => {}} />
    );
    // Sổ của em có mã 72, trang mới của Tí có prevCode 74
    expect(html).toContain('72');
    expect(html).toContain('74');
  });
});

describe('Màn 4 Trạm Khó - Tích hợp Hướng dẫn focus & Làm thử (P8c)', () => {
  it('tự động bật hướng dẫn làm thử khi vừa mount màn 4 trạm Khó', () => {
    const html = renderToStaticMarkup(
      <Hard onComplete={() => {}} />
    );

    // Tiêu đề và vùng spotlight data-tutorial
    expect(html).toContain(tutorialTexts.man4Kho.tieuDe);
    expect(html).toContain('data-tutorial="stake-panel"');
    expect(html).toContain('data-tutorial="create-info"');
    expect(html).toContain('data-tutorial="honest-card"');

    // Có lớp phủ spotlight và tooltip
    expect(html).toContain('data-testid="tutorial-spotlight"');
    expect(html).toContain('data-testid="tutorial-tooltip"');
    expect(html).toContain(tutorialTexts.chung.boQua);
  });

  it('dữ liệu mẫu làm thử Khó cố định: X = 25, c = 18, mã đúng 68', () => {
    const html = renderToStaticMarkup(
      <Hard onComplete={() => {}} />
    );
    // Giá trị X = 25 và c = 18
    expect(html).toContain('25');
    expect(html).toContain('18');
  });
});
