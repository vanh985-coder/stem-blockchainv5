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
