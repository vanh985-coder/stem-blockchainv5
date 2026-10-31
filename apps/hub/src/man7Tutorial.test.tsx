import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Easy } from '../../../packages/village-lang-khac-dau/src/bai-3/Easy';
import { Medium } from '../../../packages/village-lang-khac-dau/src/bai-3/Medium';
import { Hard } from '../../../packages/village-lang-khac-dau/src/bai-3/Hard';
import { tutorialTexts } from '@so-chung/core';

describe('Màn 7 Trạm Dễ - Tích hợp Hướng dẫn focus & Làm thử', () => {
  it('tự động bật hướng dẫn làm thử khi vừa mount màn 7 trạm Dễ', () => {
    const html = renderToStaticMarkup(
      <Easy onComplete={() => {}} onFail={() => {}} />
    );

    // Tiêu đề và vùng spotlight
    expect(html).toContain(tutorialTexts.man7De.tieuDe);
    expect(html).toContain('id="tutorial-man7de-keys"');
    expect(html).toContain('id="tutorial-man7de-sign-card"');
    expect(html).toContain('id="tutorial-man7de-sign-btn"');

    // Có lớp phủ spotlight và tooltip
    expect(html).toContain('data-testid="tutorial-spotlight"');
    expect(html).toContain('data-testid="tutorial-tooltip"');
    expect(html).toContain(tutorialTexts.chung.boQua);
  });

  it('dữ liệu khóa mẫu của Em: Khóa riêng 12, Khóa công khai 18', () => {
    const html = renderToStaticMarkup(
      <Easy onComplete={() => {}} onFail={() => {}} />
    );
    expect(html).toContain('18');
    expect(html).toContain('5¹² mod 23');
  });
});

describe('Màn 7 Trạm Trung bình - Tích hợp Hướng dẫn focus & Làm thử', () => {
  it('tự động bật hướng dẫn làm thử khi vừa mount màn 7 trạm Trung bình', () => {
    const html = renderToStaticMarkup(
      <Medium onComplete={() => {}} onFail={() => {}} />
    );

    // Tiêu đề và vùng spotlight
    expect(html).toContain(tutorialTexts.man7Tb.tieuDe);
    expect(html).toContain('id="tutorial-man7tb-danhba"');
    expect(html).toContain('id="tutorial-man7tb-machine"');
    expect(html).toContain('id="tutorial-man7tb-first-tx"');

    // Có lớp phủ spotlight và tooltip
    expect(html).toContain('data-testid="tutorial-spotlight"');
    expect(html).toContain('data-testid="tutorial-tooltip"');
    expect(html).toContain(tutorialTexts.chung.boQua);
  });
});

describe('Màn 7 Trạm Khó - Tích hợp Hướng dẫn focus & Làm thử', () => {
  it('tự động bật hướng dẫn làm thử khi vừa mount màn 7 trạm Khó', () => {
    const html = renderToStaticMarkup(
      <Hard onComplete={() => {}} />
    );

    // Tiêu đề và vùng spotlight
    expect(html).toContain(tutorialTexts.man7Kho.tieuDe);
    expect(html).toContain('id="tutorial-man7kho-target"');
    expect(html).toContain('id="tutorial-man7kho-input-box"');
    expect(html).toContain('id="tutorial-man7kho-try-btn"');

    // Có lớp phủ spotlight và tooltip
    expect(html).toContain('data-testid="tutorial-spotlight"');
    expect(html).toContain('data-testid="tutorial-tooltip"');
    expect(html).toContain(tutorialTexts.chung.boQua);
  });
});
