import { describe, expect, it } from 'vitest';
import { buildChain, pageCode } from '@so-chung/core/lessons/bai-1/logic';
import { createMulberry32 } from '@so-chung/core/lib/rng';
import { REBUILD_SPEC as SPEC } from './rebuildConfig';
import {
  advance,
  binCard,
  inspectionLine,
  checkPlacement,
  createRebuild,
  formulaHolds,
  generateDeal,
  insertFake,
  inspectCard,
  placeCard,
  REBUILD_MAX_SCORE,
  rebuildMedal,
  rebuildScore,
  roundScore,
  scoreParts,
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
    expect(formulaHolds(card(31, 7, 69))).toBe(true);
  });

  it('ca 3: thẻ giả (31, 50, 99) → bị nhận là trang giả, vì pageCode(31, 50) = 12 ≠ 99', () => {
    expect(pageCode(31, 50)).toBe(12);
    expect(checkPlacement(31, card(31, 50, 99))).toBe('fake');
    expect(formulaHolds(card(31, 50, 99))).toBe(false);
  });

  it('ca 4: thẻ (26, 12, 64) đặt sau trang có mã 31 → bị từ chối vì sai mã trước (xét trước mã trang)', () => {
    expect(checkPlacement(31, card(26, 12, 64))).toBe('badPrev');
    // kể cả nếu thẻ đó là thẻ giả, đặt sau mã trước sai vẫn là badPrev
    expect(checkPlacement(31, card(26, 12, 99))).toBe('badPrev');
  });

  it('ca 5: sinh 500 đề → mã trang thật không trùng, trang giả luôn sai công thức và không trùng mã', () => {
    const rng = createMulberry32(12345);
    for (let i = 0; i < 500; i++) {
      const pages = 5 + (i % 3) * 2;
      const d = generateDeal(rng, pages, true);
      const realCodes = d.real.map((c) => c.code);
      expect(new Set([d.genesis, ...realCodes]).size).toBe(pages + 1);
      for (let j = 0; j < pages; j++) {
        const prev = j === 0 ? d.genesis : d.real[j - 1].code;
        expect(d.real[j].prev).toBe(prev);
        expect(formulaHolds(d.real[j])).toBe(true);
      }
      expect(d.fake).not.toBeNull();
      const fake = d.fake!;
      expect(formulaHolds(fake)).toBe(false);
      expect(realCodes).toContain(fake.prev);
      expect(fake.prev).not.toBe(realCodes[realCodes.length - 1]);
      expect([d.genesis, ...realCodes]).not.toContain(fake.code);
    }
  });
});

describe('Soi công thức (inspectCard)', () => {
  it('tính đúng prev × 2, tổng, mã kỳ vọng và so khớp', () => {
    const ok = inspectCard(31, card(31, 7, 69));
    expect(ok).toEqual({ prev: 31, content: 7, doubled: 62, sum: 69, expected: 69, code: 69, matches: true, prevMatches: true });
    const fake = inspectCard(31, card(31, 50, 99));
    expect(fake).toEqual({ prev: 31, content: 50, doubled: 62, sum: 112, expected: 12, code: 99, matches: false, prevMatches: true });
    const badTail = inspectCard(20, card(31, 7, 69));
    expect(badTail.matches).toBe(true);
    expect(badTail.prevMatches).toBe(false);
  });
});

describe('tiến trình ván và luật ghép thẻ (createRebuild, placeCard, binCard, advance)', () => {
  it('vòng 1: 5 trang, không trang giả; hoàn thành được 100 điểm', () => {
    const s = createRebuild(1);
    expect(s.round).toBe(0);
    expect(s.hearts).toBe(3);
    expect(s.phase).toBe('play');
    expect(s.deal.fake).toBeNull();
    expect(s.deal.real).toHaveLength(5);
    expect(s.chain).toHaveLength(0);
    expect(s.tray).toHaveLength(5);
    for (let i = 0; i < 5; i++) {
      const need = tailCode(s);
      const c = s.tray.find((x) => x.prev === need)!;
      const res = placeCard(s, c.id);
      expect(res.kind).toBe('ok');
      expect(s.chain).toHaveLength(i + 1);
      if (i < 4) expect(res).toEqual({ kind: 'ok', roundDone: false });
      else expect(res).toEqual({ kind: 'ok', roundDone: true });
    }
    expect(s.phase).toBe('roundDone');
    expect(s.errors).toBe(0);
    expect(s.parts).toHaveLength(1);
    expect(s.parts[0]).toEqual({ round: 0, errors: 0, fakeBinned: false, points: 100 });
  });

  it('đặt sai mã trước: thẻ bật về, mất 1 tim, errors tăng', () => {
    const s = createRebuild(2);
    const wrong = s.tray.find((c) => c.prev !== tailCode(s))!;
    expect(placeCard(s, wrong.id)).toEqual({ kind: 'badPrev', heartsLeft: 2 });
    expect(s.chain).toHaveLength(0);
    expect(s.tray).toContain(wrong);
    expect(s.errors).toBe(1);
    expect(s.hearts).toBe(2);
  });

  it('vòng 2: bắt đầu ở phase villain; insertFake đưa trang giả vào khay; bỏ đúng trang giả vào rổ được +30 điểm; ghép xong chuỗi 7 trang hết ván', () => {
    const s = createRebuild(3);
    playPerfectRound(s);
    advance(s);
    expect(s.round).toBe(1);
    expect(s.phase).toBe('villain');
    expect(s.deal.fake).not.toBeNull();
    expect(s.tray).toHaveLength(7);
    expect(placeCard(s, s.tray[0].id)).toEqual({ kind: 'ignored' });
    expect(insertFake(s)).toBe(true);
    expect(insertFake(s)).toBe(false);
    expect(s.phase).toBe('play');
    expect(s.tray).toHaveLength(8);
    const fake = s.deal.fake!;
    expect(binCard(s, fake.id)).toEqual({ kind: 'binned', bonus: 30 });
    expect(s.tray).toHaveLength(7);
    for (const c of s.deal.real) placeCard(s, c.id);
    expect(s.parts[1]).toEqual({ round: 1, errors: 0, fakeBinned: true, points: 130 });
    expect(s.phase).toBe('over');
    expect(s.over).toBe('done');
    expect(s.round).toBe(1);
  });

  it('đặt trang giả vào chuỗi: mất 1 tim, thẻ bật ra (vẫn ở khay); ghép xong mà không bỏ rổ thì không có +30', () => {
    const s = createRebuild(5);
    playPerfectRound(s);
    advance(s);
    insertFake(s);
    const fake = s.deal.fake!;
    while (tailCode(s) !== fake.prev) placeCard(s, s.deal.real[s.chain.length].id);
    expect(placeCard(s, fake.id)).toEqual({ kind: 'fake', heartsLeft: 2 });
    expect(s.tray).toContain(fake);
    for (const c of s.deal.real.slice(s.chain.length)) placeCard(s, c.id);
    expect(s.phase).toBe('over');
    expect(s.over).toBe('done');
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

  it('chơi hoàn hảo hai vòng: 100 + 130 = 230, Vàng, over = done; không có vòng 3', () => {
    const s = createRebuild(8);
    expect(SPEC.rounds).toHaveLength(2);
    playPerfectRound(s);
    expect(s.phase).toBe('roundDone');
    advance(s);
    expect(s.round).toBe(1);
    playPerfectRound(s);
    expect(s.phase).toBe('over');
    expect(s.over).toBe('done');
    expect(s.round).toBe(1);
    expect(s.hearts).toBe(3);
    expect(s.deal.real).toHaveLength(7);
    expect(rebuildScore(s)).toBe(230);
    expect(rebuildMedal(rebuildScore(s))).toBe(3);
  });

  it('mốc điểm: 210 Đồng, 220 Bạc, 230 Vàng', () => {
    expect(SPEC.medals).toEqual([210, 220, 230]);
    expect([0, 209, 210, 219, 220, 229, 230, 250].map(rebuildMedal)).toEqual([0, 0, 1, 1, 2, 2, 3, 3]);
    expect(REBUILD_MAX_SCORE).toBe(230);
    expect(REBUILD_MAX_SCORE).toBe(100 + 130);
  });

  it('roundScore không âm và đúng công thức', () => {
    expect(roundScore(0, false)).toBe(100);
    expect(roundScore(2, true)).toBe(110);
    expect(roundScore(11, false)).toBe(0);
  });

  it('sai 1 lần ở vòng 1 (còn 2 tim) rồi chơi hoàn hảo: 90 + 130 = 220, Bạc', () => {
    const s = createRebuild(9);
    placeCard(s, s.tray.find((c) => c.prev !== tailCode(s))!.id);
    expect(s.hearts).toBe(2);
    playPerfectRound(s);
    expect(s.hearts).toBe(2);
    advance(s);
    playPerfectRound(s);
    expect(s.over).toBe('done');
    expect(s.hearts).toBe(2);
    expect(rebuildScore(s)).toBe(220);
    expect(rebuildMedal(rebuildScore(s))).toBe(2);
  });

  it('tất định: cùng seed và cùng thao tác thì cùng kết quả', () => {
    const run = (): number => {
      const s = createRebuild(31);
      playPerfectRound(s);
      advance(s);
      playPerfectRound(s);
      return rebuildScore(s);
    };
    expect(run()).toBe(run());
    const a = createRebuild(31);
    const b = createRebuild(31);
    expect(a.tray.map((c) => c.id)).toEqual(b.tray.map((c) => c.id));
  });
});

describe('dòng "Soi công thức" hiện sẵn phép tính và kết quả', () => {
  it('thẻ thật: kết quả bằng mã trang ghi trên thẻ → khớp (ví dụ spec: (31 × 2 + 7) mod 100 = 69)', () => {
    expect(inspectionLine(card(31, 7, 69))).toEqual({ kind: 'khop', expected: 69 });
  });
  it('trang giả: kết quả khác mã ghi trên thẻ → lệch, kèm kết quả đúng của công thức', () => {
    expect(inspectionLine(card(31, 50, 99))).toEqual({ kind: 'lech', expected: 12 });
  });
  it('không phụ thuộc vị trí của thẻ: không nói thẻ đặt được hay không, chỉ so mã trang với công thức', () => {
    expect(inspectionLine(card(26, 12, 64))).toEqual({ kind: 'khop', expected: 64 });
  });
  it('mọi thẻ thật của 300 đề đều khớp và mọi trang giả đều lệch', () => {
    const rng = createMulberry32(4242);
    for (let i = 0; i < 300; i++) {
      const r = SPEC.rounds[i % 2];
      const d = generateDeal(rng, r.pages, r.fake);
      for (const c of d.real) expect(inspectionLine(c).kind).toBe('khop');
      if (d.fake) expect(inspectionLine(d.fake).kind).toBe('lech');
    }
  });
});

describe('các phần điểm cho màn kết quả', () => {
  it('tổng các phần bằng điểm ván, vòng dở dang không có dòng', () => {
    const s = createRebuild(12);
    placeCard(s, s.tray.find((c) => c.prev !== tailCode(s))!.id);
    playPerfectRound(s);
    advance(s);
    playPerfectRound(s);
    expect(s.phase).toBe('over');
    expect(s.over).toBe('done');
    const rows = scoreParts(s);
    expect(rows).toEqual([
      { key: 'vong', round: 0, count: 1, points: 90 },
      { key: 'vong', round: 1, count: 0, points: 100 },
      { key: 'trangGia', round: 1, count: 1, points: 30 },
    ]);
    expect(rows.reduce((a, r) => a + r.points, 0)).toBe(rebuildScore(s));
  });
});
