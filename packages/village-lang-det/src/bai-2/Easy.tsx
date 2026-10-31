import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Button,
  PageCodeCalculator,
  FeedbackSheet,
  Hearts,
  MatXich,
  TrangSo,
  fmt,
  sound,
  starsFromHearts,
  TutorialSpotlight,
  type StationResult,
  type TutorialStep,
} from '@so-chung/core';
import { bai2Texts } from '@so-chung/core/content/lessons/bai-2';
import { tutorialTexts } from '@so-chung/core/content/tutorial';
import { formatNumber } from '@so-chung/core/lib/format';
import { createMulberry32 } from '@so-chung/core/lib/rng';
import { generateEasy, explainCheck, type Proposal } from '@so-chung/core/lessons/bai-2/logic';
import { Chan, tenNhan } from './nguoi';

const T = bai2Texts;

// Dữ liệu làm thử cho Trạm Dễ (P8c)
const PRACTICE_X = 40;
const PRACTICE_C = 15;
const PRACTICE_PROPOSAL_CODE = 95; // (40 * 2 + 15) % 100 = 95 (hợp lệ)
const PRACTICE_EXPECTED_DECISION = true; // Đồng ý
const PRACTICE_START_LEDGER = [{ prevCode: 12, content: 16, code: 40 }];

interface Feedback {
  isOpen: boolean;
  isCorrect: boolean;
  whatHappened: string;
  whyHappened?: string;
}

/** Trạm Dễ: "Duyệt trang mới" (5 vòng, 3 tim). Giữ nguyên luật, phản hồi và cách chấm sao của giai đoạn 1. */
export function Easy({ onComplete, onFail }: { onComplete: (r: StationResult) => void; onFail: (tip: string) => void }) {
  const realStartTime = useRef(performance.now());

  const gameData = useMemo(() => generateEasy(createMulberry32((Date.now() ^ (Math.random() * 0x100000000)) >>> 0)), []);

  // Trạng thái Hướng dẫn focus và Làm thử (P8c)
  const [tutorialOpen, setTutorialOpen] = useState(true);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [practiceResult, setPracticeResult] = useState<'correct' | 'wrong' | null>(null);

  const [hearts, setHearts] = useState(3);
  const [mistakes, setMistakes] = useState(0);
  const [roundIndex, setRoundIndex] = useState(0);
  // Sổ của em bắt đầu bằng 2 trang mẫu; luôn đi theo quyết định đúng của đa số.
  const [myLedger, setMyLedger] = useState<{ prevCode: number; content: number; code: number }[]>(() => [...gameData.startPages]);
  const [feedback, setFeedback] = useState<Feedback>({ isOpen: false, isCorrect: true, whatHappened: '' });

  // Màn hẹp: cuộn dải sổ tới trang cuối (trang mới nhất) cho dễ thấy
  const ledgerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ledgerRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [myLedger.length]);

  const currentRound = gameData.rounds[roundIndex];
  const lastPage = myLedger[myLedger.length - 1];
  const lastCodeX = lastPage ? lastPage.code : gameData.startGenesis;

  const currentProposal: Proposal = useMemo(
    () => ({ prevCode: lastCodeX, content: currentRound ? currentRound.content : 0, code: currentRound ? currentRound.code : 0 }),
    [lastCodeX, currentRound],
  );

  // Điều khiển Hướng dẫn và Làm thử (P8c)
  const finishTutorial = useCallback(() => {
    setTutorialOpen(false);
    setTutorialStep(0);
    setPracticeResult(null);
    realStartTime.current = performance.now();
  }, []);

  const openTutorialReview = useCallback(() => {
    setTutorialOpen(true);
    setTutorialStep(0);
    setPracticeResult(null);
  }, []);

  const retryPractice = useCallback(() => {
    setPracticeResult(null);
    setTutorialStep(4); // Quay lại bước nút biểu quyết
  }, []);

  const handlePracticeDecision = useCallback((userAgreed: boolean) => {
    if (userAgreed === PRACTICE_EXPECTED_DECISION) {
      sound.playCorrect();
      setPracticeResult('correct');
      setTutorialStep(5);
    } else {
      sound.playWrong();
      setPracticeResult('wrong');
      setTutorialStep(5);
    }
  }, []);

  // Cầu nối probe phục vụ kiểm tra tự động
  if (typeof window !== 'undefined') {
    Object.assign(window, {
      __tutorial: {
        isOpen: tutorialOpen,
        step: tutorialStep,
        practiceResult,
        setStep: (s: number) => setTutorialStep(s),
        skip: finishTutorial,
        review: openTutorialReview,
        decide: handlePracticeDecision,
      },
    });
  }

  const handleDecision = (userAgreed: boolean) => {
    if (!currentRound || feedback.isOpen) return;
    const isCorrect = userAgreed === currentRound.isValid;
    let extraNote = '';
    if (!isCorrect) {
      setMistakes(mistakes + 1);
      setHearts(hearts - 1);
      extraNote = currentRound.isValid ? T.chung.mayDongY : T.chung.mayTuChoi;
    }
    setFeedback({
      isOpen: true,
      isCorrect,
      whatHappened: explainCheck(lastCodeX, currentProposal),
      whyHappened: extraNote || undefined,
    });
  };

  const handleContinue = () => {
    setFeedback((prev) => ({ ...prev, isOpen: false }));

    if (hearts <= 0) {
      onFail(T.de.goiYThua);
      return;
    }

    if (currentRound && currentRound.isValid) {
      setMyLedger((prev) => [...prev, { prevCode: lastCodeX, content: currentRound.content, code: currentRound.code }]);
    }

    if (roundIndex + 1 < gameData.rounds.length) {
      setRoundIndex((prev) => prev + 1);
    } else {
      onComplete({
        stars: starsFromHearts(mistakes),
        timeMs: Math.round(performance.now() - realStartTime.current),
        learned: T.de.hocDuoc,
      });
    }
  };

  if (!currentRound) return null;

  // Dữ liệu hiển thị: làm thử hoặc bài thật
  const displayLedger = tutorialOpen ? PRACTICE_START_LEDGER : myLedger;
  const displayLastCodeX = tutorialOpen ? PRACTICE_X : lastCodeX;
  const visiblePages = displayLedger.slice(-2);

  const displaySender = tutorialOpen ? 'chi' : currentRound.sender;
  const displayContent = tutorialOpen ? PRACTICE_C : currentRound.content;
  const displayProposalCode = tutorialOpen ? PRACTICE_PROPOSAL_CODE : currentProposal.code;

  // Định nghĩa các bước Hướng dẫn focus (P8c)
  const tutorialSteps: TutorialStep[] = [
    {
      id: 'intro',
      targetSelector: '[data-tutorial="my-ledger"]',
      title: tutorialTexts.man4De.tieuDe,
      content: tutorialTexts.man4De.intro,
      nextLabel: tutorialTexts.chung.tiep,
    },
    {
      id: 'my-ledger',
      targetSelector: '[data-tutorial="my-ledger"]',
      title: tutorialTexts.man4De.tieuDe,
      content: fmt(tutorialTexts.man4De.myLedger, { x: PRACTICE_X }),
      nextLabel: tutorialTexts.chung.daHieu,
    },
    {
      id: 'proposal',
      targetSelector: '[data-tutorial="proposal-card"]',
      title: tutorialTexts.man4De.tieuDe,
      content: fmt(tutorialTexts.man4De.proposal, {
        nguoi: tenNhan('chi'),
        c: PRACTICE_C,
        ma: PRACTICE_PROPOSAL_CODE,
        x: PRACTICE_X,
      }),
      nextLabel: tutorialTexts.chung.daHieu,
    },
    {
      id: 'calculator',
      targetSelector: '[data-tutorial="calculator"]',
      title: tutorialTexts.man4De.tieuDe,
      content: tutorialTexts.man4De.calculator,
      nextLabel: tutorialTexts.chung.thuTinhNgay,
    },
    {
      id: 'decision',
      targetSelector: '[data-tutorial="decision-buttons"]',
      title: tutorialTexts.man4De.tieuDe,
      content: fmt(tutorialTexts.man4De.decision, {
        x: PRACTICE_X,
        c: PRACTICE_C,
        dung: PRACTICE_PROPOSAL_CODE,
        ma: PRACTICE_PROPOSAL_CODE,
      }),
      interactive: true,
      hideNextButton: true,
    },
    {
      id: 'result',
      targetSelector: '[data-tutorial="decision-buttons"]',
      title: tutorialTexts.man4De.tieuDe,
      content:
        practiceResult === 'correct'
          ? fmt(tutorialTexts.man4De.correct, { x: PRACTICE_X, c: PRACTICE_C, dung: PRACTICE_PROPOSAL_CODE })
          : fmt(tutorialTexts.man4De.wrong, {
              x: PRACTICE_X,
              c: PRACTICE_C,
              dung: PRACTICE_PROPOSAL_CODE,
              ma: PRACTICE_PROPOSAL_CODE,
            }),
      interactive: practiceResult !== 'correct',
    },
  ];

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      {/* Vòng chơi và tim - luôn ở trên cùng trải rộng */}
      <div className="flex items-center justify-between gap-2 rounded-bang border-2 border-nau-go/50 bg-white/60 p-3">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2">
          <span className="rounded-nut bg-muc-tim/15 px-3 py-1 font-display text-base font-extrabold text-muc-tim-dam">
            {fmt(T.chung.vong, { n: roundIndex + 1, tong: gameData.rounds.length })}
          </span>
          {tutorialOpen ? (
            <span className="rounded-full bg-muc-tim/10 px-3 py-0.5 text-xs font-bold text-muc-tim-dam">
              {tutorialTexts.man4De.tieuDe}
            </span>
          ) : (
            <span className="hidden text-sm text-nau-go-dam sm:inline">{T.de.phu}</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {!tutorialOpen && (
            <Button
              size="sm"
              variant="secondary"
              onClick={openTutorialReview}
              className="flex items-center gap-1.5"
              aria-label={tutorialTexts.chung.huongDan}
            >
              <span aria-hidden="true">💡</span>
              <span className="hidden sm:inline">{tutorialTexts.chung.huongDan}</span>
            </Button>
          )}
          <Hearts current={hearts} max={3} />
        </div>
      </div>

      {/* Bố cục đối chiếu 2 cột trên màn hình rộng: trái là sổ của em, phải là trang đề xuất + hướng dẫn + máy tính + nút */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
        {/* Cột trái: "Sổ của em" (2 trang cuối, làm nổi mã trang cuối X) */}
        <div
          data-tutorial="my-ledger"
          className={`rounded-bang border-2 border-nau-go/50 bg-white/60 p-3 sm:p-4 flex flex-col gap-3 transition-all ${
            tutorialOpen && (tutorialStep === 0 || tutorialStep === 1)
              ? 'ring-4 ring-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.8)]'
              : ''
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-nau-go/30 pb-2">
            <h2 className="flex items-center gap-2 text-lg font-bold">
              <span aria-hidden="true">📖</span> {T.chung.soCuaEm}
            </h2>
            <div className="inline-flex items-center gap-1.5 rounded-nut border-2 border-muc-tim/40 bg-muc-tim/10 px-3 py-1 text-sm font-bold text-muc-tim-dam">
              <span>{T.de.maCuoiX}</span>
              <span className="font-display text-base font-extrabold underline">{formatNumber(displayLastCodeX)}</span>
            </div>
          </div>
          <p className="text-sm text-nau-go-dam">{T.de.phu}</p>
          <div ref={ledgerRef} className="overflow-x-auto py-2">
            <div className="mx-auto flex w-max items-center justify-center gap-2">
              {visiblePages.map((page, idx) => {
                const pageNum = displayLedger.length - visiblePages.length + idx + 1;
                const isLast = idx === visiblePages.length - 1;
                return (
                  <Fragment key={pageNum}>
                    {idx > 0 && <MatXich size="sm" status="valid" />}
                    <div className={isLast ? 'rounded-2xl ring-2 ring-muc-tim' : ''}>
                      <TrangSo size="xs" pageNumber={pageNum} prevCode={page.prevCode} content={page.content} pageCode={page.code} isConfirmed />
                    </div>
                  </Fragment>
                );
              })}
            </div>
          </div>
        </div>

        {/* Cột phải: Trang mới do người trong làng gửi */}
        <div
          data-tutorial="proposal-card"
          className={`rounded-bang border-2 border-muc-tim/40 bg-white/70 p-3 sm:p-4 flex flex-col gap-4 transition-all ${
            tutorialOpen && tutorialStep === 2
              ? 'ring-4 ring-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.8)]'
              : ''
          }`}
        >
          <div className="flex items-center gap-3 border-b-2 border-nau-go/30 pb-3">
            <Chan id={displaySender} size={48} />
            <div className="min-w-0">
              <div className="text-sm text-nau-go-dam">{T.de.nguoiGui}</div>
              <div className="font-display text-base font-extrabold">
                {tenNhan(displaySender)} {T.de.guiTrang}
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row sm:items-start sm:gap-4">
            <div className="shrink-0">
              <TrangSo
                size="xs"
                pageNumber={displayLedger.length + 1}
                prevCode={displayLastCodeX}
                content={displayContent}
                pageCode={displayProposalCode}
                isConfirmed={false}
              />
            </div>
            <div className="w-full space-y-2 rounded-2xl border-2 border-nau-go/40 bg-giay p-3 text-sm sm:text-base leading-relaxed">
              <div className="mb-1 font-bold text-muc-tim-dam">
                <span aria-hidden="true">🔍 </span>
                {T.de.cachKiemTra}
              </div>
              <div>{fmt(T.de.buoc1, { x: displayLastCodeX })}</div>
              <div className="mt-1">{fmt(T.de.buoc2, { x: displayLastCodeX, nd: displayContent })}</div>
              <div className="mt-1">{fmt(T.de.buoc3, { ma: displayProposalCode })}</div>
            </div>
          </div>

          <div
            data-tutorial="calculator"
            className={`transition-all rounded-2xl ${
              tutorialOpen && tutorialStep === 3
                ? 'ring-4 ring-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.8)]'
                : ''
            }`}
          >
            <PageCodeCalculator />
          </div>

          <div
            data-tutorial="decision-buttons"
            className={`grid grid-cols-2 gap-3 pt-1 rounded-2xl transition-all ${
              tutorialOpen && (tutorialStep === 4 || tutorialStep === 5)
                ? 'ring-4 ring-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.8)] p-1 bg-yellow-400/10'
                : ''
            }`}
          >
            <Button
              size="md"
              className="px-3! whitespace-nowrap"
              onClick={() => (tutorialOpen ? handlePracticeDecision(true) : handleDecision(true))}
              disabled={feedback.isOpen}
            >
              <span aria-hidden="true">✓ </span>
              {T.chung.dongY}
            </Button>
            <Button
              variant="danger"
              size="md"
              className="px-3! whitespace-nowrap"
              onClick={() => (tutorialOpen ? handlePracticeDecision(false) : handleDecision(false))}
              disabled={feedback.isOpen}
            >
              <span aria-hidden="true">✗ </span>
              {T.chung.tuChoi}
            </Button>
          </div>
        </div>
      </div>

      <FeedbackSheet
        isOpen={feedback.isOpen}
        isCorrect={feedback.isCorrect}
        whatHappened={feedback.whatHappened}
        whyHappened={feedback.whyHappened}
        onContinue={handleContinue}
        continueLabel={hearts <= 0 ? T.chung.xemKetQua : T.chung.vongTiep}
      />

      {/* Lớp phủ Spotlight và Tooltip Hướng dẫn (P8c) */}
      <TutorialSpotlight
        isOpen={tutorialOpen}
        steps={tutorialSteps}
        currentStepIndex={tutorialStep}
        onNext={() => setTutorialStep((s) => Math.min(tutorialSteps.length - 1, s + 1))}
        onPrev={() => setTutorialStep((s) => Math.max(0, s - 1))}
        onSkip={finishTutorial}
        feedbackMessage={
          practiceResult === 'correct'
            ? fmt(tutorialTexts.man4De.correct, { x: PRACTICE_X, c: PRACTICE_C, dung: PRACTICE_PROPOSAL_CODE })
            : practiceResult === 'wrong'
              ? fmt(tutorialTexts.man4De.wrong, {
                  x: PRACTICE_X,
                  c: PRACTICE_C,
                  dung: PRACTICE_PROPOSAL_CODE,
                  ma: PRACTICE_PROPOSAL_CODE,
                })
              : undefined
        }
        feedbackType={practiceResult === 'correct' ? 'success' : practiceResult === 'wrong' ? 'error' : undefined}
        actionButton={
          tutorialStep === 5
            ? practiceResult === 'correct'
              ? {
                  label: tutorialTexts.chung.batDauChoi,
                  onClick: finishTutorial,
                  variant: 'primary',
                }
              : practiceResult === 'wrong'
                ? {
                    label: tutorialTexts.chung.thuLai,
                    onClick: retryPractice,
                    variant: 'secondary',
                  }
                : undefined
            : undefined
        }
      />
    </div>
  );
}
