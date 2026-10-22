import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { LEVELS, type LevelUnlock, type Progress } from '@so-chung/core';
import { VillageDetails } from './parts';

const EMPTY: Progress = { levels: {}, game: { goldenPages: 0, coins: 0, data: {}, updatedAt: 0 } };
const open: LevelUnlock[] = LEVELS.filter((l) => l.lang === 'lang-giay').map((l) => ({ id: l.id, state: 'open' as const }));
const render = (know?: { got: number; total: number }) =>
  renderToStaticMarkup(<VillageDetails villageId="lang-giay" unlockLevels={open} progress={EMPTY} goldenEarned={false} know={know ? { ...know, onRead: () => {} } : undefined} />);

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
