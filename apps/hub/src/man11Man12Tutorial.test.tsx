import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Match3Game } from '../../../packages/village-lang-bac/src/match3/Match3Game';
import { ClimbGame } from '../../../packages/village-lang-bac/src/climb/ClimbGame';
import { fmt, tutorialTexts } from '@so-chung/core';

describe('Màn 11 Ghép lá - Tích hợp Hướng dẫn focus & Làm thử', () => {
  it('tự động bật hướng dẫn làm thử khi vừa mount màn 11 (attempt = 0)', () => {
    const html = renderToStaticMarkup(
      <Match3Game
        paused={false}
        attempt={0}
        onFinish={() => {}}
        setHint={() => {}}
      />
    );

    // Tiêu đề và nội dung intro của hướng dẫn Màn 11
    expect(html).toContain(fmt(tutorialTexts.man11.tieuDe));
    expect(html).toContain(fmt(tutorialTexts.man11.intro));

    // Có lớp phủ spotlight, tooltip và nút bỏ qua
    expect(html).toContain('data-testid="tutorial-spotlight"');
    expect(html).toContain('data-testid="tutorial-tooltip"');
    expect(html).toContain(tutorialTexts.chung.boQua);
  });
});

describe('Màn 12 Leo cây - Tích hợp Hướng dẫn focus & Làm thử', () => {
  it('tự động bật hướng dẫn làm thử khi vừa mount màn 12 (attempt = 0)', () => {
    const html = renderToStaticMarkup(
      <ClimbGame
        paused={false}
        attempt={0}
        onFinish={() => {}}
        setHint={() => {}}
      />
    );

    // Tiêu đề và nội dung intro của hướng dẫn Màn 12
    expect(html).toContain(fmt(tutorialTexts.man12.tieuDe));
    expect(html).toContain(fmt(tutorialTexts.man12.intro));

    // Có lớp phủ spotlight, tooltip và nút bỏ qua
    expect(html).toContain('data-testid="tutorial-spotlight"');
    expect(html).toContain('data-testid="tutorial-tooltip"');
    expect(html).toContain(tutorialTexts.chung.boQua);
  });
});
