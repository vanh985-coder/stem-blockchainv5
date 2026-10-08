import { describe, expect, it } from 'vitest';
import { LEVELS, type LevelStatus } from '../content/levels';
import { PENDING_MAX_BYTES, decodePendingMap, decodeProgress, encodePendingMap, encodeProgress } from './compact';
import { buildCookie, buildCookieRemoval, readCookie } from './cookies';
import { mergeProgress } from './merge';
import { doneLevels, recordLevelResult, unlockOf, withGoldenPages } from './record';
import { emptyProgress, hasProgress, type Progress } from './types';

const T0 = 1_700_000_000_000;

function progressWith(partial: Partial<Progress> & { levels?: Progress['levels'] }): Progress {
  const base = emptyProgress();
  return { levels: partial.levels ?? base.levels, game: { ...base.game, ...partial.game } };
}
const lv = (o: Partial<Progress['levels'][number]> = {}) => ({ played: false, completed: false, stars: {}, bestScore: 0, updatedAt: 0, ...o });

describe('mergeProgress (bảng gộp spec 02 mục 4)', () => {
  it('sao {de:2} gộp với {de:3, tb:1} ra {de:3, tb:1}', () => {
    const local = progressWith({ levels: { 1: lv({ stars: { de: 2 } }) } });
    const remote = progressWith({ levels: { 1: lv({ stars: { de: 3, tb: 1 } }) } });
    expect(mergeProgress(local, remote).levels[1].stars).toEqual({ de: 3, tb: 1 });
    expect(mergeProgress(remote, local).levels[1].stars).toEqual({ de: 3, tb: 1 });
  });

  it('completed false gộp với true ra true (và played)', () => {
    const local = progressWith({ levels: { 1: lv({ played: true, completed: false }) } });
    const remote = progressWith({ levels: { 1: lv({ played: false, completed: true }) } });
    const m = mergeProgress(local, remote).levels[1];
    expect(m.completed).toBe(true);
    expect(m.played).toBe(true);
  });

  it('coins lấy giá trị lớn hơn; data lấy bản có updated_at mới hơn; golden_pages lấy lớn hơn', () => {
    const local = progressWith({ game: { goldenPages: 2, coins: 10, data: { a: 1 }, updatedAt: 100 } });
    const remote = progressWith({ game: { goldenPages: 1, coins: 70, data: { b: 2 }, updatedAt: 200 } });
    expect(mergeProgress(local, remote).game).toEqual({ goldenPages: 2, coins: 70, data: { b: 2 }, updatedAt: 200 });
    const newerButSmaller = progressWith({ game: { goldenPages: 0, coins: 5, data: { c: 3 }, updatedAt: 300 } });
    const m2 = mergeProgress(newerButSmaller, remote).game;
    expect(m2.coins).toBe(70); // bản mới hơn nhưng ít xu hơn: không làm mất xu
    expect(m2.data).toEqual({ c: 3 }); // data thì vẫn theo bản mới hơn
  });

  it('máy A có 90 xu lúc t1; máy B có 0 xu nhưng golden_pages tăng lúc t2 > t1: gộp ra 90 xu và golden_pages theo max', () => {
    const a = progressWith({ game: { goldenPages: 0, coins: 90, data: {}, updatedAt: 1000 } });
    const b = progressWith({ game: { goldenPages: 1, coins: 0, data: {}, updatedAt: 2000 } });
    for (const [x, y] of [[a, b], [b, a]] as const) {
      const g = mergeProgress(x, y).game;
      expect(g.coins).toBe(90);
      expect(g.goldenPages).toBe(1);
    }
  });

  it('best_score lấy max; màn chỉ có ở một phía được giữ; không sửa đầu vào', () => {
    const local = progressWith({ levels: { 2: lv({ bestScore: 50 }), 3: lv({ played: true }) } });
    const remote = progressWith({ levels: { 2: lv({ bestScore: 80 }) } });
    const before = JSON.stringify(local);
    const m = mergeProgress(local, remote);
    expect(m.levels[2].bestScore).toBe(80);
    expect(m.levels[3].played).toBe(true);
    expect(JSON.stringify(local)).toBe(before);
  });

  it('gộp là giao hoán với dữ liệu sao và lũy đẳng', () => {
    const a = progressWith({ levels: { 1: lv({ stars: { de: 3 }, bestScore: 5 }) } });
    const b = progressWith({ levels: { 1: lv({ stars: { tb: 2 }, played: true }) } });
    expect(mergeProgress(a, b).levels).toEqual(mergeProgress(b, a).levels);
    expect(mergeProgress(mergeProgress(a, b), b).levels).toEqual(mergeProgress(a, b).levels);
  });
});

describe('recordLevelResult', () => {
  it('bài học: xong khi đủ 3 trạm; xu +10 cho mỗi sao mới', () => {
    let p = emptyProgress();
    let r = recordLevelResult(p, 1, { stars: { de: 3 } }, T0);
    expect(r.coinsEarned).toBe(30);
    expect(r.progress.levels[1].played).toBe(true);
    expect(r.progress.levels[1].completed).toBe(false); // mới 1 trạm
    expect(r.progress.game.coins).toBe(30);
    p = r.progress;
    r = recordLevelResult(p, 1, { stars: { tb: 2 } }, T0 + 1);
    expect(r.coinsEarned).toBe(20);
    expect(r.progress.levels[1].completed).toBe(false);
    r = recordLevelResult(r.progress, 1, { stars: { kho: 1 } }, T0 + 2);
    expect(r.coinsEarned).toBe(10);
    expect(r.progress.levels[1].completed).toBe(true);
    expect(r.progress.levels[1].stars).toEqual({ de: 3, tb: 2, kho: 1 });
    expect(r.progress.game.coins).toBe(60);
  });

  it('chơi lại không cộng thêm; chỉ cộng phần sao tăng thêm; sao lấy max', () => {
    const first = recordLevelResult(emptyProgress(), 1, { stars: { de: 2, tb: 2, kho: 2 } }, T0);
    expect(first.coinsEarned).toBe(60);
    const again = recordLevelResult(first.progress, 1, { stars: { de: 2, tb: 1, kho: 2 } }, T0 + 1);
    expect(again.coinsEarned).toBe(0);
    expect(again.progress.game.coins).toBe(60);
    expect(again.progress.levels[1].stars.tb).toBe(2); // không bị hạ
    const better = recordLevelResult(again.progress, 1, { stars: { de: 3, kho: 3 } }, T0 + 2);
    expect(better.coinsEarned).toBe(20);
    expect(better.progress.game.coins).toBe(80);
  });

  it('game: played, mốc điểm, best_score lấy max; thua vẫn tính đã chơi', () => {
    let r = recordLevelResult(emptyProgress(), 2, { stars: { game: 1 }, score: 300 }, T0);
    expect(r.progress.levels[2]).toMatchObject({ played: true, completed: false, bestScore: 300, stars: { game: 1 } });
    expect(r.coinsEarned).toBe(10);
    r = recordLevelResult(r.progress, 2, { stars: { game: 0 }, score: 120 }, T0 + 1);
    expect(r.progress.levels[2].bestScore).toBe(300);
    expect(r.progress.levels[2].stars.game).toBe(1);
    expect(r.coinsEarned).toBe(0);
    r = recordLevelResult(r.progress, 2, { stars: { game: 3 }, score: 900, completed: true }, T0 + 2);
    expect(r.progress.levels[2]).toMatchObject({ completed: true, bestScore: 900 });
    expect(r.coinsEarned).toBe(20);
  });

  it('bỏ qua khóa sao không thuộc loại màn, giới hạn 0 đến 3, màn không hợp lệ giữ nguyên', () => {
    const r = recordLevelResult(emptyProgress(), 1, { stars: { de: 9, game: 3 } }, T0);
    expect(r.progress.levels[1].stars).toEqual({ de: 3 });
    expect(r.coinsEarned).toBe(30);
    const p = emptyProgress();
    expect(recordLevelResult(p, 99, { stars: { de: 3 } }, T0)).toEqual({ progress: p, coinsEarned: 0 });
  });

  it('không sửa tiến độ đầu vào', () => {
    const p = emptyProgress();
    const before = JSON.stringify(p);
    recordLevelResult(p, 1, { stars: { de: 3, tb: 3, kho: 3 } }, T0);
    expect(JSON.stringify(p)).toBe(before);
  });
});

describe('doneLevels, Trang Sổ Vàng, mở khóa', () => {
  const lesson1Done = (): Progress => {
    let p = emptyProgress();
    p = recordLevelResult(p, 1, { stars: { de: 3, tb: 3, kho: 3 } }, T0).progress;
    return p;
  };

  it('bài học tính khi đủ 3 trạm, game tính khi đã chơi', () => {
    expect(doneLevels(lesson1Done())).toEqual([1]);
    const partial = recordLevelResult(emptyProgress(), 1, { stars: { de: 3 } }, T0).progress;
    expect(doneLevels(partial)).toEqual([]);
    const game = recordLevelResult(emptyProgress(), 5, { stars: { game: 0 } }, T0).progress;
    expect(doneLevels(game)).toEqual([5]);
  });

  it('xong màn ready cuối cùng của làng thì nhận Trang Sổ Vàng và ghi lại', () => {
    const p = lesson1Done(); // mốc 1: màn 2, 3 là coming-soon nên xong bài học là nhận trang 1
    expect(p.game.goldenPages).toBe(1);
    expect(unlockOf(p).levels.find((l) => l.id === 4)!.state).toBe('open');
  });

  it('Trang Sổ Vàng đã lưu thì không bị thu lại (max của đã lưu và tính được)', () => {
    const p = progressWith({ game: { goldenPages: 3, coins: 0, data: {}, updatedAt: 0 } });
    expect(withGoldenPages(p, T0).game.goldenPages).toBe(3);
    const all: Record<number, LevelStatus> = Object.fromEntries(LEVELS.map((l) => [l.id, 'ready' as const]));
    // màn 2, 3 đổi sang ready sau khi đã nhận trang 1: vẫn giữ trang
    const q = progressWith({
      levels: { 1: lv({ played: true, completed: true, stars: { de: 1, tb: 1, kho: 1 } }) },
      game: { goldenPages: 1, coins: 0, data: {}, updatedAt: 0 },
    });
    expect(withGoldenPages(q, T0, { statuses: all }).game.goldenPages).toBe(1);
    expect(unlockOf(q, { statuses: all }).levels.find((l) => l.id === 2)!.state).toBe('open');
  });
});

describe('cookie dạng gọn', () => {
  const full = (): Progress => {
    let p = emptyProgress();
    for (const l of LEVELS) {
      p = recordLevelResult(
        p,
        l.id,
        l.kind === 'lesson' ? { stars: { de: 3, tb: 3, kho: 3 } } : { stars: { game: 3 }, score: 123456, completed: true },
        T0,
        { statuses: Object.fromEntries(LEVELS.map((x) => [x.id, 'ready' as const])) },
      ).progress;
    }
    return p;
  };

  it('mã hóa rồi giải mã ra đúng tiến độ', () => {
    const p = recordLevelResult(emptyProgress(), 1, { stars: { de: 3, tb: 2, kho: 1 } }, T0).progress;
    const raw = encodeProgress(p);
    expect(JSON.parse(raw)).toMatchObject({ v: 1, lv: { '1': [1, 1, 3, 2, 1] }, gp: 1, c: 60 });
    const back = decodeProgress(raw);
    expect(back.levels[1]).toMatchObject({ played: true, completed: true, stars: { de: 3, tb: 2, kho: 1 } });
    expect(back.game).toMatchObject({ goldenPages: 1, coins: 60 });
  });

  it('game giữ mốc điểm và điểm cao nhất', () => {
    const p = recordLevelResult(emptyProgress(), 8, { stars: { game: 2 }, score: 777 }, T0).progress;
    const back = decodeProgress(encodeProgress(p));
    expect(back.levels[8]).toMatchObject({ played: true, stars: { game: 2 }, bestScore: 777 });
  });

  it('đủ 12 màn vẫn dưới 1 KB, kể cả sau khi mã hóa thành cookie', () => {
    const p = full();
    expect(Object.keys(p.levels)).toHaveLength(12);
    const raw = encodeProgress(p);
    expect(raw.length).toBeLessThan(1024);
    expect(encodeURIComponent(raw).length).toBeLessThan(1024);
    expect(buildCookie('sc_guest', raw).length).toBeLessThan(1024);
    const pending = encodePendingMap({ '3f2b8c1e-0000-4000-8000-123456789abc': { progress: p, t: T0 } });
    expect(encodeURIComponent(pending).length).toBeLessThan(1024);
  });

  it('chuỗi hỏng hoặc sai phiên bản thì trả tiến độ rỗng, không lỗi', () => {
    for (const bad of [null, undefined, '', 'xyz', '{', '[]', 'null', '{"v":2,"lv":{}}', '{"v":1}', '{"v":1,"lv":[]}', '{"v":1,"lv":{"1":"x"},"gp":"a"}']) {
      const p = decodeProgress(bad as string);
      expect(hasProgress(p), String(bad)).toBe(false);
    }
  });

  it('giá trị bẩn bị kẹp lại trong giới hạn', () => {
    const p = decodeProgress('{"v":1,"lv":{"1":[1,1,9,-4,2],"77":[1,1,3,3,3]},"gp":99,"c":-5}');
    expect(p.levels[1].stars).toEqual({ de: 3, tb: 0, kho: 2 });
    expect(p.levels[77]).toBeUndefined();
    expect(p.game.goldenPages).toBe(4);
    expect(p.game.coins).toBe(0);
  });

  it('sc_pending dạng map: giữ từng chủ; chuỗi hỏng thì map rỗng, mục hỏng bị bỏ qua', () => {
    const p = recordLevelResult(emptyProgress(), 4, { stars: { de: 1, tb: 1, kho: 1 } }, T0).progress;
    const raw = encodePendingMap({ 'user-b': { progress: p, t: 5 }, 'user-c': { progress: emptyProgress(), t: 9 } });
    const d = decodePendingMap(raw);
    expect(Object.keys(d).sort()).toEqual(['user-b', 'user-c']);
    expect(d['user-b'].progress.levels[4].completed).toBe(true);
    expect(d['user-b'].t).toBe(5);
    expect(decodePendingMap(encodeProgress(p))).toEqual({}); // dạng cũ (không phải map)
    for (const bad of ['hong', null, undefined, '', '[]', 'null', '{"u":1}', '{"u":{"v":2,"lv":{}}}']) {
      expect(decodePendingMap(bad as string), String(bad)).toEqual({});
    }
    expect(Object.keys(decodePendingMap('{"ok":' + encodeProgress(p) + ',"xau":{"v":9}}'))).toEqual(['ok']);
  });

  it('sc_pending quá 3 KB thì bỏ bản cũ nhất, giữ bản mới nhất', () => {
    const full = (): Progress => {
      let p = emptyProgress();
      for (const l of LEVELS) {
        p = recordLevelResult(
          p,
          l.id,
          l.kind === 'lesson' ? { stars: { de: 3, tb: 3, kho: 3 } } : { stars: { game: 3 }, score: 99999, completed: true },
          T0,
        ).progress;
      }
      return p;
    };
    const entries: Record<string, { progress: Progress; t: number }> = {};
    for (let i = 0; i < 8; i++) entries[`aaaaaaaa-0000-4000-8000-00000000000${i}`] = { progress: full(), t: 1000 + i };
    const raw = encodePendingMap(entries);
    expect(encodeURIComponent(raw).length).toBeLessThanOrEqual(PENDING_MAX_BYTES);
    const kept = Object.keys(decodePendingMap(raw));
    expect(kept.length).toBeGreaterThan(0);
    expect(kept.length).toBeLessThan(8);
    expect(kept).toContain('aaaaaaaa-0000-4000-8000-000000000007'); // mới nhất còn
    expect(kept).not.toContain('aaaaaaaa-0000-4000-8000-000000000000'); // cũ nhất bị bỏ
  });
});

describe('thuộc tính cookie', () => {
  it('Path=/, SameSite=Lax, 180 ngày; Domain có thì thêm; Secure chỉ khi https', () => {
    const plain = buildCookie('sc_guest', '{"v":1}');
    expect(plain).toContain('Path=/');
    expect(plain).toContain('SameSite=Lax');
    expect(plain).toContain(`Max-Age=${180 * 86400}`);
    expect(plain).not.toContain('Domain=');
    expect(plain).not.toContain('Secure');
    const prod = buildCookie('sc_guest', 'x', { domain: '.ten-mien.vn', secure: true });
    expect(prod).toContain('Domain=.ten-mien.vn');
    expect(prod).toContain('Secure');
  });

  it('xóa cookie cùng Path và Domain, Max-Age=0', () => {
    const rm = buildCookieRemoval('sc_guest', { domain: '.ten-mien.vn' });
    expect(rm).toContain('Max-Age=0');
    expect(rm).toContain('Path=/');
    expect(rm).toContain('Domain=.ten-mien.vn');
  });

  it('đọc cookie theo tên, giải mã %; không có thì null', () => {
    const value = '{"v":1,"lv":{}}';
    const header = `a=1; sc_guest=${encodeURIComponent(value)}; b=2`;
    expect(readCookie(header, 'sc_guest')).toBe(value);
    expect(readCookie(header, 'sc_pending')).toBeNull();
    expect(readCookie('', 'sc_guest')).toBeNull();
    expect(readCookie('sc_guest=%E0%A4%A', 'sc_guest')).toBeNull(); // %-escape hỏng
  });
});
