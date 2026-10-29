import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { LEVELS, type LevelUnlock, type Progress } from '@so-chung/core';
import { VillageDetails } from './parts';

const EMPTY: Progress = { levels: {}, game: { goldenPages: 0, coins: 0, data: {}, updatedAt: 0 } };
const open: LevelUnlock[] = LEVELS.filter((l) => l.lang === 'lang-giay').map((l) => ({ id: l.id, state: 'open' as const }));
const render = (know?: { got: number; total: number }) =>
  renderToStaticMarkup(
    <MemoryRouter>
      <VillageDetails villageId="lang-giay" unlockLevels={open} progress={EMPTY} goldenEarned={false} know={know ? { ...know, onRead: () => {} } : undefined} />
    </MemoryRouter>,
  );

describe('/ban-do: chi tiết làng và thẻ Em có biết (bước X3)', () => {
  it('chưa đọc đủ thẻ: có lời báo "đọc đủ 4 thẻ" (n/4), nút đọc thẻ, và không có nút "Vào" ở các màn mở', () => {
    const html = render({ got: 2, total: 4 });
    expect(html).toContain('data-testid="can-doc-the"');
    expect(html).toContain('2/4');
    expect(html).toContain('Đọc thẻ Em có biết');
    expect(html).not.toContain('>Vào<');
  });
  it('đã đủ thẻ: không có lời báo, các màn mở có nút "Vào"', () => {
    const html = render({ got: 4, total: 4 });
    expect(html).not.toContain('can-doc-the');
    expect(html).toContain('>Vào<');
  });
  it('không truyền thông tin thẻ (hoặc làng không có thẻ): như cũ, vào được', () => {
    expect(render()).toContain('>Vào<');
    expect(render({ got: 0, total: 0 })).toContain('>Vào<');
  });
});

describe('/ban-do: nút xem cảnh cuối ở bảng Làng Bạc (P3a)', () => {
  const bac: LevelUnlock[] = LEVELS.filter((l) => l.lang === 'lang-bac').map((l) => ({ id: l.id, state: 'done' as const }));
  const renderBac = (climax?: { seen: boolean }) =>
    renderToStaticMarkup(
      <MemoryRouter>
        <VillageDetails villageId="lang-bac" unlockLevels={bac} progress={EMPTY} goldenEarned={false} climax={climax ? { ...climax, onWatch: () => {} } : undefined} />
      </MemoryRouter>,
    );
  it('không truyền cảnh (chưa đủ điều kiện): không có nút', () => {
    expect(renderBac()).not.toContain('xem-canh-cuoi');
  });
  it('cảnh đang chờ: nút "Xem cảnh cuối" và lời báo không bắt chơi lại màn 12', () => {
    const html = renderBac({ seen: false });
    expect(html).toContain('data-testid="xem-canh-cuoi"');
    expect(html).toContain('>Xem cảnh cuối<');
    expect(html).toContain('không cần chơi lại màn 12');
  });
  it('đã chiếu: nút đổi thành "Xem lại cảnh cuối"', () => {
    const html = renderBac({ seen: true });
    expect(html).toContain('>Xem lại cảnh cuối<');
    expect(html).not.toContain('>Xem cảnh cuối<');
  });
});
