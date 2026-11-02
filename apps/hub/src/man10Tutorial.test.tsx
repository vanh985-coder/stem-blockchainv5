import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Easy } from '../../../packages/village-lang-bac/src/bai-4/Easy';
import { Medium } from '../../../packages/village-lang-bac/src/bai-4/Medium';
import { Hard } from '../../../packages/village-lang-bac/src/bai-4/Hard';
import { tutorialTexts } from '@so-chung/core';

describe('Màn 10 Trạm Dễ - Tích hợp Hướng dẫn focus & Làm thử', () => {
  it('tự động bật hướng dẫn làm thử khi vừa mount màn 10 trạm Dễ', () => {
    const html = renderToStaticMarkup(
      <Easy onComplete={() => {}} onFail={() => {}} />
    );

    // Tiêu đề và vùng spotlight
    expect(html).toContain(tutorialTexts.man10De.tieuDe);
    expect(html).toContain('id="tutorial-man10de-table"');
    expect(html).toContain('id="tutorial-man10de-pair"');
    expect(html).toContain('id="tutorial-man10de-input"');

    // Có lớp phủ spotlight và tooltip
    expect(html).toContain('data-testid="tutorial-spotlight"');
    expect(html).toContain('data-testid="tutorial-tooltip"');
    expect(html).toContain(tutorialTexts.chung.boQua);
  });
});

describe('Màn 10 Trạm Trung bình - Tích hợp Hướng dẫn focus & Làm thử', () => {
  it('tự động bật hướng dẫn làm thử khi vừa mount màn 10 trạm Trung bình', () => {
    const html = renderToStaticMarkup(
      <Medium onComplete={() => {}} onFail={() => {}} />
    );

    // Tiêu đề và vùng spotlight
    expect(html).toContain(tutorialTexts.man10Tb.tieuDe);
    expect(html).toContain('id="tutorial-man10tb-tree"');
    expect(html).toContain('id="tutorial-man10tb-calc"');
    expect(html).toContain('id="tutorial-man10tb-controls"');

    // Có lớp phủ spotlight và tooltip
    expect(html).toContain('data-testid="tutorial-spotlight"');
    expect(html).toContain('data-testid="tutorial-tooltip"');
    expect(html).toContain(tutorialTexts.chung.boQua);
  });
});

describe('Màn 10 Trạm Khó - Tích hợp Hướng dẫn focus & Làm thử', () => {
  it('tự động bật hướng dẫn làm thử khi vừa mount màn 10 trạm Khó', () => {
    const html = renderToStaticMarkup(
      <Hard onComplete={() => {}} />
    );

    // Tiêu đề và vùng spotlight
    expect(html).toContain(tutorialTexts.man10Kho.tieuDe);
    expect(html).toContain('id="tutorial-man10kho-table"');
    expect(html).toContain('id="tutorial-man10kho-tree"');
    expect(html).toContain('id="tutorial-man10kho-check"');
    expect(html).toContain('id="tutorial-man10kho-tray"');

    // Có lớp phủ spotlight và tooltip
    expect(html).toContain('data-testid="tutorial-spotlight"');
    expect(html).toContain('data-testid="tutorial-tooltip"');
    expect(html).toContain(tutorialTexts.chung.boQua);
  });
});
