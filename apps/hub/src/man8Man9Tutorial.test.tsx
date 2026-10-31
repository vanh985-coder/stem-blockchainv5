import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { MemoryGame } from '../../../packages/village-lang-khac-dau/src/memory/MemoryGame';
import { ChickenGame } from '../../../packages/village-lang-khac-dau/src/chicken/ChickenGame';
import { fmt, tutorialTexts } from '@so-chung/core';

describe('Màn 8 Lật thẻ - Tích hợp Hướng dẫn focus & Làm thử', () => {
  it('tự động bật hướng dẫn làm thử khi vừa mount màn 8 (attempt = 0)', () => {
    const html = renderToStaticMarkup(
      <MemoryGame
        paused={false}
        attempt={0}
        onFinish={() => {}}
        setHint={() => {}}
      />
    );

    // Tiêu đề và nội dung intro của hướng dẫn Màn 8
    expect(html).toContain(fmt(tutorialTexts.man8.tieuDe));
    expect(html).toContain(fmt(tutorialTexts.man8.intro));

    // Có lớp phủ spotlight, tooltip và nút bỏ qua
    expect(html).toContain('data-testid="tutorial-spotlight"');
    expect(html).toContain('data-testid="tutorial-tooltip"');
    expect(html).toContain(tutorialTexts.chung.boQua);
  });
});

describe('Màn 9 Chữa gà - Tích hợp Hướng dẫn focus & Làm thử', () => {
  it('tự động bật hướng dẫn làm thử khi vừa mount màn 9 (attempt = 0)', () => {
    const html = renderToStaticMarkup(
      <ChickenGame
        paused={false}
        attempt={0}
        onFinish={() => {}}
        setHint={() => {}}
      />
    );

    // Tiêu đề và nội dung intro của hướng dẫn Màn 9
    expect(html).toContain(fmt(tutorialTexts.man9.tieuDe));
    expect(html).toContain(fmt(tutorialTexts.man9.intro));

    // Có lớp phủ spotlight, tooltip và nút bỏ qua
    expect(html).toContain('data-testid="tutorial-spotlight"');
    expect(html).toContain('data-testid="tutorial-tooltip"');
    expect(html).toContain(tutorialTexts.chung.boQua);
  });
});
