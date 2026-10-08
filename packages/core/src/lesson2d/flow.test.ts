import { describe, expect, it } from 'vitest';
import { decodeProgress, encodeProgress } from '../progress/compact';
import { GUEST_COOKIE } from '../progress/cookies';
import { ProgressManager, type CookieJar, type KeyValueStore, type RemoteApi } from '../progress/manager';
import { doneLevels } from '../progress/record';
import { emptyProgress } from '../progress/types';
import {
  applyStationResult,
  dialogueFor,
  finalLessonStars,
  goldenPageAwarded,
  lessonStars,
  momentBeforeStation,
  startStationIndex,
  stationOpen,
} from './flow';
import type { LessonDialogue } from './types';

const T0 = 1_700_000_000_000;

describe('lời người dẫn theo thời điểm', () => {
  it('trạm Dễ → đầu bài, Trung bình → trước Trung bình, Khó → trước Khó', () => {
    expect(momentBeforeStation(0)).toBe('dauBai');
    expect(momentBeforeStation(1)).toBe('truocTb');
    expect(momentBeforeStation(2)).toBe('truocKho');
  });

  it('chọn đúng lời theo thời điểm', () => {
    const d: LessonDialogue = {
      dauBai: [{ characterId: 'bacAn', text: 'a' }],
      truocTb: [{ characterId: 'bacAn', text: 'b' }],
      truocKho: [{ characterId: 'bacAn', text: 'c' }],
      cuoiBai: [{ characterId: 'bacAn', text: 'd' }],
    };
    expect(dialogueFor(d, momentBeforeStation(0))[0].text).toBe('a');
    expect(dialogueFor(d, momentBeforeStation(1))[0].text).toBe('b');
    expect(dialogueFor(d, momentBeforeStation(2))[0].text).toBe('c');
    expect(dialogueFor(d, 'cuoiBai')[0].text).toBe('d');
  });
});

describe('goldenPageAwarded: có trao Trang Sổ Vàng không', () => {
  it('trao khi số trang tăng tới trang của làng', () => {
    expect(goldenPageAwarded(0, 1, 0)).toBe(true); // làng Giấy, lần đầu
    expect(goldenPageAwarded(1, 2, 1)).toBe(true); // làng Dệt
    expect(goldenPageAwarded(3, 4, 3)).toBe(true); // làng Bạc
  });

  it('học lại (đã có trang) hoặc số trang không đổi thì không trao', () => {
    expect(goldenPageAwarded(1, 1, 0)).toBe(false);
    expect(goldenPageAwarded(0, 0, 0)).toBe(false);
    expect(goldenPageAwarded(2, 2, 0)).toBe(false);
    expect(goldenPageAwarded(4, 4, 3)).toBe(false);
  });

  it('trang của làng khác tăng thì không trao cho làng này', () => {
    expect(goldenPageAwarded(0, 1, 1)).toBe(false); // mới có trang 1, làng Dệt cần trang 2
    expect(goldenPageAwarded(1, 2, 0)).toBe(false); // làng Giấy đã có từ trước
  });
});

describe('lessonStars', () => {
  it('trung bình sao 3 trạm, làm tròn, tối thiểu 1 tối đa 3', () => {
    expect(lessonStars({ de: 3, tb: 3, kho: 3 })).toBe(3);
    expect(lessonStars({ de: 3, tb: 3, kho: 1 })).toBe(2);
    expect(lessonStars({ de: 1, tb: 1, kho: 1 })).toBe(1);
    expect(lessonStars({})).toBe(1);
  });
});

describe('ghi tiến độ từng trạm', () => {
  it('xu: +10 cho mỗi sao mới; học lại với sao bằng hoặc thấp hơn không cộng thêm', () => {
    let p = emptyProgress();
    const first = applyStationResult(p, 1, 'de', 3, T0);
    expect(first.coinsEarned).toBe(30);
    p = first.progress;
    const again = applyStationResult(p, 1, 'de', 3, T0 + 1);
    expect(again.coinsEarned).toBe(0);
    expect(again.progress.game.coins).toBe(30);
    const lower = applyStationResult(again.progress, 1, 'de', 1, T0 + 2);
    expect(lower.coinsEarned).toBe(0);
    expect(lower.progress.levels[1].stars.de).toBe(3); // sao không bị hạ
  });

  it('học lại chỉ cộng phần sao cao hơn', () => {
    let p = applyStationResult(emptyProgress(), 1, 'tb', 1, T0).progress; // 10 xu
    const better = applyStationResult(p, 1, 'tb', 3, T0 + 1);
    expect(better.coinsEarned).toBe(20); // 3 − 1 = 2 sao mới
    p = better.progress;
    expect(p.game.coins).toBe(30);
    expect(applyStationResult(p, 1, 'tb', 3, T0 + 2).coinsEarned).toBe(0);
  });

  it('đủ 3 trạm: completed, bài tính là đã xong, nhận Trang Sổ Vàng 1 (mốc 1: màn 2, 3 là coming-soon)', () => {
    let p = emptyProgress();
    p = applyStationResult(p, 1, 'de', 3, T0).progress;
    p = applyStationResult(p, 1, 'tb', 2, T0 + 1).progress;
    expect(p.levels[1].completed).toBe(false);
    expect(p.game.goldenPages).toBe(0);
    const last = applyStationResult(p, 1, 'kho', 1, T0 + 2);
    expect(last.progress.levels[1].completed).toBe(true);
    expect(doneLevels(last.progress)).toEqual([1]);
    expect(last.progress.game.goldenPages).toBe(1);
    expect(last.progress.game.coins).toBe(60);
    expect(goldenPageAwarded(p.game.goldenPages, last.progress.game.goldenPages, 0)).toBe(true);
  });

  it('bỏ dở sau trạm 1: tiến độ giữ sao trạm 1, completed vẫn false, không có Trang Sổ Vàng', () => {
    const p = applyStationResult(emptyProgress(), 1, 'de', 2, T0).progress;
    expect(p.levels[1]).toMatchObject({ played: true, completed: false, stars: { de: 2 } });
    expect(doneLevels(p)).toEqual([]);
    expect(p.game.goldenPages).toBe(0);
    // rời trang: cookie chơi thử vẫn giữ nguyên sao của trạm 1
    const back = decodeProgress(encodeProgress(p));
    expect(back.levels[1]).toMatchObject({ played: true, completed: false, stars: { de: 2, tb: 0, kho: 0 } });
  });

  it('bỏ dở giữa chừng: mở lại bằng ProgressManager (chơi thử) vẫn thấy sao trạm 1', async () => {
    const jar = new Map<string, string>();
    const cookies: CookieJar = {
      get: (n) => jar.get(n) ?? null,
      set: (n, v) => void jar.set(n, v),
      remove: (n) => void jar.delete(n),
    };
    const store: KeyValueStore = { get: () => null, set: () => {}, remove: () => {} };
    const remote = {} as RemoteApi;
    const m1 = new ProgressManager({ store, cookies, remote, now: () => T0 });
    await m1.setUser(null);
    expect(m1.record(1, { stars: { de: 3 } }).coinsEarned).toBe(30);
    expect(jar.get(GUEST_COOKIE)).toBeTruthy();

    const m2 = new ProgressManager({ store, cookies, remote, now: () => T0 + 5000 });
    await m2.setUser(null);
    const lv = m2.getSnapshot().progress.levels[1];
    expect(lv.stars.de).toBe(3);
    expect(lv.completed).toBe(false);
    // học lại trạm Dễ với cùng sao: không cộng xu
    expect(m2.record(1, { stars: { de: 3 } }).coinsEarned).toBe(0);
    expect(m2.getSnapshot().progress.game.coins).toBe(30);
  });
});

describe('chọn trạm khi vào lại màn', () => {
  it('bắt đầu ở trạm đầu tiên chưa có sao; xong cả 3 thì ở trạm Dễ', () => {
    expect(startStationIndex({})).toBe(0);
    expect(startStationIndex({ de: 2 })).toBe(1);
    expect(startStationIndex({ de: 3, tb: 1 })).toBe(2);
    expect(startStationIndex({ de: 3, tb: 3, kho: 1 })).toBe(0);
    expect(startStationIndex({ de: 0, tb: 3 })).toBe(0); // trạm Dễ chưa có sao
    expect(startStationIndex({ de: 1, tb: 0, kho: 3 })).toBe(1);
  });

  it('trạm bấm được khi chính nó đã có sao hoặc trạm liền trước đã có sao', () => {
    expect(stationOpen({}, 0)).toBe(true);
    expect(stationOpen({}, 1)).toBe(false);
    expect(stationOpen({}, 2)).toBe(false);
    expect(stationOpen({ de: 1 }, 1)).toBe(true);
    expect(stationOpen({ de: 1 }, 2)).toBe(false); // tb chưa có sao
    expect(stationOpen({ de: 1, tb: 2 }, 2)).toBe(true);
    expect(stationOpen({ tb: 2 }, 1)).toBe(true); // chính nó đã có sao
    expect(stationOpen({ kho: 1 }, 2)).toBe(true); // chính nó đã có sao dù tb chưa có
    expect(stationOpen({ de: 3, tb: 3, kho: 3 }, 0)).toBe(true);
  });

  it('chỉ số ngoài khoảng thì không mở', () => {
    expect(stationOpen({ de: 3 }, 3)).toBe(false);
    expect(stationOpen({ de: 3 }, -1)).toBe(false);
  });

  it('sao cả bài gộp sao cũ với sao lần này', () => {
    expect(finalLessonStars({ de: 3, tb: 3, kho: 3 }, { kho: 1 })).toBe(2); // (3+3+1)/3 = 2,33 → 2
    expect(finalLessonStars({ de: 3, tb: 3 }, { kho: 3 })).toBe(3);
    expect(finalLessonStars({}, { de: 1, tb: 1, kho: 1 })).toBe(1);
  });
});
