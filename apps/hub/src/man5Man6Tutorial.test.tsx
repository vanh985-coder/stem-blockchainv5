import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { WhackGame } from '../../../packages/village-lang-det/src/whack/WhackGame';
import { KiteGame } from '../../../packages/village-lang-det/src/kite/KiteGame';
import { fmt, tutorialTexts } from '@so-chung/core';

describe('Màn 5 Đập chuột - Tích hợp Hướng dẫn focus & Làm thử', () => {
  it('tự động bật hướng dẫn làm thử khi vừa mount màn 5 (attempt = 0)', () => {
    const html = renderToStaticMarkup(
      <WhackGame
        paused={false}
        attempt={0}
        onFinish={() => {}}
        setHint={() => {}}
      />
    );

    // Tiêu đề và nội dung intro của hướng dẫn Màn 5
    expect(html).toContain(fmt(tutorialTexts.man5.tieuDe));
    expect(html).toContain(fmt(tutorialTexts.man5.intro));

    // Có lớp phủ spotlight, tooltip và nút bỏ qua
    expect(html).toContain('data-testid="tutorial-spotlight"');
    expect(html).toContain('data-testid="tutorial-tooltip"');
    expect(html).toContain(tutorialTexts.chung.boQua);
  });
});

describe('Màn 6 Diều đưa sổ - Tích hợp Hướng dẫn focus & Làm thử', () => {
  it('tự động bật hướng dẫn làm thử khi vừa mount màn 6 (attempt = 0)', () => {
    const html = renderToStaticMarkup(
      <KiteGame
        paused={false}
        attempt={0}
        onFinish={() => {}}
        setHint={() => {}}
      />
    );

    // Tiêu đề và nội dung intro của hướng dẫn Màn 6
    expect(html).toContain(fmt(tutorialTexts.man6.tieuDe));
    expect(html).toContain(fmt(tutorialTexts.man6.intro));

    // Có lớp phủ spotlight, tooltip và nút bỏ qua
    expect(html).toContain('data-testid="tutorial-spotlight"');
    expect(html).toContain('data-testid="tutorial-tooltip"');
    expect(html).toContain(tutorialTexts.chung.boQua);
  });
});
