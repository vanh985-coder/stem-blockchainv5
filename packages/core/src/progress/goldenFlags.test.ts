import { describe, expect, it } from 'vitest';
import { decodeProgress, encodeProgress } from './compact';
import { mergeGame } from './merge';
import { emptyProgress } from './types';
import {
  goldenDataFromMask,
  goldenMask,
  gateDataFromMask,
  gateMask,
  hasSeenGateOpen,
  hasSeenGolden,
  mergeGateSeen,
  mergeGoldenSeen,
  pendingGateOpening,
  shouldShowGolden,
  withGateOpenSeen,
  withGoldenSeen,
} from './villageIntro';

describe('cảnh trao Trang Sổ Vàng: chiếu một lần', () => {
  it('chưa có trang của làng thì không chiếu; có rồi và chưa chiếu thì chiếu; chiếu rồi thì thôi', () => {
    expect(shouldShowGolden({}, 'lang-giay', 0)).toBe(false);
    expect(shouldShowGolden({}, 'lang-giay', 1)).toBe(true);
    expect(shouldShowGolden(undefined, 'lang-giay', 4)).toBe(true);
    const seen = withGoldenSeen({}, 'lang-giay');
    expect(hasSeenGolden(seen, 'lang-giay')).toBe(true);
    expect(shouldShowGolden(seen, 'lang-giay', 1)).toBe(false);
  });
  it('trang của làng sau cần đủ số trang của làng đó; cờ từng làng độc lập; giữ các khóa khác', () => {
    expect(shouldShowGolden({}, 'lang-det', 1)).toBe(false);
    expect(shouldShowGolden({}, 'lang-det', 2)).toBe(true);
    const d = withGoldenSeen({ khac: 1 }, 'lang-giay');
    expect(shouldShowGolden(d, 'lang-det', 2)).toBe(true);
    expect((d as Record<string, unknown>).khac).toBe(1);
  });
});

describe('hiệu ứng mở cổng khi về chợ: chiếu một lần theo làng đã trao trang', () => {
  it('0 trang: không có; 1 trang: cổng Dệt (làng trao: Giấy); 2 trang: làng trao Dệt; 3 trang: làng trao Khắc Dấu; đủ 4 trang: không còn cổng mới', () => {
    expect(pendingGateOpening({}, 0)).toBeNull();
    expect(pendingGateOpening({}, 1)).toBe('lang-giay');
    expect(pendingGateOpening({}, 2)).toBe('lang-det');
    expect(pendingGateOpening({}, 3)).toBe('lang-khac-dau');
    expect(pendingGateOpening({}, 4)).toBeNull();
    expect(pendingGateOpening({}, NaN)).toBeNull();
  });
  it('chiếu rồi thì hết chờ; chỉ xét cờ của làng vừa trao trang', () => {
    const d = withGateOpenSeen({}, 'lang-giay');
    expect(hasSeenGateOpen(d, 'lang-giay')).toBe(true);
    expect(pendingGateOpening(d, 1)).toBeNull();
    expect(pendingGateOpening(d, 2)).toBe('lang-det');
  });
});

describe('lưu cờ theo tiến độ: cookie dạng gọn và gộp hai bản', () => {
  it('số bit đi và về đúng', () => {
    const d = withGateOpenSeen(withGoldenSeen({}, 'lang-det'), 'lang-giay');
    expect(goldenMask(d)).toBe(2);
    expect(gateMask(d)).toBe(1);
    expect(goldenDataFromMask(2)).toEqual({ goldenSeen: { 'lang-det': true } });
    expect(gateDataFromMask(1)).toEqual({ gateOpenSeen: { 'lang-giay': true } });
    expect(goldenDataFromMask(0)).toEqual({});
    expect(gateDataFromMask('x')).toEqual({});
  });
  it('mã hóa rồi giải mã tiến độ giữ nguyên hai cờ', () => {
    const p = emptyProgress();
    p.game = { goldenPages: 1, coins: 0, data: withGateOpenSeen(withGoldenSeen({}, 'lang-giay'), 'lang-giay'), updatedAt: 5 };
    const raw = encodeProgress(p);
    expect(raw).toContain('"gs":1');
    expect(raw).toContain('"go":1');
    const back = decodeProgress(raw);
    expect(hasSeenGolden(back.game.data, 'lang-giay')).toBe(true);
    expect(hasSeenGateOpen(back.game.data, 'lang-giay')).toBe(true);
  });
  it('không có cờ thì cookie không có trường gs, go', () => {
    expect(encodeProgress(emptyProgress())).not.toMatch(/"(gs|go)"/);
  });
  it('gộp hai bản: xem ở máy nào cũng tính là đã xem (hợp hai bên), kể cả khi bản kia mới hơn', () => {
    const a = { goldenPages: 1, coins: 0, data: withGoldenSeen({}, 'lang-giay'), updatedAt: 10 };
    const b = { goldenPages: 1, coins: 0, data: withGateOpenSeen({}, 'lang-giay'), updatedAt: 20 };
    const m = mergeGame(a, b);
    expect(hasSeenGolden(m.data, 'lang-giay')).toBe(true);
    expect(hasSeenGateOpen(m.data, 'lang-giay')).toBe(true);
    expect(mergeGoldenSeen({ x: 1 }, {})).toEqual({ x: 1 });
    expect(mergeGateSeen({ x: 1 }, {})).toEqual({ x: 1 });
  });
});
