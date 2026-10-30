import { useCallback, useId, useRef, useState } from 'react';
import {
  Button,
  ChainStrip,
  FeedbackSheet,
  NumberInput,
  PortraitFrame,
  TutorialSpotlight,
  fmt,
  sound,
  starsFromMistakes,
  tutorialTexts,
  type ChainPageData,
  type StationResult,
  type TutorialStep,
} from '@so-chung/core';
import { bai1Texts } from '@so-chung/core/content/lessons/bai-1';
import { easyRound, pageCode, solutionSteps, type Lesson1Data } from '@so-chung/core/lessons/bai-1/logic';

const T = bai1Texts;

// Dữ liệu mẫu cố định cho phần làm thử P8a
const PRACTICE_GENESIS = 12;
const PRACTICE_CONTENT = 5;
const practiceSolution = solutionSteps(PRACTICE_GENESIS, PRACTICE_CONTENT); // { doubled: 24, sum: 29, code: 29 }

interface Feedback {
  isOpen: boolean;
  whatHappened: string;
  whyHappened?: string;
  howToFix?: string;
}

/**
 * Trạm Dễ: "Xây chuỗi 5 trang". Giữ nguyên luật, gợi ý và cách chấm sao của giai đoạn 1.
 * Có hướng dẫn focus và làm thử mẫu (P8a) trước khi vào bài thật.
 */
export function Easy({
  onComplete,
  onChainBuilt,
}: {
  onComplete: (r: StationResult) => void;
  /** Báo chuỗi em vừa xây để trạm Trung bình dùng lại */
  onChainBuilt: (data: Lesson1Data) => void;
}) {
  const realStartTime = useRef(performance.now());
  const { genesisCode, contents } = useRef(easyRound(Date.now())).current;

  // Trạng thái bài thật
  const [pages, setPages] = useState<ChainPageData[]>(() => contents.map((content) => ({ content, code: null })));
  const [activeIdx, setActiveIdx] = useState(0);
  const [codeVal, setCodeVal] = useState<number | null>(null);
  const [codeError, setCodeError] = useState<string | undefined>();
  const [mistakes, setMistakes] = useState(0);
  const [pageMistakes, setPageMistakes] = useState(0);
  const [feedback, setFeedback] = useState<Feedback>({ isOpen: false, whatHappened: '' });

  // Trạng thái hướng dẫn focus & làm thử (P8a)
  const [tutorialOpen, setTutorialOpen] = useState(true);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [practiceVal, setPracticeVal] = useState<number | null>(null);
  const [practiceError, setPracticeError] = useState<string | undefined>();
  const [practiceConfirmed, setPracticeConfirmed] = useState(false);
  const [practiceResult, setPracticeResult] = useState<'correct' | 'wrong' | null>(null);

  const codeRef = useRef<HTMLInputElement>(null);
  const practiceCodeRef = useRef<HTMLInputElement>(null);
  const codeId = useId();
  const practiceCodeId = useId();

  // Kết thúc hoặc bỏ qua hướng dẫn: khởi động bài thật sạch sẽ
  const finishTutorial = useCallback(() => {
    setTutorialOpen(false);
    setTutorialStep(0);
    setPracticeVal(null);
    setPracticeConfirmed(false);
    setPracticeResult(null);
    setPracticeError(undefined);
    // Bấm giờ bài thật từ khoảnh khắc này
    realStartTime.current = performance.now();
    setTimeout(() => {
      codeRef.current?.focus();
    }, 50);
  }, []);

  // Mở lại hướng dẫn giữa bài (bảo lưu nguyên vẹn trạng thái bài thật)
  const openTutorialReview = useCallback(() => {
    setTutorialOpen(true);
    setTutorialStep(0);
    setPracticeVal(null);
    setPracticeConfirmed(false);
    setPracticeResult(null);
    setPracticeError(undefined);
  }, []);

  // Thử lại khi làm thử sai
  const retryPractice = useCallback(() => {
    setPracticeVal(null);
    setPracticeResult(null);
    setPracticeError(undefined);
    setTutorialStep(3); // Quay lại bước ô nhập
    setTimeout(() => {
      practiceCodeRef.current?.focus();
    }, 50);
  }, []);

  // Kiểm tra kết quả làm thử
  const handlePracticeCheck = useCallback(() => {
    if (practiceVal === null || practiceVal < 0 || practiceVal > 99) {
      setPracticeError(tutorialTexts.man1De.nhapSaiKhoang);
      sound.playClick();
      return;
    }
    setPracticeError(undefined);

    if (practiceVal === practiceSolution.code) {
      sound.playCorrect();
      setPracticeConfirmed(true);
      setPracticeResult('correct');
      setTutorialStep(5);
    } else {
      sound.playWrong();
      setPracticeResult('wrong');
      setTutorialStep(5);
    }
  }, [practiceVal]);

  // Kiểm tra bài thật
  const checkReal = useCallback(() => {
    const content = contents[activeIdx];
    let bad = false;
    if (codeVal === null || codeVal < 0 || codeVal > 99) {
      setCodeError(T.de.maSaiKhoang);
      bad = true;
    } else setCodeError(undefined);
    if (bad) {
      sound.playClick();
      return;
    }

    const prevCode = activeIdx === 0 ? genesisCode : (pages[activeIdx - 1].code as number);
    const expected = pageCode(prevCode, content);

    if (codeVal === expected) {
      sound.playCorrect();
      const updated = [...pages];
      updated[activeIdx] = { content, code: codeVal };
      setPages(updated);

      if (activeIdx < 4) {
        setActiveIdx(activeIdx + 1);
        setCodeVal(null);
        setPageMistakes(0);
        setCodeError(undefined);
      } else {
        // Xong cả 5 trang: lưu chuỗi cho trạm Trung bình, rồi báo kết quả.
        onChainBuilt({
          genesisCode,
          contents,
          codes: updated.map((p) => p.code as number),
        });
        onComplete({
          stars: starsFromMistakes(mistakes),
          timeMs: Math.round(performance.now() - realStartTime.current),
          learned: T.de.hocDuoc,
        });
      }
    } else {
      sound.playWrong();
      setMistakes((m) => m + 1);
      const n = pageMistakes + 1;
      setPageMistakes(n);
      const vars = { ma: codeVal as number, truoc: prevCode, nd: content };
      if (n === 1) {
        // Sai lần 1: gợi ý công thức đã thế số, chưa có kết quả
        setFeedback({
          isOpen: true,
          whatHappened: fmt(T.de.sai1Chuyen, vars),
          whyHappened: fmt(T.de.sai1ViSao, vars),
          howToFix: fmt(T.de.sai1CachSua, vars),
        });
      } else {
        // Sai lần 2 trở đi: lời giải từng bước
        const steps = solutionSteps(prevCode, content);
        const v2 = { ...vars, gapDoi: steps.doubled, tong: steps.sum, ma: steps.code };
        setFeedback({
          isOpen: true,
          whatHappened: fmt(T.de.sai2Chuyen, v2),
          whyHappened: fmt(T.de.sai2ViSao, v2),
          howToFix: fmt(T.de.sai2CachSua, v2),
        });
      }
    }
  }, [contents, codeVal, activeIdx, genesisCode, pages, mistakes, pageMistakes, onChainBuilt, onComplete]);

  // Cầu nối kiểm thử probe phục vụ script tự động
  if (typeof window !== 'undefined') {
    Object.assign(window, {
      __tutorial: {
        isOpen: tutorialOpen,
        step: tutorialStep,
        practiceVal,
        practiceResult,
        setStep: (s: number) => setTutorialStep(s),
        skip: finishTutorial,
        review: openTutorialReview,
        setPracticeVal: (v: number | null) => setPracticeVal(v),
        checkPractice: handlePracticeCheck,
      },
    });
  }

  // Dữ liệu hiển thị của dải trang: làm thử hoặc bài thật
  const displayGenesis = tutorialOpen ? PRACTICE_GENESIS : genesisCode;
  const displayPages: ChainPageData[] = tutorialOpen
    ? [
        { content: PRACTICE_CONTENT, code: practiceConfirmed ? practiceSolution.code : null },
        { content: null, code: null },
        { content: null, code: null },
        { content: null, code: null },
        { content: null, code: null },
      ]
    : pages;

  const prevForActive = tutorialOpen
    ? PRACTICE_GENESIS
    : activeIdx === 0
      ? genesisCode
      : (pages[activeIdx - 1].code ?? 0);
  const currentContent = tutorialOpen ? PRACTICE_CONTENT : contents[activeIdx];
  const formula = fmt(T.chung.congThucThe, { truoc: prevForActive, nd: currentContent });

  // Định nghĩa các bước của Tutorial Spotlight
  const tutorialSteps: TutorialStep[] = [
    {
      id: 'intro',
      targetSelector: '[data-tutorial="chain-strip"]',
      title: tutorialTexts.man1De.tieuDe,
      content: tutorialTexts.man1De.intro,
      nextLabel: tutorialTexts.chung.tiep,
    },
    {
      id: 'numbers',
      targetSelector: '[data-tutorial="numbers-source"]',
      title: tutorialTexts.man1De.tieuDe,
      content: fmt(tutorialTexts.man1De.numbers, { truoc: PRACTICE_GENESIS, nd: PRACTICE_CONTENT }),
      nextLabel: tutorialTexts.chung.daHieu,
    },
    {
      id: 'formula',
      targetSelector: '[data-tutorial="formula-box"]',
      title: tutorialTexts.man1De.tieuDe,
      content: fmt(tutorialTexts.man1De.formula, {
        truoc: PRACTICE_GENESIS,
        nd: PRACTICE_CONTENT,
        tong: practiceSolution.sum,
      }),
      nextLabel: tutorialTexts.chung.thuTinhNgay,
    },
    {
      id: 'input',
      targetSelector: '[data-tutorial="code-input"]',
      title: tutorialTexts.man1De.tieuDe,
      content: tutorialTexts.man1De.input,
      interactive: true,
      nextLabel: tutorialTexts.chung.tiep,
    },
    {
      id: 'check',
      targetSelector: '[data-tutorial="check-button"]',
      title: tutorialTexts.man1De.tieuDe,
      content: tutorialTexts.man1De.check,
      interactive: true,
      hideNextButton: true,
    },
    {
      id: 'result',
      targetSelector:
        practiceResult === 'correct' ? '[data-tutorial="chain-strip"]' : '[data-tutorial="code-input"]',
      title: tutorialTexts.man1De.tieuDe,
      content:
        practiceResult === 'correct'
          ? fmt(tutorialTexts.man1De.correct, { ma: practiceSolution.code })
          : fmt(tutorialTexts.man1De.wrong, {
              truoc: PRACTICE_GENESIS,
              gapDoi: practiceSolution.doubled,
              nd: PRACTICE_CONTENT,
              tong: practiceSolution.sum,
            }),
      interactive: practiceResult !== 'correct',
    },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      {/* Tiêu đề trạm và nút Xem lại hướng dẫn */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-nau-go/20 pb-2">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold">{T.de.tieuDe}</h2>
          <p className="text-base text-chu/80">
            {tutorialOpen ? (
              <span className="font-semibold text-muc-tim-dam">{tutorialTexts.man1De.tieuDe}</span>
            ) : (
              <>
                {T.de.dangLam} <strong className="text-muc-tim-dam">{fmt(T.de.tenTrang, { n: activeIdx + 1 })}</strong>{' '}
                — {T.de.huongDan}
              </>
            )}
          </p>
        </div>

        {!tutorialOpen && (
          <Button
            size="sm"
            variant="secondary"
            onClick={openTutorialReview}
            className="flex items-center gap-1.5"
            aria-label={tutorialTexts.chung.huongDan}
          >
            <span aria-hidden="true">💡</span>
            <span>{tutorialTexts.chung.huongDan}</span>
          </Button>
        )}
      </div>

      {/* Dải trang sổ: hiển thị làm thử hoặc bài thật */}
      <div
        className="overflow-hidden rounded-bang border-2 border-nau-go/50 bg-white/50"
        data-tutorial="chain-strip"
      >
        <div data-tutorial={tutorialOpen && tutorialStep === 1 ? 'numbers-source' : undefined}>
          <ChainStrip
            genesisCode={displayGenesis}
            pages={displayPages}
            firstInvalidIndex={-1}
            activePageIndex={tutorialOpen ? 0 : activeIdx}
            isPageConfirmed={(idx) => (tutorialOpen ? practiceConfirmed && idx === 0 : idx < activeIdx)}
            isPageDimmed={(idx) => (tutorialOpen ? idx > 0 : idx > activeIdx)}
            renderCodeSlot={(idx) => {
              if (tutorialOpen) {
                if (idx !== 0) return undefined;
                return (
                  <div className="flex w-full flex-col items-center" data-tutorial="code-input">
                    <NumberInput
                      className="w-full"
                      id={practiceCodeId}
                      ref={practiceCodeRef}
                      autoFocus={tutorialStep >= 3}
                      value={practiceVal}
                      showButtons={false}
                      placeholder={tutorialTexts.man1De.inputPlaceholder}
                      ariaLabel={fmt(T.de.nhanMaTrang, { n: 1 })}
                      inputClassName="!h-10 !w-full !text-lg"
                      onChange={(v) => {
                        setPracticeVal(v);
                        setPracticeError(undefined);
                        // Khi đang ở bước nhập và đã gõ số, tự chuyển hướng dẫn sang nút Kiểm tra
                        if (tutorialStep === 3 && v !== null) {
                          setTutorialStep(4);
                        }
                      }}
                      onEnter={handlePracticeCheck}
                      error={practiceError}
                    />
                  </div>
                );
              }

              return idx !== activeIdx ? undefined : (
                <div className="flex w-full flex-col items-center" data-tutorial="code-input">
                  <NumberInput
                    className="w-full"
                    id={codeId}
                    ref={codeRef}
                    autoFocus
                    value={codeVal}
                    showButtons={false}
                    placeholder={T.chung.khoangSo}
                    ariaLabel={fmt(T.de.nhanMaTrang, { n: activeIdx + 1 })}
                    inputClassName="!h-10 !w-full !text-lg"
                    onChange={(v) => {
                      setCodeVal(v);
                      setCodeError(undefined);
                    }}
                    onEnter={checkReal}
                    error={codeError}
                  />
                </div>
              );
            }}
          />
        </div>
      </div>

      {/* Khung gợi ý công thức và nút Kiểm tra */}
      <div className="flex flex-col items-center justify-between gap-4 rounded-bang border-2 border-nau-go/50 bg-white/60 p-4 sm:flex-row min-[1280px]:sticky min-[1280px]:bottom-3 min-[1280px]:z-20 min-[1280px]:bg-giay/95">
        <div className="flex items-center gap-3" data-tutorial="formula-box">
          <PortraitFrame portrait="bi" size={72} />
          <div className="rounded-2xl border-2 border-nau-go/50 bg-giay p-3">
            <span className="mb-0.5 block text-sm font-semibold text-nau-go-dam">
              <span aria-hidden="true">💡 </span>
              {fmt(T.chung.congThuc, { n: tutorialOpen ? 1 : activeIdx + 1 })}
            </span>
            <span className="font-display text-lg font-extrabold text-muc-tim-dam">{formula}</span>
          </div>
        </div>

        <div data-tutorial="check-button">
          <Button onClick={tutorialOpen ? handlePracticeCheck : checkReal}>{T.de.kiemTra}</Button>
        </div>
      </div>

      {/* Lớp phủ Spotlight & Tooltip của Tutorial (P8a) */}
      <TutorialSpotlight
        isOpen={tutorialOpen}
        steps={tutorialSteps}
        currentStepIndex={tutorialStep}
        onNext={() => setTutorialStep((s) => Math.min(tutorialSteps.length - 1, s + 1))}
        onPrev={() => setTutorialStep((s) => Math.max(0, s - 1))}
        onSkip={finishTutorial}
        feedbackMessage={
          practiceResult === 'correct'
            ? fmt(tutorialTexts.man1De.correct, { ma: practiceSolution.code })
            : practiceResult === 'wrong'
              ? fmt(tutorialTexts.man1De.wrong, {
                  truoc: PRACTICE_GENESIS,
                  gapDoi: practiceSolution.doubled,
                  nd: PRACTICE_CONTENT,
                  tong: practiceSolution.sum,
                })
              : undefined
        }
        feedbackType={practiceResult === 'correct' ? 'success' : practiceResult === 'wrong' ? 'error' : 'info'}
        actionButton={
          tutorialStep === 5
            ? practiceResult === 'correct'
              ? {
                  label: tutorialTexts.chung.batDauChoi,
                  onClick: finishTutorial,
                  autoFocus: false,
                  variant: 'primary',
                }
              : {
                  label: tutorialTexts.chung.thuLai,
                  onClick: retryPractice,
                  autoFocus: false,
                  variant: 'secondary',
                }
            : undefined
        }
      />

      {/* Feedback sheet khi làm bài thật */}
      <FeedbackSheet
        isOpen={feedback.isOpen}
        isCorrect={false}
        whatHappened={feedback.whatHappened}
        whyHappened={feedback.whyHappened}
        howToFix={feedback.howToFix}
        onContinue={() => {
          setFeedback((f) => ({ ...f, isOpen: false }));
          codeRef.current?.focus();
        }}
        continueLabel={T.chung.thuLai}
      />
    </div>
  );
}
