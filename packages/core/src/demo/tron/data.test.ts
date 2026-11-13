import { describe, expect, it } from 'vitest';
import { QUESTIONS } from '../../content/questions';
import { buildChain, isSafeDelta, pageCode } from '../../lib/chain';
import { TRON_DATA as D } from './data';

describe('số liệu khóa cứng: màn 1', () => {
  it('trạm Dễ: bìa 10 → 43, 31, 69, 26, 64', () => {
    expect(buildChain(D.man1.easy.genesis, [...D.man1.easy.contents])).toEqual([43, 31, 69, 26, 64]);
  });
  it('trạm Trung bình: Tí đổi trang 2 từ 45 sang 72 → mã 58, 23, 34, 80', () => {
    const c = [...D.man1.easy.contents];
    expect(c[D.man1.medium.tamperIndex]).toBe(45);
    expect(isSafeDelta(45, D.man1.medium.newContent)).toBe(true);
    c[D.man1.medium.tamperIndex] = D.man1.medium.newContent;
    const codes = buildChain(D.man1.easy.genesis, c);
    expect(codes.slice(1, 5)).toEqual([58, 23, 34, 80]);
  });
  it('trạm Khó: bìa 79, trang 1 mã 87; sửa trang 2 thành 22 → 96, 10, 67', () => {
    const h = D.man1.hard;
    const orig = buildChain(h.genesis, [...h.contents]);
    expect(orig[0]).toBe(87);
    expect(isSafeDelta(h.contents[1], h.tamperedContent)).toBe(true);
    const fixed = buildChain(h.genesis, h.contents.map((c, i) => (i === 1 ? h.tamperedContent : c)));
    expect(fixed.slice(1, 4)).toEqual([96, 10, 67]);
    expect(h.contents.slice(2, 4)).toEqual([18, 47]);
  });
});

describe('số liệu khóa cứng: màn 2', () => {
  it('B1-01: mã trước 40, nội dung 25 → 5; đáp án C trong thứ tự 50, 105, 5, 65', () => {
    expect(pageCode(40, 25)).toBe(5);
    const q = QUESTIONS.find((x) => x.id === D.man2.question.id)!;
    expect([...D.man2.question.options].sort()).toEqual([...q.options].sort());
    expect(D.man2.question.options[2]).toBe(q.options[q.correctIndex]);
  });
});

describe('số liệu khóa cứng: màn 3', () => {
  const codes = buildChain(D.man3.genesis, [...D.man3.contents]);
  it('vòng 1 ghép 43, 31, 69', () => {
    expect(codes).toEqual([43, 31, 69]);
  });
  it('trang giả (31, 50, 99): mã trước khớp nhưng công thức sai (31 × 2 + 50 = 112 → 12)', () => {
    const f = D.man3.fake;
    expect(pageCode(f.prev, f.content)).toBe(12);
    expect(f.code).not.toBe(pageCode(f.prev, f.content));
    expect(codes.slice(0, -1)).toContain(f.prev);
    expect(f.code).toBe(99);
  });
  it('khay là hoán vị của chuỗi, khác thứ tự chuỗi', () => {
    expect([...D.man3.trayOrder].sort()).toEqual([0, 1, 2]);
    expect(D.man3.trayOrder.some((v, i) => v !== i)).toBe(true);
  });
});

import { isValidProposal, generateMedium } from '../../lessons/bai-2/logic';
import { createMulberry32 } from '../../lib/rng';
import { tronEasyData } from './builders';

describe('số liệu khóa cứng: màn 4', () => {
  const easy = tronEasyData(D.man4.easy, isValidProposal);
  it('trạm Dễ: trang cuối sổ mã 57; (57, 36, 50) đồng ý; mã 51 thì sai', () => {
    expect(easy.startPages.map((p) => p.code)).toEqual([20, 57]);
    expect(isValidProposal(57, { prevCode: 57, content: 36, code: 50 })).toBe('ok');
    expect(isValidProposal(57, { prevCode: 57, content: 36, code: 51 })).toBe('wrong-code');
    expect(pageCode(57, 36)).toBe(50);
  });
  it('trạm Dễ: 5 vòng, cờ hợp lệ theo logic (đúng, sai, đúng, đúng, sai)', () => {
    expect(easy.rounds.map((r) => r.isValid)).toEqual([true, false, true, true, false]);
  });
  it('trạm Khó: sổ mã 20, 25; lượt em tạo (25, 18) → 68', () => {
    expect(buildChain(D.man4.hard.genesis, [...D.man4.hard.contents])).toEqual([20, 25]);
    expect(pageCode(25, D.man4.hard.firstContent)).toBe(68);
  });
  it('trạm Trung bình: hạt giống cố định cho cùng đề (tất định)', () => {
    const a = generateMedium(createMulberry32(D.man4.mediumSeed));
    const b = generateMedium(createMulberry32(D.man4.mediumSeed));
    expect(a).toEqual(b);
    expect(a.rounds.filter((r) => r.kind === 'valid')).toHaveLength(2);
  });
});

import { buildTree, combine, DEFAULT_EASY_TXS, SAMPLE_HARD_CHALLENGE } from '../../lessons/bai-4/logic';

describe('số liệu khóa cứng: màn 10', () => {
  it('Dễ: lá 3, 7, 5, 2 → T12 37, T34 52, T21 73', () => {
    const v = DEFAULT_EASY_TXS.map((t) => t.value);
    expect(v).toEqual([3, 7, 5, 2]);
    expect(combine(v[0], v[1])).toBe(37);
    expect(combine(v[2], v[3])).toBe(52);
    expect(combine(v[1], v[0])).toBe(73);
  });
  it('Trung bình: lá 4, 2, 6, 1 → 42, 61, gốc 481; T3 6 → 7: T34 71, gốc 491', () => {
    const l = [...D.man10.mediumLeaves];
    const t = buildTree(l);
    expect([t[1][0], t[1][1], t[2][0]]).toEqual([42, 61, 481]);
    const t2 = buildTree(l.map((x, i) => (i === 2 ? x + 1 : x)));
    expect([t2[1][1], t2[2][0]]).toEqual([71, 491]);
  });
  it('Khó: đề mẫu lá 3 7 5 2 6 1 4 8; ô ẩn T6, T12, T34, T78, T5-8, gốc = 1, 37, 52, 48, 658, 4878; mảnh bẫy 25, 84', () => {
    const c = SAMPLE_HARD_CHALLENGE;
    const vals = c.hidden.map((h) => c.tree[h.level][h.index]);
    expect(vals).toEqual([1, 52, 48, 658, 4878, 37]);
    expect([...c.distractors].sort()).toEqual([25, 84]);
  });
});
