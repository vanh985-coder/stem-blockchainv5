import { describe, expect, it } from 'vitest';
import { decodeProgress, encodeProgress } from './compact';
import {
  countKnowCards,
  effectiveKnowMask,
  firstLevelIdOf,
  fullKnowMask,
  hasKnowCard,
  knowCardMaskOf,
  knowCardsComplete,
  knowCardsDataFromMask,
  knowBypassedByAuto,
  knowCardsMask,
  mergeKnowCards,
  withAllKnowCards,
  withKnowCard,
} from './knowCards';
import { mergeProgress } from './merge';
import { computeUnlock } from './unlock';
import { emptyProgress } from './types';

describe('thẻ Em có biết nhặt trong làng: cờ', () => {
  it('nhặt từng thẻ: bit tương ứng bật, giữ nguyên khóa khác và các làng khác', () => {
    let d: Record<string, unknown> = { storySeen: true };
    d = withKnowCard(d, 'lang-giay', 0);
    d = withKnowCard(d, 'lang-giay', 2);
    d = withKnowCard(d, 'lang-det', 1);
    expect(d.storySeen).toBe(true);
    expect(knowCardMaskOf(d, 'lang-giay')).toBe(0b101);
    expect(knowCardMaskOf(d, 'lang-det')).toBe(0b10);
    expect(knowCardMaskOf(d, 'lang-bac')).toBe(0);
    expect(hasKnowCard(0b101, 0)).toBe(true);
    expect(hasKnowCard(0b101, 1)).toBe(false);
    expect(hasKnowCard(0b101, 2)).toBe(true);
  });

  it('không sửa data vào; chỉ số xấu thì giữ nguyên', () => {
    const d = { a: 1 };
    const out = withKnowCard(d, 'lang-giay', 1);
    expect(d).toEqual({ a: 1 });
    expect(out).not.toBe(d);
    expect(withKnowCard(d, 'lang-giay', -1)).toBe(d);
    expect(withKnowCard(d, 'lang-giay', 99)).toBe(d);
    expect(withKnowCard(d, 'lang-giay', 1.5)).toBe(d);
    expect(withKnowCard(undefined, 'lang-giay', 0)).toEqual({ knowCards: { 'lang-giay': 1 } });
  });

  it('đọc dữ liệu hỏng thì bỏ qua: không phải object, làng lạ, số âm hay không phải số', () => {
    expect(knowCardMaskOf({ knowCards: 5 }, 'lang-giay')).toBe(0);
    expect(knowCardMaskOf({ knowCards: [1, 2] }, 'lang-giay')).toBe(0);
    expect(knowCardMaskOf({ knowCards: { 'lang-giay': 'x' } }, 'lang-giay')).toBe(0);
    expect(knowCardMaskOf({ knowCards: { 'lang-giay': -3, 'lang-la': 7 } }, 'lang-giay')).toBe(0);
    expect(knowCardMaskOf({ knowCards: { 'lang-giay': 7.9 } }, 'lang-giay')).toBe(7);
  });

  it('đủ thẻ: withAllKnowCards đặt đủ total bit; đếm đúng', () => {
    const d = withAllKnowCards({}, 'lang-giay', 4);
    expect(knowCardMaskOf(d, 'lang-giay')).toBe(0b1111);
    expect(fullKnowMask(4)).toBe(15);
    expect(fullKnowMask(0)).toBe(0);
    expect(countKnowCards(0b1011, 4)).toBe(3);
    expect(countKnowCards(0b11111, 4)).toBe(4);
  });

  it('gộp hai bản: OR từng bit; không bên nào có thì giữ nguyên base', () => {
    const a = withKnowCard({}, 'lang-giay', 0);
    const b = withKnowCard(withKnowCard({}, 'lang-giay', 3), 'lang-bac', 1);
    const m = mergeKnowCards(a, b);
    expect(knowCardMaskOf(m, 'lang-giay')).toBe(0b1001);
    expect(knowCardMaskOf(m, 'lang-bac')).toBe(0b10);
    const base = { x: 1 };
    expect(mergeKnowCards(base, {})).toBe(base);
  });

  it('cookie: mảng số theo thứ tự làng, khứ hồi đúng; mảng xấu thì rỗng', () => {
    const d = withKnowCard(withKnowCard({}, 'lang-giay', 1), 'lang-khac-dau', 0);
    const arr = knowCardsMask(d)!;
    expect(arr).toEqual([2, 0, 1, 0]);
    expect(knowCardsDataFromMask(arr)).toEqual({ knowCards: { 'lang-giay': 2, 'lang-khac-dau': 1 } });
    expect(knowCardsMask({})).toBeUndefined();
    expect(knowCardsDataFromMask('x')).toEqual({});
    expect(knowCardsDataFromMask([0, 0, 0, 0])).toEqual({});
  });

  it('lưu cùng cờ khách (sc_guest): khứ hồi qua encodeProgress/decodeProgress', () => {
    const p = emptyProgress();
    p.game.data = withKnowCard(withKnowCard({}, 'lang-giay', 0), 'lang-giay', 3);
    const back = decodeProgress(encodeProgress(p));
    expect(knowCardMaskOf(back.game.data, 'lang-giay')).toBe(0b1001);
    expect(decodeProgress(JSON.stringify({ v: 1, lv: {}, gp: 0, c: 0, u: 1, kc: 'hỏng' })).game.data).toEqual({});
  });

  it('gộp tiến độ máy và server: thẻ nhặt ở máy nào cũng được giữ, kể cả khi bản kia mới hơn', () => {
    const local = emptyProgress();
    local.game = { ...local.game, data: withKnowCard({}, 'lang-giay', 0), updatedAt: 5 };
    const remote = emptyProgress();
    remote.game = { ...remote.game, data: withKnowCard({}, 'lang-giay', 2), updatedAt: 9 };
    expect(knowCardMaskOf(mergeProgress(local, remote).game.data, 'lang-giay')).toBe(0b101);
  });
});

describe('thẻ hiệu lực: người chơi từ trước coi như đủ', () => {
  const base = { data: {} as Record<string, unknown>, village: 'lang-giay' as const, total: 4, lessonDone: false, seenOld: false };
  it('chưa nhặt gì thì chưa đủ', () => {
    expect(effectiveKnowMask(base)).toBe(0);
    expect(knowCardsComplete(base)).toBe(false);
  });
  it('nhặt 3 trong 4 thì chưa đủ; nhặt đủ thì đủ', () => {
    let d: Record<string, unknown> = {};
    for (const i of [0, 1, 2]) d = withKnowCard(d, 'lang-giay', i);
    expect(knowCardsComplete({ ...base, data: d })).toBe(false);
    d = withKnowCard(d, 'lang-giay', 3);
    expect(knowCardsComplete({ ...base, data: d })).toBe(true);
  });
  it('đã xong màn 1 hoặc đã xem hộp cũ (knowSeen) thì đủ', () => {
    expect(knowCardsComplete({ ...base, lessonDone: true })).toBe(true);
    expect(knowCardsComplete({ ...base, seenOld: true })).toBe(true);
    expect(effectiveKnowMask({ ...base, lessonDone: true })).toBe(15);
  });
  it('làng không có thẻ để nhặt thì coi là đủ; bit thừa ngoài total bị bỏ', () => {
    expect(knowCardsComplete({ ...base, total: 0 })).toBe(true);
    expect(effectiveKnowMask({ ...base, data: { knowCards: { 'lang-giay': 0b111111 } } })).toBe(15);
  });
});

describe('Làng Dệt (mốc 3, bước L1): 4 thẻ rải, người chơi cũ không bị chặn', () => {
  const base = { data: {} as Record<string, unknown>, village: 'lang-det' as const, total: 4, lessonDone: false, seenOld: false };
  it('màn đầu của Làng Dệt là màn 4; tài khoản cũ đã xong màn 4 coi như đủ 4 thẻ, người mới thì phải nhặt', () => {
    expect(firstLevelIdOf('lang-det')).toBe(4);
    const done = computeUnlock({ doneLevels: [1, 2, 3, 4] });
    const lessonDone = done.levels.find((l) => l.id === firstLevelIdOf('lang-det'))?.state === 'done';
    expect(lessonDone).toBe(true);
    expect(effectiveKnowMask({ ...base, lessonDone })).toBe(15);
    expect(knowCardsComplete({ ...base, lessonDone })).toBe(true);
    const fresh = computeUnlock({ doneLevels: [1, 2, 3] });
    expect(fresh.levels.find((l) => l.id === 4)?.state).toBe('open');
    expect(knowCardsComplete({ ...base, lessonDone: false })).toBe(false);
  });
  it('đã xem hộp cũ (knowSeen) của Làng Dệt cũng coi là đủ', () => {
    expect(knowCardsComplete({ ...base, seenOld: true })).toBe(true);
  });
  it('thẻ nhặt ở Làng Dệt lưu riêng với Làng Giấy, gộp tài khoản không làm mất, cookie khách giữ đúng', () => {
    let d: Record<string, unknown> = withKnowCard({}, 'lang-giay', 1);
    d = withKnowCard(d, 'lang-det', 0);
    d = withKnowCard(d, 'lang-det', 3);
    expect(knowCardMaskOf(d, 'lang-det')).toBe(0b1001);
    expect(knowCardMaskOf(d, 'lang-giay')).toBe(0b0010);
    expect(knowCardsComplete({ ...base, data: d })).toBe(false);
    const other = withKnowCard({}, 'lang-det', 1);
    expect(knowCardMaskOf(mergeKnowCards(d, other), 'lang-det')).toBe(0b1011);
    const p = emptyProgress();
    p.game = { ...p.game, data: d, updatedAt: 3 };
    expect(knowCardMaskOf(decodeProgress(encodeProgress(p)).game.data, 'lang-det')).toBe(0b1001);
  });
});

describe('tự hoàn thành (P3b) không coi là đã nhặt thẻ', () => {
  it('bài học đầu chỉ có cờ: bỏ điều kiện chặn nhưng mặt nạ thẻ giữ nguyên (không ghi đã nhặt, ký hiệu trên bản đồ không biến mất)', () => {
    const levels = [{ id: 1, state: 'done', auto: true }, { id: 2, state: 'open' }];
    expect(knowBypassedByAuto(levels, 'lang-giay')).toBe(true);
    expect(knowBypassedByAuto([{ id: 1, state: 'done' }], 'lang-giay')).toBe(false); // xong thật: dùng đường "đã xong màn 1" như cũ
    expect(knowBypassedByAuto([{ id: 4, state: 'done', auto: true }], 'lang-giay')).toBe(false); // làng khác không liên quan
    // mặt nạ hiệu lực chỉ theo thẻ thật (lessonDone chỉ true khi xong thật): chưa nhặt thẻ nào thì vẫn 0/4
    expect(effectiveKnowMask({ data: {}, village: 'lang-giay', total: 4, lessonDone: false, seenOld: false })).toBe(0);
    expect(countKnowCards(effectiveKnowMask({ data: {}, village: 'lang-giay', total: 4, lessonDone: false, seenOld: false }), 4)).toBe(0);
  });
});
