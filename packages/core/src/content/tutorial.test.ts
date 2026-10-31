import { describe, expect, it } from 'vitest';
import { tutorialTexts } from './tutorial';
import { fmt } from './characters';
import { pageCode, solutionSteps } from '../lessons/bai-1/logic';

describe('tutorial.ts content and logic checks (P8a)', () => {
  it('đầy đủ các chuỗi dùng chung và Màn 1 Dễ, không để trống', () => {
    expect(tutorialTexts.chung.tieuDe).toBeTruthy();
    expect(tutorialTexts.chung.boQua).toBeTruthy();
    expect(tutorialTexts.chung.tiep).toBeTruthy();
    expect(tutorialTexts.chung.batDauChoi).toBeTruthy();
    expect(tutorialTexts.chung.thuLai).toBeTruthy();
    expect(tutorialTexts.chung.huongDan).toBeTruthy();

    expect(tutorialTexts.man1De.tieuDe).toBeTruthy();
    expect(tutorialTexts.man1De.intro).toBeTruthy();
    expect(tutorialTexts.man1De.numbers).toBeTruthy();
    expect(tutorialTexts.man1De.formula).toBeTruthy();
    expect(tutorialTexts.man1De.input).toBeTruthy();
    expect(tutorialTexts.man1De.check).toBeTruthy();
    expect(tutorialTexts.man1De.correct).toBeTruthy();
    expect(tutorialTexts.man1De.wrong).toBeTruthy();

    expect(tutorialTexts.man7De.tieuDe).toBeTruthy();
    expect(tutorialTexts.man7Tb.tieuDe).toBeTruthy();
    expect(tutorialTexts.man7Kho.tieuDe).toBeTruthy();

    expect(tutorialTexts.man10De.tieuDe).toBeTruthy();
    expect(tutorialTexts.man10Tb.tieuDe).toBeTruthy();
    expect(tutorialTexts.man10Kho.tieuDe).toBeTruthy();

    expect(tutorialTexts.man2.tieuDe).toBeTruthy();
    expect(tutorialTexts.man2.intro).toBeTruthy();
    expect(tutorialTexts.man2.controls).toBeTruthy();

    expect(tutorialTexts.man3.tieuDe).toBeTruthy();
    expect(tutorialTexts.man3.intro).toBeTruthy();
    expect(tutorialTexts.man3.chain).toBeTruthy();

    expect(tutorialTexts.man5.tieuDe).toBeTruthy();
    expect(tutorialTexts.man5.intro).toBeTruthy();
    expect(tutorialTexts.man5.lanes).toBeTruthy();
    expect(tutorialTexts.man5.practice).toBeTruthy();

    expect(tutorialTexts.man6.tieuDe).toBeTruthy();
    expect(tutorialTexts.man6.intro).toBeTruthy();
    expect(tutorialTexts.man6.controls).toBeTruthy();
    expect(tutorialTexts.man6.practice).toBeTruthy();

    expect(tutorialTexts.man8.tieuDe).toBeTruthy();
    expect(tutorialTexts.man8.intro).toBeTruthy();
    expect(tutorialTexts.man8.grid).toBeTruthy();
    expect(tutorialTexts.man8.practice).toBeTruthy();

    expect(tutorialTexts.man9.tieuDe).toBeTruthy();
    expect(tutorialTexts.man9.intro).toBeTruthy();
    expect(tutorialTexts.man9.load).toBeTruthy();
    expect(tutorialTexts.man9.practice).toBeTruthy();

    expect(tutorialTexts.man11.tieuDe).toBeTruthy();
    expect(tutorialTexts.man11.intro).toBeTruthy();
    expect(tutorialTexts.man11.board).toBeTruthy();
    expect(tutorialTexts.man11.practice).toBeTruthy();

    expect(tutorialTexts.man12.tieuDe).toBeTruthy();
    expect(tutorialTexts.man12.intro).toBeTruthy();
    expect(tutorialTexts.man12.tree).toBeTruthy();
    expect(tutorialTexts.man12.practice).toBeTruthy();
  });

  it('dữ liệu mẫu cố định 12 và 5 khớp hoàn toàn công thức pageCode và solutionSteps', () => {
    const genesis = 12;
    const content = 5;
    const code = pageCode(genesis, content);
    const steps = solutionSteps(genesis, content);

    expect(code).toBe(29);
    expect(steps.doubled).toBe(24);
    expect(steps.sum).toBe(29);
    expect(steps.code).toBe(29);
  });

  it('thay thế biến fmt cho kết quả đúng và thông báo sai không để sót biến thô', () => {
    const rightStr = fmt(tutorialTexts.man1De.correct, { ma: 29 });
    expect(rightStr).not.toContain('{ma}');
    expect(rightStr).toContain('29');

    const wrongStr = fmt(tutorialTexts.man1De.wrong, {
      truoc: 12,
      gapDoi: 24,
      nd: 5,
      tong: 29,
    });
    expect(wrongStr).not.toContain('{truoc}');
    expect(wrongStr).not.toContain('{gapDoi}');
    expect(wrongStr).not.toContain('{nd}');
    expect(wrongStr).not.toContain('{tong}');
    expect(wrongStr).toContain('12');
    expect(wrongStr).toContain('24');
    expect(wrongStr).toContain('5');
    expect(wrongStr).toContain('29');
  });
});
