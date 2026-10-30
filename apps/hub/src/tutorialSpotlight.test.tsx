import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { TutorialSpotlight, tutorialTexts, fmt, type TutorialStep } from '@so-chung/core';
import { pageCode, solutionSteps } from '@so-chung/core/lessons/bai-1/logic';

const dummySteps: TutorialStep[] = [
  {
    id: 'intro',
    targetSelector: '[data-tutorial="chain-strip"]',
    title: 'Làm thử: Tính mã một trang',
    content: 'Trước khi bắt đầu, hãy cùng làm thử một trang để nắm cách tính mã trang nhé!',
    nextLabel: 'Tiếp tục',
  },
  {
    id: 'numbers',
    targetSelector: '[data-tutorial="numbers-source"]',
    title: 'Làm thử: Tính mã một trang',
    content: 'Mã trang được tính từ hai số: mã của trang trước (12) và nội dung của trang này (5).',
    nextLabel: 'Đã hiểu',
  },
  {
    id: 'check',
    targetSelector: '[data-tutorial="check-button"]',
    title: 'Làm thử: Tính mã một trang',
    content: 'Bấm nút "Kiểm tra" (hoặc nhấn phím Enter) để xem kết quả.',
    interactive: true,
    hideNextButton: true,
  },
];

describe('TutorialSpotlight (P8a - Cơ chế focus & làm thử dùng chung)', () => {
  it('khi isOpen = false: không render bất kỳ phần tử spotlight nào', () => {
    const html = renderToStaticMarkup(
      <TutorialSpotlight
        isOpen={false}
        steps={dummySteps}
        currentStepIndex={0}
        onSkip={() => {}}
      />
    );
    expect(html).toBe('');
  });

  it('khi isOpen = true: render đầy đủ spotlight root, tooltip, tiêu đề bước và nút Bỏ qua', () => {
    const html = renderToStaticMarkup(
      <TutorialSpotlight
        isOpen={true}
        steps={dummySteps}
        currentStepIndex={0}
        onSkip={() => {}}
      />
    );
    expect(html).toContain('data-testid="tutorial-spotlight"');
    expect(html).toContain('data-testid="tutorial-tooltip"');
    expect(html).toContain('Làm thử: Tính mã một trang');
    expect(html).toContain('Trước khi bắt đầu, hãy cùng làm thử một trang');
    expect(html).toContain(tutorialTexts.chung.boQua);
    expect(html).toContain('Tiếp tục');
  });

  it('bước có hideNextButton = true: không hiển thị nút Tiếp tục mặc định', () => {
    const html = renderToStaticMarkup(
      <TutorialSpotlight
        isOpen={true}
        steps={dummySteps}
        currentStepIndex={2}
        onSkip={() => {}}
      />
    );
    expect(html).toContain('Kiểm tra');
    expect(html).not.toContain('Tiếp tục');
  });

  it('hiển thị thông báo phản hồi đúng (success) kèm nút hành động tùy biến', () => {
    const html = renderToStaticMarkup(
      <TutorialSpotlight
        isOpen={true}
        steps={dummySteps}
        currentStepIndex={2}
        onSkip={() => {}}
        feedbackMessage="Chính xác! Mã trang là 29."
        feedbackType="success"
        actionButton={{
          label: 'Bắt đầu chơi thật',
          onClick: () => {},
          variant: 'primary',
        }}
      />
    );
    expect(html).toContain('Chính xác! Mã trang là 29.');
    expect(html).toContain('border-xanh-la-dam/60');
    expect(html).toContain('Bắt đầu chơi thật');
  });

  it('hiển thị thông báo phản hồi sai (error) kèm nút Thử lại', () => {
    const html = renderToStaticMarkup(
      <TutorialSpotlight
        isOpen={true}
        steps={dummySteps}
        currentStepIndex={2}
        onSkip={() => {}}
        feedbackMessage="Chưa đúng rồi: 12 × 2 = 24, cộng 5 thành 29."
        feedbackType="error"
        actionButton={{
          label: 'Thử lại',
          onClick: () => {},
          variant: 'secondary',
        }}
      />
    );
    expect(html).toContain('Chưa đúng rồi: 12 × 2 = 24, cộng 5 thành 29.');
    expect(html).toContain('border-do-son/60');
    expect(html).toContain('Thử lại');
  });
});

describe('Dữ liệu và Logic mẫu Màn 1 Trạm Dễ (P8a)', () => {
  it('dữ liệu ví dụ cố định: trang bìa 12, nội dung 5 cho ra đúng mã 29 theo pageCode', () => {
    const genesis = 12;
    const content = 5;
    const code = pageCode(genesis, content);
    expect(code).toBe(29);

    const steps = solutionSteps(genesis, content);
    expect(steps.doubled).toBe(24);
    expect(steps.sum).toBe(29);
    expect(steps.code).toBe(29);
  });

  it('nội dung tutorialTexts.man1De không rỗng và định dạng chính xác với fmt', () => {
    const t = tutorialTexts.man1De;
    expect(t.intro).toBeTruthy();
    expect(t.numbers).toContain('{truoc}');
    expect(t.numbers).toContain('{nd}');

    const formattedNumbers = fmt(t.numbers, { truoc: 12, nd: 5 });
    expect(formattedNumbers).toContain('12');
    expect(formattedNumbers).toContain('5');

    const formattedFormula = fmt(t.formula, { truoc: 12, nd: 5, tong: 29 });
    expect(formattedFormula).toContain('12');
    expect(formattedFormula).toContain('5');
    expect(formattedFormula).toContain('29');

    const formattedWrong = fmt(t.wrong, { truoc: 12, gapDoi: 24, nd: 5, tong: 29 });
    expect(formattedWrong).toContain('24');
    expect(formattedWrong).toContain('29');

    const formattedCorrect = fmt(t.correct, { ma: 29 });
    expect(formattedCorrect).toContain('29');
  });
});
