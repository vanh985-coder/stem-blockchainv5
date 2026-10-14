import { describe, expect, it } from 'vitest';
import { buildChain, pageCode } from '@so-chung/core/lessons/bai-1/logic';
import { createMulberry32 } from '@so-chung/core/lib/rng';
import { REBUILD_SPEC as SPEC } from './rebuildConfig';
import {
  advance,
  binCard,
  checkPlacement,
  createRebuild,
  formulaHolds,
  generateDeal,
  insertFake,
  inspectCard,
  placeCard,
  rebuildMedal,
  rebuildScore,
  roundScore,
  tailCode,
  type Card,
  type RebuildState,
} from './rebuildLogic';

const card = (prev: number, content: number, code: number, id = 'x'): Card => ({ id, prev, content, code, isFake: false });

/** Chơi hoàn hảo một vòng: ghép đúng thứ tự (đi theo công thức), bỏ trang giả vào rổ nếu có. */
function playPerfectRound(s: RebuildState): void {
  if (s.phase === 'villain') insertFake(s);
  for (const c of s.tray.slice()) if (!formulaHolds(c)) binCard(s, c.id);
  for (const c of s.deal.real) placeCard(s, c.id);
}

describe('bảng test của spec 05, Màn 3 (giữ nguyên số thứ tự)', () => {
  it('ca 1: buildChain(10, [23, 45, 7, 88, 12]) → [43, 31, 69, 26, 64], không trùng', () => {
    const codes = buildChain(10, [23, 45, 7, 88, 12]);
    expect(codes).toEqual([43, 31, 69, 26, 64]);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it('ca 2: thẻ (31, 7, 69) đặt sau trang có mã 31 → hợp lệ', () => {
    expect(checkPlacement(31, card(31, 7, 69))).toBe('ok');
  });

  it('ca 3: thẻ giả (31, 50, 99) bị nhận là trang giả, vì pageCode(31, 50) = 12, khác 99', () => {
    expect(pageCode(31, 50)).toBe(12);
    expect(formulaHolds(card(31, 50, 99))).toBe(false);
    expect(checkPlacement(31, card(31, 50, 99))).toBe('fake');
  });

  it('ca 4: thẻ (26, 12, 64) đặt sau trang có mã 31 → bị từ chối, vì sai mã trang trước', () => {
    expect(checkPlacement(31, card(26, 12, 64))).toBe('badPrev');
  });

  it('ca 5: sinh 500 đề → mã trang thật không trùng; trang giả luôn sai công thức', () => {
    const rng = createMulberry32(5);
    for (let i = 0; i < 500; i++) {
      const r = SPEC.rounds[i % 3];
      const d = generateDeal(rng, r.pages, r.fake);
      const codes = d.real.map((c) => c.code);
      expect(new Set(codes).size).toBe(codes.length);
      expect(codes).toEqual(buildChain(d.genesis, d.real.map((c) => c.content)));
      if (r.fake) {
        expect(d.fake).not.toBeNull();
        expect(formulaHolds(d.fake!)).toBe(false);
      } else {
        expect(d.fake).toBeNull();
      }
    }
  });
});

describe('tạo đề', () => {
  it('1000 đề ngẫu nhiên đều giải được: mỗi bước đúng một thẻ vừa khớp mã trước vừa đúng công thức, và là thẻ kế tiếp của chuỗi', () => {
    const rng = createMulberry32(20260301);
    for (let i = 0; i < 1000; i++) {
      const r = SPEC.rounds[i % 3];
      const d = generateDeal(rng, r.pages, r.fake);
      const pool = d.fake ? [...d.real, d.fake] : [...d.real];
      let tail = d.genesis;
      for (const want of d.real) {
        const fits = pool.filter((c) => checkPlacement(tail, c) === 'ok');
        expect(fits.map((c) => c.id)).toEqual([want.id]);
        tail = want.code;
      }
    }
  });

  it('1000 đề: trang giả luôn phát hiện được bằng công thức, có mã trước của trang thật không phải trang cuối, và mã khác mọi mã thật', () => {
    const rng = createMulberry32(777);
    for (let i = 0; i < 1000; i++) {
      const r = SPEC.rounds[1 + (i % 2)];
      const d = generateDeal(rng, r.pages, true);
      const f = d.fake!;
      expect(formulaHolds(f)).toBe(false);
      expect(f.code).not.toBe(pageCode(f.prev, f.content));
      const inner = d.real.slice(0, -1).map((c) => c.code);
      expect(inner).toContain(f.prev);
      const all = [d.genesis, ...d.real.map((c) => c.code)];
      expect(all).not.toContain(f.code);
      // mọi thẻ thật qua công thức; thẻ giả không đặt được vào chuỗi dù mã trước khớp
      for (const c of d.real) expect(formulaHolds(c)).toBe(true);
      expect(checkPlacement(f.prev, f)).toBe('fake');
    }
  });

  it('cùng seed thì cùng đề; mã trang bìa là G trong khoảng của Bài 1', () => {
    const a = generateDeal(createMulberry32(9), 7, true);
    const b = generateDeal(createMulberry32(9), 7, true);
    expect(a).toEqual(b);
    expect(a.genesis).toBeGreaterThanOrEqual(0);
    expect(a.genesis).toBeLessThan(100);
  });
});

describe('soi công thức', () => {
  it('hiện phép tính (31 × 2 + 7) mod 100 = 69 → khớp', () => {
    const r = inspectCard(31, card(31, 7, 69));
    expect(r).toMatchObject({ prev: 31, content: 7, doubled: 62, sum: 69, expected: 69, code: 69, matches: true, prevMatches: true });
  });
  it('thẻ giả: phép tính ra 12 nhưng thẻ ghi 99 → không khớp; mã trước khác trang cuối → prevMatches sai', () => {
    expect(inspectCard(31, card(31, 50, 99))).toMatchObject({ expected: 12, code: 99, matches: false, prevMatches: true });
    expect(inspectCard(31, card(26, 12, 64)).prevMatches).toBe(false);
  });
});

describe('vòng, tim, điểm', () => {
  it('vòng 1: 5 trang, không trang giả, vào thẳng phần chơi; khay có đủ 5 trang và không đúng thứ tự chuỗi', () => {
    const s = createRebuild(1);
    expect(s.round).toBe(0);
    expect(s.phase).toBe('play');
    expect(s.hearts).toBe(3);
    expect(s.deal.fake).toBeNull();
    expect(s.tray.map((c) => c.id).sort()).toEqual(s.deal.real.map((c) => c.id).sort());
    expect(s.tray.map((c) => c.id)).not.toEqual(s.deal.real.map((c) => c.id));
  });

  it('đặt đúng thì thẻ vào chuỗi; đặt sai mã trước thì mất 1 tim, thẻ vẫn ở khay', () => {
    const s = createRebuild(2);
    const first = s.deal.real[0];
    const wrong = s.tray.find((c) => c.prev !== tailCode(s))!;
    const bad = placeCard(s, wrong.id);
    expect(bad).toEqual({ kind: 'badPrev', heartsLeft: 2 });
    expect(s.hearts).toBe(2);
    expect(s.errors).toBe(1);
    expect(s.tray).toContain(wrong);
    expect(placeCard(s, first.id)).toEqual({ kind: 'ok', roundDone: false });
    expect(s.chain).toEqual([first]);
    expect(tailCode(s)).toBe(first.code);
  });

  it('hết 5 trang thì xong vòng; điểm vòng = 100 − 10 × lỗi', () => {
    const s = createRebuild(3);
    placeCard(s, s.tray.find((c) => c.prev !== tailCode(s))!.id); // 1 lỗi
    let last: unknown;
    for (const c of s.deal.real) last = placeCard(s, c.id);
    expect(last).toEqual({ kind: 'ok', roundDone: true });
    expect(s.phase).toBe('roundDone');
    expect(s.parts).toEqual([{ round: 0, errors: 1, fakeBinned: false, points: 90 }]);
    expect(rebuildScore(s)).toBe(90);
  });

  it('vòng 2 và 3: có chờ {phanDien} nhét trang giả; khay chỉ có trang giả sau insertFake; kéo vào rổ +30', () => {
    const s = createRebuild(4);
    playPerfectRound(s);
    advance(s);
    expect(s.round).toBe(1);
    expect(s.phase).toBe('villain');
    expect(s.deal.real).toHaveLength(7);
    expect(s.tray).toHaveLength(7);
    expect(placeCard(s, s.tray[0].id)).toEqual({ kind: 'ignored' }); // chưa chơi được lúc trang giả chưa vào
    expect(insertFake(s)).toBe(true);
    expect(insertFake(s)).toBe(false);
    expect(s.phase).toBe('play');
    expect(s.tray).toHaveLength(8);
    const fake = s.deal.fake!;
    expect(binCard(s, fake.id)).toEqual({ kind: 'binned', bonus: 30 });
    expect(s.tray).toHaveLength(7);
    for (const c of s.deal.real) placeCard(s, c.id);
    expect(s.parts[1]).toEqual({ round: 1, errors: 0, fakeBinned: true, points: 130 });
  });

  it('đặt trang giả vào chuỗi: mất 1 tim, thẻ bật ra (vẫn ở khay); ghép xong mà không bỏ rổ thì không có +30', () => {
    const s = createRebuild(5);
    playPerfectRound(s);
    advance(s);
    insertFake(s);
    const fake = s.deal.fake!;
    // đưa chuỗi tới đúng chỗ mà mã trước của trang giả khớp
    while (tailCode(s) !== fake.prev) placeCard(s, s.deal.real[s.chain.length].id);
    expect(placeCard(s, fake.id)).toEqual({ kind: 'fake', heartsLeft: 2 });
    expect(s.tray).toContain(fake);
    for (const c of s.deal.real.slice(s.chain.length)) placeCard(s, c.id);
    expect(s.phase).toBe('roundDone');
    expect(s.parts[1]).toEqual({ round: 1, errors: 1, fakeBinned: false, points: 90 });
  });

  it('trang thật bỏ vào rổ thì bật về và tính một lỗi', () => {
    const s = createRebuild(6);
    const real = s.tray[0];
    expect(binCard(s, real.id)).toEqual({ kind: 'realBack', heartsLeft: 2 });
    expect(s.tray).toContain(real);
    expect(s.errors).toBe(1);
  });

  it('hết 3 tim thì hết ván; vòng dở dang không được tính điểm', () => {
    const s = createRebuild(7);
    playPerfectRound(s); // 100
    advance(s);
    insertFake(s);
    for (let i = 0; i < 3; i++) {
      const bad = s.tray.find((c) => c.prev !== tailCode(s) && formulaHolds(c))!;
      placeCard(s, bad.id);
    }
    expect(s.hearts).toBe(0);
    expect(s.phase).toBe('over');
    expect(s.over).toBe('hearts');
    expect(rebuildScore(s)).toBe(100);
    expect(placeCard(s, s.tray[0].id)).toEqual({ kind: 'ignored' });
    expect(rebuildMedal(100)).toBe(0);
  });

  it('chơi hoàn hảo cả 3 vòng: 100 + 130 + 130 = 360, Vàng, over = done', () => {
    const s = createRebuild(8);
    for (let r = 0; r < 3; r++) {
      playPerfectRound(s);
      expect(s.phase).toBe('roundDone');
      advance(s);
    }
    expect(s.phase).toBe('over');
    expect(s.over).toBe('done');
    expect(s.hearts).toBe(3);
    expect(s.deal.real).toHaveLength(9);
    expect(rebuildScore(s)).toBe(360);
    expect(rebuildMedal(360)).toBe(3);
  });

  it('mốc điểm đúng spec: 150 Đồng, 250 Bạc, 330 Vàng', () => {
    expect([0, 149, 150, 249, 250, 329, 330, 400].map(rebuildMedal)).toEqual([0, 0, 1, 1, 2, 2, 3, 3]);
  });

  it('roundScore không âm và đúng công thức', () => {
    expect(roundScore(0, false)).toBe(100);
    expect(roundScore(2, true)).toBe(110);
    expect(roundScore(11, false)).toBe(0);
  });

  it('sai nhiều lần vẫn đạt Vàng nếu chỉ sai tối đa 2 lần và bỏ đúng 2 trang giả: 360 − 20 = 340', () => {
    const s = createRebuild(9);
    placeCard(s, s.tray.find((c) => c.prev !== tailCode(s))!.id);
    placeCard(s, s.tray.find((c) => c.prev !== tailCode(s))!.id);
    for (let r = 0; r < 3; r++) {
      playPerfectRound(s);
      advance(s);
    }
    expect(s.over).toBe('done');
    expect(rebuildScore(s)).toBe(340);
    expect(rebuildMedal(rebuildScore(s))).toBe(3);
  });

  it('tất định: cùng seed và cùng thao tác thì cùng kết quả', () => {
    const run = (): number => {
      const s = createRebuild(31);
      for (let r = 0; r < 3; r++) {
        playPerfectRound(s);
        advance(s);
      }
      return rebuildScore(s);
    };
    expect(run()).toBe(run());
    const a = createRebuild(31);
    const b = createRebuild(31);
    expect(a.tray.map((c) => c.id)).toEqual(b.tray.map((c) => c.id));
  });
});
