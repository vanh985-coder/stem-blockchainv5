import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router';
import { describe, expect, it } from 'vitest';
import { AuthContext, ProgressContext, RequireStory, STORY, computeUnlock, decodeProgress, type AuthState, type Progress, type ProgressState } from '@so-chung/core';
import Story from './Story';

const authOf = (over: Partial<AuthState> = {}): AuthState => ({ configured: true, loading: false, profileLoading: false, session: null, profile: null, refreshProfile: async () => {}, ...over });
const progressOf = (progress: Progress, mode: ProgressState['mode'] = 'guest'): ProgressState => ({
  mode,
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
  markClimaxSeen: () => {}, canAutoComplete: false, autoComplete: () => false,
});
const read = (): Progress => {
  const p = decodeProgress(null);
  p.game.data = { storySeen: true };
  return p;
};
const teacher = authOf({
  session: { user: { id: 'u' } } as unknown as AuthState['session'],
  profile: { id: 'u', display_name: 'Cô Hoa', username: null, role: 'teacher', character_id: 'hoc-sinh-nam' },
});

function render(ui: ReactElement, state: ProgressState, auth = authOf(), path = '/truyen'): string {
  return renderToStaticMarkup(
    <AuthContext.Provider value={auth}>
      <ProgressContext.Provider value={state}>
        <MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter>
      </ProgressContext.Provider>
    </AuthContext.Provider>,
  );
}

describe('/truyen bắt buộc lần đầu (bước X1)', () => {
  it('truyện có đúng 14 lượt', () => {
    expect(STORY).toHaveLength(14);
  });
  it('người mới: hiện lượt 1/14, KHÔNG có nút "Bỏ qua"', () => {
    const html = render(<Story />, progressOf(decodeProgress(null)));
    expect(html).toContain('1/14');
    expect(html).not.toContain('Bỏ qua');
    expect(html).toContain('Tiếp ›');
  });
  it('đọc lại (đã đọc): có "Bỏ qua" như cũ', () => {
    expect(render(<Story />, progressOf(read()))).toContain('Bỏ qua');
  });
  it('giáo viên không bị bắt đọc: có "Bỏ qua"', () => {
    expect(render(<Story />, progressOf(decodeProgress(null), 'user'), teacher)).toContain('Bỏ qua');
  });
  it('chưa biết (đang tải phiên): chờ, không hiện truyện (tránh nháy nút "Bỏ qua")', () => {
    const html = render(<Story />, progressOf(decodeProgress(null)), authOf({ loading: true }));
    expect(html).not.toContain('Bỏ qua');
    expect(html).not.toContain('1/14');
  });
});

describe('vào thẳng /cho khi chưa đọc truyện: chuyển về /truyen', () => {
  const routes = (
    <Routes>
      <Route
        path="/cho"
        element={
          <RequireStory>
            <p>CANH-CHO</p>
          </RequireStory>
        }
      />
      <Route path="/truyen" element={<p>TRANG-TRUYEN</p>} />
    </Routes>
  );
  it('người mới ("Chơi thử" hay tài khoản mới): không dựng cảnh chợ (chuyển trang thật được kiểm bằng Chrome)', () => {
    expect(render(routes, progressOf(decodeProgress(null)), authOf(), '/cho')).not.toContain('CANH-CHO');
  });
  it('chưa biết thì chờ, không dựng cảnh', () => {
    expect(render(routes, progressOf(decodeProgress(null)), authOf({ loading: true }), '/cho')).not.toContain('CANH-CHO');
  });
  it('đã đọc: vào cảnh chợ; tài khoản cũ có tiến độ: vào thẳng; giáo viên: vào thẳng', () => {
    expect(render(routes, progressOf(read()), authOf(), '/cho')).toContain('CANH-CHO');
    const old = decodeProgress(null);
    old.levels[1] = { played: true, completed: true, stars: { de: 3, tb: 3, kho: 3 }, bestScore: 0, updatedAt: 1 };
    expect(render(routes, progressOf(old, 'user'), authOf(), '/cho')).toContain('CANH-CHO');
    expect(render(routes, progressOf(decodeProgress(null), 'user'), teacher, '/cho')).toContain('CANH-CHO');
  });
});
