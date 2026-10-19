import { describe, expect, it } from 'vitest';
import { GUIDE_SECTION_IDS } from '../content/huongDan';
import { decodeProgress, encodeProgress } from './compact';
import { guideDataFromMask, guideMask, guideSeenOf, hasSeenGuide, mergeGuideSeen, shouldAutoOpenGuide, withGuideSeen } from './guideFlags';
import { mergeGame } from './merge';
import { emptyProgress } from './types';
import { hasSeenKnow, knowDataFromMask, knowMask, mergeKnowSeen, shouldShowKnow, withKnowSeen } from './villageIntro';

describe('Hướng dẫn chơi: tự mở một lần theo từng phần', () => {
  it('chưa mở thì tự mở; mở rồi thì thôi; phần khác độc lập; giữ các khóa khác', () => {
    expect(shouldAutoOpenGuide({}, 'di-lai')).toBe(true);
    expect(shouldAutoOpenGuide(undefined, 'di-lai')).toBe(true);
    const seen = withGuideSeen({ villageIntroSeen: { 'lang-giay': true } }, 'di-lai');
    expect(hasSeenGuide(seen, 'di-lai')).toBe(true);
    expect(shouldAutoOpenGuide(seen, 'di-lai')).toBe(false);
    expect(shouldAutoOpenGuide(seen, 'man-2')).toBe(true);
    expect(seen.villageIntroSeen).toEqual({ 'lang-giay': true });
  });
  it('bỏ qua phần lạ và giá trị không phải true; không sửa dữ liệu đầu vào', () => {
    const data = { guideSeen: { 'di-lai': true, 'khong-co': true, 'man-2': 1 } };
    const copy = JSON.stringify(data);
    expect(guideSeenOf(data)).toEqual({ 'di-lai': true });
    withGuideSeen(data, 'man-3');
    expect(JSON.stringify(data)).toBe(copy);
    expect(guideSeenOf({ guideSeen: [] })).toEqual({});
  });
  it('số bit: khứ hồi theo thứ tự các phần, mỗi phần một bit', () => {
    expect(guideMask({})).toBe(0);
    const data = withGuideSeen(withGuideSeen({}, GUIDE_SECTION_IDS[0]), GUIDE_SECTION_IDS[3]);
    expect(guideMask(data)).toBe(1 | (1 << 3));
    expect(guideDataFromMask(guideMask(data))).toEqual({ guideSeen: { [GUIDE_SECTION_IDS[0]]: true, [GUIDE_SECTION_IDS[3]]: true } });
    expect(guideDataFromMask(0)).toEqual({});
    expect(guideDataFromMask('x')).toEqual({});
  });
  it('hợp hai bên: bên nào đã mở thì tính là đã mở', () => {
    const a = withGuideSeen({}, 'di-lai');
    const b = withGuideSeen({}, 'man-2');
    expect(guideSeenOf(mergeGuideSeen(a, b))).toEqual({ 'di-lai': true, 'man-2': true });
    const base = { x: 1 };
    expect(mergeGuideSeen(base, {})).toBe(base);
  });
});

describe('Em có biết? khi vào làng: tự hiện một lần theo từng làng', () => {
  it('lần đầu thì hiện, đã hiện thì thôi, từng làng độc lập', () => {
    expect(shouldShowKnow({}, 'lang-giay')).toBe(true);
    const seen = withKnowSeen({ goldenSeen: { 'lang-giay': true } }, 'lang-giay');
    expect(hasSeenKnow(seen, 'lang-giay')).toBe(true);
    expect(shouldShowKnow(seen, 'lang-giay')).toBe(false);
    expect(shouldShowKnow(seen, 'lang-det')).toBe(true);
    expect(seen.goldenSeen).toEqual({ 'lang-giay': true });
  });
  it('số bit khứ hồi và hợp hai bên', () => {
    const data = withKnowSeen(withKnowSeen({}, 'lang-det'), 'lang-bac');
    expect(knowMask(data)).toBe((1 << 1) | (1 << 3));
    expect(knowDataFromMask(knowMask(data))).toEqual({ knowSeen: { 'lang-det': true, 'lang-bac': true } });
    expect(hasSeenKnow(mergeKnowSeen(withKnowSeen({}, 'lang-giay'), withKnowSeen({}, 'lang-bac')), 'lang-bac')).toBe(true);
  });
});

describe('hai cờ mới đi theo cookie khách và theo gộp tiến độ', () => {
  it('cookie: ghi rồi đọc lại còn nguyên (trường ks và hd)', () => {
    const p = emptyProgress();
    p.game = { ...p.game, data: withGuideSeen(withKnowSeen({}, 'lang-giay'), 'di-lai'), updatedAt: 5 };
    const back = decodeProgress(encodeProgress(p));
    expect(back).not.toBeNull();
    expect(hasSeenKnow(back!.game.data, 'lang-giay')).toBe(true);
    expect(hasSeenGuide(back!.game.data, 'di-lai')).toBe(true);
    expect(hasSeenGuide(back!.game.data, 'man-2')).toBe(false);
  });
  it('gộp local và server: cờ hợp hai bên', () => {
    const local = { goldenPages: 0, coins: 0, data: withKnowSeen({}, 'lang-giay'), updatedAt: 9 };
    const remote = { goldenPages: 0, coins: 0, data: withGuideSeen({}, 'di-lai'), updatedAt: 1 };
    const merged = mergeGame(local, remote);
    expect(hasSeenKnow(merged.data, 'lang-giay')).toBe(true);
    expect(hasSeenGuide(merged.data, 'di-lai')).toBe(true);
  });
});
