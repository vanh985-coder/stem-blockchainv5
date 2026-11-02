import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { RunnerGame } from '../../../packages/village-lang-giay/src/runner/RunnerGame';
import { RebuildGame } from '../../../packages/village-lang-giay/src/rebuild/RebuildGame';
import { fmt, tutorialTexts } from '@so-chung/core';

describe('Màn 2 Runner - Tích hợp Hướng dẫn focus & Làm thử', () => {
  it('tự động bật hướng dẫn làm thử khi vừa mount màn 2 (attempt = 0)', () => {
    const html = renderToStaticMarkup(
      <RunnerGame
        paused={false}
        attempt={0}
        onFinish={() => {}}
        setHint={() => {}}
      />
    );

    // Tiêu đề và nội dung intro của hướng dẫn Màn 2
    expect(html).toContain(fmt(tutorialTexts.man2.tieuDe));
    expect(html).toContain(fmt(tutorialTexts.man2.intro));

    // Có lớp phủ spotlight, tooltip và nút bỏ qua
    expect(html).toContain('data-testid="tutorial-spotlight"');
    expect(html).toContain('data-testid="tutorial-tooltip"');
    expect(html).toContain(tutorialTexts.chung.boQua);
  });
});

describe('Màn 3 Ghép sổ - Tích hợp Hướng dẫn focus & Làm thử', () => {
  it('tự động bật hướng dẫn làm thử khi vừa mount màn 3 (attempt = 0)', () => {
    const html = renderToStaticMarkup(
      <RebuildGame
        paused={false}
        attempt={0}
        onFinish={() => {}}
        setHint={() => {}}
      />
    );

    // Tiêu đề và nội dung intro của hướng dẫn Màn 3
    expect(html).toContain(fmt(tutorialTexts.man3.tieuDe));
    expect(html).toContain(fmt(tutorialTexts.man3.intro));

    // Có lớp phủ spotlight, tooltip và nút bỏ qua
    expect(html).toContain('data-testid="tutorial-spotlight"');
    expect(html).toContain('data-testid="tutorial-tooltip"');
    expect(html).toContain(tutorialTexts.chung.boQua);
  });
});
