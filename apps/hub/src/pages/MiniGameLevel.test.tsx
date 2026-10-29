import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { MiniGameLevel, ProgressContext, computeUnlock, decodeProgress, type Progress, type ProgressState } from '@so-chung/core';

const stateOf = (progress: Progress): ProgressState => ({
  mode: 'guest',
  progress,
  coins: 0,
  goldenPages: 0,
  unlock: computeUnlock({ doneLevels: [] }),
  saving: false,
  synced: true,
  record: () => ({ coinsEarned: 0 }),
  saveNow: async () => 'saved',
  startGuest: () => {},
  markVillageIntroSeen: () => {},
  markVillageSceneSeen: () => {},
  markGoldenSeen: () => {},
  markGateOpenSeen: () => {},
  markKnowSeen: () => {},
  markKnowCard: () => {},
  markAllKnowCards: () => {},
  markGuideSeen: () => {},
  markStoryRead: () => {},
  markGameTipSeen: () => {},
  markClimaxSeen: () => {}, canAutoComplete: false, autoStatus: 'yes', autoComplete: async () => 'unavailable',
});

function render(progress: Progress): string {
  return renderToStaticMarkup(
    <ProgressContext.Provider value={stateOf(progress)}>
      <MemoryRouter>
        <MiniGameLevel levelId={2} medals={[200, 380, 520]} renderGame={() => <div>GAME</div>} />
      </MemoryRouter>
    </ProgressContext.Provider>,
  );
}

describe('MiniGameLevel: điểm cao nhất và kỷ lục từ phiên bản trước (màn 3 sau P4b)', () => {
  const withBest = (best: number): Progress => ({ ...decodeProgress(null), levels: { 3: { played: true, completed: false, stars: { game: 3 }, bestScore: best, updatedAt: 1 } } });
  const card = (best: number | null, max?: number): string =>
    renderToStaticMarkup(
      <ProgressContext.Provider value={stateOf(best === null ? decodeProgress(null) : withBest(best))}>
        <MemoryRouter>
          <MiniGameLevel levelId={3} medals={[290, 320, 330]} maxScore={max} renderGame={() => <div />} />
        </MemoryRouter>
      </ProgressContext.Provider>,
    );
  it('chưa có kỷ lục: "Em chưa chơi màn này", không chú thích', () => {
    const html = card(null, 355);
    expect(html).toContain('Em chưa chơi màn này.');
    expect(html).not.toContain('Kỷ lục từ phiên bản trước');
  });
  it('kỷ lục trong khoảng 0 đến 355 (kể cả đúng 355): hiện điểm, KHÔNG chú thích (điểm ≤ 355 chưa phân biệt được phiên bản)', () => {
    for (const b of [1, 300, 355]) {
      const html = card(b, 355);
      expect(html).toContain(`Điểm cao nhất: ${b}`);
      expect(html).not.toContain('Kỷ lục từ phiên bản trước');
    }
  });
  it('kỷ lục cũ trên 355: giữ nguyên điểm và thêm chú thích "Kỷ lục từ phiên bản trước"', () => {
    const html = card(480, 355);
    expect(html).toContain('Điểm cao nhất: 480');
    expect(html).toContain('Kỷ lục từ phiên bản trước');
    expect(html).toContain('data-testid="ky-luc-cu"');
  });
  it('game không khai báo điểm tối đa (maxScore) thì không bao giờ có chú thích', () => {
    expect(card(9999)).not.toContain('Kỷ lục từ phiên bản trước');
  });
});

describe('MiniGameLevel: thẻ bắt đầu', () => {
  const empty = decodeProgress(null);
  it('hiện tên game (qua fmt, có {phanDien}), luật, cách điều khiển cho máy tính và điện thoại, mốc điểm và nút "Bắt đầu"', () => {
    const html = render(empty);
    expect(html).toContain('Đuổi theo Tí');
    expect(html).not.toContain('{');
    expect(html).toContain('Luật chơi');
    expect(html).toContain('Cách điều khiển');
    expect(html).toContain('Máy tính');
    expect(html).toContain('Điện thoại');
    expect(html).toContain('Mốc điểm: Đồng 200 · Bạc 380 · Vàng 520');
    expect(html).toContain('Bắt đầu');
    expect(html).not.toContain('GAME');
  });

  it('thẻ bắt đầu có nút "Hướng dẫn chơi" (mở thẳng phần của game); hộp chỉ hiện sau khi bấm', () => {
    const html = render(empty);
    expect(html).toContain('Hướng dẫn chơi');
    expect(html).not.toContain('data-testid="huong-dan"');
  });

  it('chưa chơi: "Em chưa chơi màn này."; đã chơi: hiện điểm cao nhất', () => {
    expect(render(empty)).toContain('Em chưa chơi màn này.');
    const played: Progress = { ...empty, levels: { 2: { played: true, completed: true, stars: { game: 2 }, bestScore: 1478, updatedAt: 1 } } };
    const html = render(played);
    expect(html).toContain('Điểm cao nhất: ');
    expect(html).toContain('1.478');
    expect(html).not.toContain('Em chưa chơi màn này.');
  });
});
