import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { AutoCompleteButton, AutoCompletedPanel, LEVELS, MiniGameLevel, ProgressContext, autoCompleteUi, computeUnlock, decodeProgress, type LevelUnlock, type Progress, type ProgressState } from '@so-chung/core';
import { VillageDetails } from './ban-do/parts';

const stateOf = (over: Partial<ProgressState> = {}): ProgressState => ({
  mode: 'guest',
  progress: decodeProgress(null),
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
  markClimaxSeen: () => {},
  canAutoComplete: false,
  autoStatus: 'yes',
  autoComplete: async () => 'done',
  ...over,
});
const wrap = (state: ProgressState, node: React.ReactNode) =>
  renderToStaticMarkup(
    <ProgressContext.Provider value={state}>
      <MemoryRouter>{node}</MemoryRouter>
    </ProgressContext.Provider>,
  );

describe('nút "Tự hoàn thành" (P3b)', () => {
  it('học sinh và khách (canAutoComplete false): không có nút ở nút lẻ lẫn thẻ bắt đầu của game', () => {
    expect(wrap(stateOf(), <AutoCompleteButton levelId={5} onDone={() => {}} />)).toBe('');
    const html = wrap(stateOf(), <MiniGameLevel levelId={2} medals={[200, 380, 520]} renderGame={() => <div />} />);
    expect(html).not.toContain('nut-tu-hoan-thanh');
    expect(html).not.toContain(autoCompleteUi.nut);
  });

  it('giáo viên/bản dev: có nút ở thẻ bắt đầu của game (và ở nút lẻ)', () => {
    const t = stateOf({ canAutoComplete: true });
    expect(wrap(t, <AutoCompleteButton levelId={5} onDone={() => {}} />)).toContain('data-testid="nut-tu-hoan-thanh"');
    const html = wrap(t, <MiniGameLevel levelId={2} medals={[200, 380, 520]} renderGame={() => <div />} />);
    expect(html).toContain('data-testid="nut-tu-hoan-thanh"');
    expect(html).toContain(`>${autoCompleteUi.nut}<`);
  });

  it('màn đã xong (thật hay tự hoàn thành) thì không còn nút', () => {
    const done = stateOf({ canAutoComplete: true, unlock: computeUnlock({ doneLevels: [1, 2] }) });
    expect(wrap(done, <AutoCompleteButton levelId={2} onDone={() => {}} />)).toBe('');
    const auto = stateOf({ canAutoComplete: true, unlock: computeUnlock({ doneLevels: [], autoLevels: [1] }) });
    expect(wrap(auto, <AutoCompleteButton levelId={1} onDone={() => {}} />)).toBe('');
  });

  it('khung sau khi bấm nói rõ không có điểm, sao, huy chương, xu hay Trang Sổ Vàng; có "Chơi thật" và "Chơi tiếp" khi còn màn kế', () => {
    const html = wrap(stateOf({ canAutoComplete: true }), <AutoCompletedPanel levelId={1} onPlayReal={() => {}} onNext={() => {}} onLeave={() => {}} />).replace(/&amp;/g, '&');
    expect(html).toContain(autoCompleteUi.tieuDe);
    expect(html).toContain('Không có điểm, sao, huy chương hay xu');
    expect(html).toContain('Toàn bộ màn này');
    expect(html).toContain(autoCompleteUi.choiThat);
    expect(html).toContain('data-testid="tu-hoan-thanh-choi-tiep"');
  });

  it('phạm vi hiển thị rõ ràng trên giao diện: nút ghi "Tự hoàn thành cả màn", ghi chú giải thích rõ toàn bộ màn (không riêng trạm hay vòng)', () => {
    expect(autoCompleteUi.nut).toBe('Tự hoàn thành cả màn');
    expect(autoCompleteUi.ghiChu).toContain('toàn bộ màn này (không phải riêng câu, trạm hay vòng hiện tại)');
    expect(autoCompleteUi.loi).toContain('Toàn bộ màn này (không phải riêng câu hay vòng)');
  });

  it('máy chủ chưa hỗ trợ (chưa chạy migration 0003): nút bị vô hiệu kèm thông báo rõ; từ chối thì thông báo riêng; hỗ trợ thì nút dùng được', () => {
    const no = wrap(stateOf({ canAutoComplete: true, autoStatus: 'no' }), <AutoCompleteButton levelId={5} onDone={() => {}} />).replace(/&amp;/g, '&').replace(/&quot;/g, '"');
    expect(no).toContain('disabled');
    expect(no).toContain('data-testid="tu-hoan-thanh-ghi-chu"');
    expect(no).toContain(autoCompleteUi.chuaHoTro);
    const rej = wrap(stateOf({ canAutoComplete: true, autoStatus: 'rejected' }), <AutoCompleteButton levelId={5} onDone={() => {}} />).replace(/&quot;/g, '"');
    expect(rej).toContain(autoCompleteUi.biTuChoi);
    const ok = wrap(stateOf({ canAutoComplete: true, autoStatus: 'yes' }), <AutoCompleteButton levelId={5} onDone={() => {}} />);
    expect(ok).not.toContain('disabled');
    expect(ok).not.toContain('tu-hoan-thanh-ghi-chu');
  });

  it('khung sau khi bấm nói rõ khi chưa lưu được lên máy chủ (không giả vờ đã lưu)', () => {
    const t = stateOf({ canAutoComplete: true });
    const html = wrap(t, <AutoCompletedPanel levelId={1} notice={autoCompleteUi.chuaLuu} onPlayReal={() => {}} onLeave={() => {}} />);
    expect(html).toContain('data-testid="tu-hoan-thanh-chua-luu"');
    expect(wrap(t, <AutoCompletedPanel levelId={1} onPlayReal={() => {}} onLeave={() => {}} />)).not.toContain('tu-hoan-thanh-chua-luu');
  });

  it('bảng làng ở /ban-do: màn chỉ tự hoàn thành hiện "Tự hoàn thành" thay cho số sao', () => {
    const levels: LevelUnlock[] = LEVELS.filter((l) => l.lang === 'lang-giay').map((l) => (l.id === 1 ? { id: 1, state: 'done', auto: true } : { id: l.id, state: 'open' }));
    const empty: Progress = { levels: {}, game: { goldenPages: 0, coins: 0, data: {}, updatedAt: 0 } };
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <VillageDetails villageId="lang-giay" unlockLevels={levels} progress={empty} goldenEarned={false} />
      </MemoryRouter>,
    );
    expect(html).toContain('data-testid="tu-hoan-thanh"');
    expect(html).toContain('Tự hoàn thành');
    expect(html).not.toContain('0/9 sao');
  });
});
