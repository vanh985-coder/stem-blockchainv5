import { useCallback, useMemo, useRef, useState } from 'react';
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
import { explainCheck, generateMedium, type MediumPage, type MediumRound, type Proposal } from '@so-chung/core/lessons/bai-2/logic';
import { Chan, tenGiua } from './nguoi';

const T = bai2Texts;

interface Feedback {
  isOpen: boolean;
  isCorrect: boolean;
  whatHappened: string;
  whyHappened?: string;
}

// Dữ liệu làm thử cho Trạm Trung bình (P8c)
// Tí gửi sổ bị sửa lén ở trang 2 (từ 14 thành 15), mã lệch
const PRACTICE_SENDER = 'ti';
const PRACTICE_MY_PAGES: MediumPage[] = [
  { prevCode: 12, content: 10, code: 34 },
  { prevCode: 34, content: 14, code: 82 },
  { prevCode: 82, content: 8, code: 72 },
];
const PRACTICE_SENDER_PAGES: MediumPage[] = [
  { prevCode: 12, content: 10, code: 34 },
  { prevCode: 34, content: 15, code: 83 }, // Sửa từ 14 sang 15
  { prevCode: 83, content: 8, code: 74 }, // Mã lệch so với 72 của em
];
const PRACTICE_PROPOSAL: Proposal = {
  prevCode: 74,
  content: 12,
  code: 60, // Tính từ mã 74 sai
};
const PRACTICE_TAMPERED_INDEX = 1;
const PRACTICE_OLD_CONTENT = 14;
const PRACTICE_NEW_CONTENT = 15;
const PRACTICE_EXPECTED_DECISION = false; // Từ chối

/** Cột mắt xích nằm giữa hai trang trong hàng (đặt đè lên khe giữa các cột) */
const CHAIN_SLOT = 'pointer-events-none absolute -left-2 top-1/2 z-20 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center sm:-left-3';

/** Trạm Trung bình: "So sổ trước khi duyệt" (5 vòng, 3 tim). Giữ nguyên luật, phản hồi và cách chấm sao của giai đoạn 1. */
export function Medium({ onComplete, onFail }: { onComplete: (r: StationResult) => void; onFail: (tip: string) => void }) {
  const realStartTime = useRef(performance.now());

  const gameData = useMemo(() => generateMedium(createMulberry32((Date.now() ^ (Math.random() * 0x100000000)) >>> 0)), []);

  // Trạng thái Hướng dẫn focus và Làm thử (P8c)
  const [tutorialOpen, setTutorialOpen] = useState(true);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [practiceResult, setPracticeResult] = useState<'correct' | 'wrong' | null>(null);

  const [hearts, setHearts] = useState(3);
  const [mistakes, setMistakes] = useState(0);
  const [roundIndex, setRoundIndex] = useState(0);
  const [myLedger, setMyLedger] = useState<MediumPage[]>(() => [...gameData.startPages]);
  // Chỉ sau khi em trả lời mới tô nổi chỗ khác nhau.
  const [answered, setAnswered] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>({ isOpen: false, isCorrect: true, whatHappened: '' });

  // Hai hàng sổ cuộn ngang cùng nhau trên màn hình nhỏ
  const row1 = useRef<HTMLDivElement>(null);
  const row2 = useRef<HTMLDivElement>(null);
  const syncing = useRef(false);
  const syncScroll = (from: HTMLDivElement | null, to: HTMLDivElement | null) => {
    if (syncing.current || !from || !to) return;
    syncing.current = true;
    to.scrollLeft = from.scrollLeft;
    requestAnimationFrame(() => {
      syncing.current = false;
    });
  };

  const currentRound: MediumRound | undefined = gameData.rounds[roundIndex];
  const myLast3 = myLedger.slice(-3);
  const myLastCode = myLast3[myLast3.length - 1].code;
  const senderName = currentRound ? tenGiua(currentRound.sender) : '';

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
    setAnswered(true);
    const isCorrect = userAgreed === currentRound.isValid;
    let extraNote = '';
    if (!isCorrect) {
      setMistakes(mistakes + 1);
      setHearts(hearts - 1);
      extraNote = currentRound.isValid ? T.chung.mayDongY : T.chung.mayTuChoi;
    }

    let tamperedNote = '';
    if (currentRound.kind === 'tampered' && currentRound.tamperedIndex !== undefined && currentRound.oldContent !== undefined) {
      tamperedNote = fmt(T.tb.biSuaLen, {
        nguoi: senderName,
        cu: currentRound.oldContent,
        moi: currentRound.senderPages[currentRound.tamperedIndex].content,
      });
    }

    setFeedback({
      isOpen: true,
      isCorrect,
      whatHappened: explainCheck(myLastCode, currentRound.proposal),
      whyHappened: [tamperedNote, extraNote].filter(Boolean).join(' ') || undefined,
    });
  };

  const handleContinue = () => {
    setFeedback((prev) => ({ ...prev, isOpen: false }));
    setAnswered(false);
    if (row1.current) row1.current.scrollLeft = 0;
    if (row2.current) row2.current.scrollLeft = 0;

    if (hearts <= 0) {
      onFail(T.tb.goiYThua);
      return;
    }

    if (currentRound && currentRound.isValid) {
      setMyLedger((prev) => [...prev, currentRound.proposal]);
    }

    if (roundIndex + 1 < gameData.rounds.length) {
      setRoundIndex((prev) => prev + 1);
    } else {
      onComplete({
        stars: starsFromHearts(mistakes),
        timeMs: Math.round(performance.now() - realStartTime.current),
        learned: T.tb.hocDuoc,
      });
    }
  };

  if (!currentRound) return null;

  // Dữ liệu hiển thị làm thử hoặc bài thật
  const displayMyPages = tutorialOpen ? PRACTICE_MY_PAGES : myLast3;
  const displayMyLastCode = tutorialOpen ? PRACTICE_MY_PAGES[PRACTICE_MY_PAGES.length - 1].code : myLastCode;
  const displaySender = tutorialOpen ? PRACTICE_SENDER : currentRound.sender;
  const displaySenderName = tutorialOpen ? tenGiua(PRACTICE_SENDER) : senderName;
  const displaySenderPages = tutorialOpen ? PRACTICE_SENDER_PAGES : currentRound.senderPages;
  const displayProposal = tutorialOpen ? PRACTICE_PROPOSAL : currentRound.proposal;
  const displayIsTampered = tutorialOpen ? (practiceResult !== null) : (answered && currentRound.kind === 'tampered');
  const displayTamperedIndex = tutorialOpen ? PRACTICE_TAMPERED_INDEX : currentRound.tamperedIndex;
  const displayOldContent = tutorialOpen ? PRACTICE_OLD_CONTENT : currentRound.oldContent;
  const basePageNum = tutorialOpen ? 1 : myLedger.length - myLast3.length + 1;

  // Định nghĩa các bước Hướng dẫn focus (P8c)
  const tutorialSteps: TutorialStep[] = [
    {
      id: 'intro',
      targetSelector: '[data-tutorial="my-ledger"]',
      title: tutorialTexts.man4Tb.tieuDe,
      content: tutorialTexts.man4Tb.intro,
      nextLabel: tutorialTexts.chung.tiep,
    },
    {
      id: 'compare',
      targetSelector: '[data-tutorial="compare-ledgers"]',
      title: tutorialTexts.man4Tb.tieuDe,
      content: fmt(tutorialTexts.man4Tb.compare, { nguoi: displaySenderName }),
      nextLabel: tutorialTexts.chung.daHieu,
    },
    {
      id: 'spot-error',
      targetSelector: '[data-tutorial="sender-ledger"]',
      title: tutorialTexts.man4Tb.tieuDe,
      content: fmt(tutorialTexts.man4Tb.inspectError, {
        nguoi: displaySenderName,
        n: PRACTICE_TAMPERED_INDEX + 1,
        cu: PRACTICE_OLD_CONTENT,
        moi: PRACTICE_NEW_CONTENT,
      }),
      nextLabel: tutorialTexts.chung.daHieu,
    },
    {
      id: 'calc-and-check',
      targetSelector: '[data-tutorial="calculator"]',
      title: tutorialTexts.man4Tb.tieuDe,
      content: tutorialTexts.man4Tb.calcAndCheck,
      nextLabel: tutorialTexts.chung.thuTinhNgay,
    },
    {
      id: 'decision',
      targetSelector: '[data-tutorial="decision-buttons"]',
      title: tutorialTexts.man4Tb.tieuDe,
      content: fmt(tutorialTexts.man4Tb.decision, { nguoi: displaySenderName }),
      interactive: true,
      hideNextButton: true,
    },
    {
      id: 'result',
      targetSelector: '[data-tutorial="decision-buttons"]',
      title: tutorialTexts.man4Tb.tieuDe,
      content:
        practiceResult === 'correct'
          ? tutorialTexts.man4Tb.correct
          : fmt(tutorialTexts.man4Tb.wrong, {
              nguoi: displaySenderName,
              n: PRACTICE_TAMPERED_INDEX + 1,
            }),
      interactive: practiceResult !== 'correct',
    },
  ];

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
      {/* Vòng và tim - luôn ở trên cùng trải rộng hai cột */}
      <div className="flex items-center justify-between gap-2 rounded-bang border-2 border-nau-go/50 bg-white/60 p-3">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2">
          <span className="rounded-nut bg-muc-tim/15 px-3 py-1 font-display text-base font-extrabold text-muc-tim-dam">
            {fmt(T.chung.vong, { n: roundIndex + 1, tong: gameData.rounds.length })}
          </span>
          {tutorialOpen ? (
            <span className="rounded-full bg-muc-tim/10 px-3 py-0.5 text-xs font-bold text-muc-tim-dam">
              {tutorialTexts.man4Tb.tieuDe}
            </span>
          ) : (
            <span className="hidden text-sm text-nau-go-dam sm:inline">{T.tb.phu}</span>
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

      {/* Bố cục đối chiếu 2 cột trên màn hình rộng: trái là sổ của em, phải là sổ đề xuất + hướng dẫn + máy tính + nút */}
      <div data-tutorial="compare-ledgers" className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
        {/* Cột trái: Sổ của em (dữ liệu đối chiếu: 3 trang cuối + ô trang mới) */}
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
              <span aria-hidden="true">📖</span> {T.tb.soCuaEm3}
            </h2>
            <div className="inline-flex items-center gap-1.5 rounded-nut border-2 border-muc-tim/40 bg-muc-tim/10 px-3 py-1 text-sm font-bold text-muc-tim-dam">
              <span>{T.kho.maCuoi}</span>
              <span className="font-display text-base font-extrabold underline">{formatNumber(displayMyLastCode)}</span>
            </div>
          </div>
          <div ref={row1} onScroll={() => syncScroll(row1.current, row2.current)} className="w-full overflow-x-auto py-3">
            <div className="flex w-max items-center gap-3 sm:gap-4">
              {displayMyPages.map((page, idx) => (
                <div key={idx} className="relative flex items-center justify-center">
                  {idx > 0 && (
                    <div className={CHAIN_SLOT}>
                      <MatXich size="sm" status={answered || (tutorialOpen && practiceResult !== null) ? 'valid' : 'neutral'} />
                    </div>
                  )}
                  <TrangSo
                    size="xs"
                    pageNumber={basePageNum + idx}
                    prevCode={page.prevCode}
                    content={page.content}
                    pageCode={page.code}
                    isConfirmed={answered || (tutorialOpen && practiceResult !== null)}
                  />
                </div>
              ))}
              <div className="relative flex items-center justify-center">
                <div className="flex min-h-[245px] w-[148px] select-none flex-col items-center justify-center rounded-2xl border-2 border-dashed border-nau-go bg-giay/60 p-3 text-center sm:w-[176px]">
                  <div className="mb-2 grid size-9 place-items-center rounded-full border-2 border-dashed border-nau-go text-base font-bold text-nau-go-dam" aria-hidden="true">
                    +
                  </div>
                  <span className="text-sm font-semibold italic leading-tight text-nau-go-dam">{T.tb.trangMoiSeODay}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Cột phải: Sổ của người gửi (sổ đề xuất) + Hướng dẫn + Máy tính + Nút biểu quyết */}
        <div className="flex flex-col gap-4">
          {/* Hàng sổ của người gửi */}
          <div
            data-tutorial="sender-ledger"
            className={`rounded-bang border-2 border-muc-tim/40 bg-white/70 p-3 sm:p-4 transition-all ${
              tutorialOpen && tutorialStep === 2
                ? 'ring-4 ring-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.8)]'
                : ''
            }`}
          >
            <div className="mb-2 flex items-center justify-between gap-2 border-b-2 border-nau-go/30 pb-2">
              <div className="flex min-w-0 items-center gap-2">
                <Chan id={displaySender} size={40} />
                <h2 className="text-lg font-bold">{fmt(T.tb.soCua, { nguoi: displaySenderName })}</h2>
              </div>
              {(answered || (tutorialOpen && practiceResult !== null)) && (
                <span
                  className={`whitespace-nowrap rounded-nut px-2 py-0.5 text-sm font-bold ${
                    (tutorialOpen ? false : currentRound.isValid) ? 'bg-xanh-la/15 text-xanh-la-dam' : 'bg-do-son/15 text-do-son-dam'
                  }`}
                >
                  {(tutorialOpen ? false : currentRound.isValid) ? T.chung.hopLe : T.chung.khongHopLe}
                </span>
              )}
            </div>
            <div ref={row2} onScroll={() => syncScroll(row2.current, row1.current)} className="w-full overflow-x-auto py-3">
              <div className="flex w-max items-center gap-3 sm:gap-4">
                {displaySenderPages.map((page, idx) => {
                  const isTampered = (tutorialOpen ? practiceResult !== null : answered) && displayIsTampered && displayTamperedIndex === idx;
                  const isRecalc = (tutorialOpen ? practiceResult !== null : answered) && displayIsTampered && Boolean(currentRound.recalcIndices?.includes(idx) || (tutorialOpen && idx > PRACTICE_TAMPERED_INDEX));
                  return (
                    <div key={idx} className="relative flex items-center justify-center">
                      {idx > 0 && (
                        <div className={CHAIN_SLOT}>
                          <MatXich size="sm" status={(answered || (tutorialOpen && practiceResult !== null)) ? (isTampered || isRecalc ? 'broken' : 'valid') : 'neutral'} />
                        </div>
                      )}
                      <TrangSo
                        size="xs"
                        pageNumber={basePageNum + idx}
                        prevCode={page.prevCode}
                        content={page.content}
                        pageCode={page.code}
                        isConfirmed={(answered || (tutorialOpen && practiceResult !== null)) && !isTampered && !isRecalc}
                        isInvalid={isTampered || isRecalc}
                        struckContent={isTampered ? displayOldContent : undefined}
                        invalidBadgeText={isTampered ? T.tb.nhanSuaLen : isRecalc ? T.tb.nhanMaLech : undefined}
                      />
                    </div>
                  );
                })}

                {/* Trang mới được đề xuất */}
                <div className="relative flex items-center justify-center">
                  <div className={CHAIN_SLOT}>
                    <MatXich size="sm" status={(answered || (tutorialOpen && practiceResult !== null)) ? ((tutorialOpen ? false : currentRound.isValid) ? 'valid' : 'broken') : 'neutral'} />
                  </div>
                  <div className="relative flex justify-center">
                    <div
                      className={`absolute -top-2.5 z-30 whitespace-nowrap rounded-nut px-2.5 py-0.5 text-xs font-extrabold text-white ${
                        (answered || (tutorialOpen && practiceResult !== null)) ? ((tutorialOpen ? false : currentRound.isValid) ? 'bg-xanh-la-dam' : 'bg-do-son-dam') : 'bg-muc-tim'
                      }`}
                    >
                      {T.chung.trangMoi}
                    </div>
                    <div
                      className={`rounded-2xl ring-2 ${(answered || (tutorialOpen && practiceResult !== null)) ? ((tutorialOpen ? false : currentRound.isValid) ? 'ring-xanh-la-dam' : 'ring-do-son-dam') : 'ring-muc-tim'}`}
                    >
                      <TrangSo
                        size="xs"
                        pageNumber={(tutorialOpen ? PRACTICE_MY_PAGES.length : myLedger.length) + 1}
                        prevCode={displayProposal.prevCode}
                        content={displayProposal.content}
                        pageCode={displayProposal.code}
                        isConfirmed={(answered || (tutorialOpen && practiceResult !== null)) && (tutorialOpen ? false : currentRound.isValid)}
                        isInvalid={(answered || (tutorialOpen && practiceResult !== null)) && !(tutorialOpen ? false : currentRound.isValid)}
                        invalidBadgeText={
                          (answered || (tutorialOpen && practiceResult !== null))
                            ? (tutorialOpen
                                ? T.tb.nhanNoiSaiSo
                                : currentRound.kind === 'wrong-code'
                                  ? T.tb.nhanMaSai
                                  : currentRound.kind === 'tampered'
                                    ? T.tb.nhanNoiSaiSo
                                    : undefined)
                            : undefined
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Hướng dẫn & Máy tính & Nút biểu quyết */}
          <div className="rounded-bang border-2 border-nau-go/50 bg-white/60 p-4 space-y-4">
            <p className="text-base font-semibold leading-relaxed">
              <strong>{T.tb.emHayKiemTra}</strong> {fmt(T.tb.cauHoiKiemTra, { nguoi: displaySenderName })}
            </p>

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
            ? tutorialTexts.man4Tb.correct
            : practiceResult === 'wrong'
              ? fmt(tutorialTexts.man4Tb.wrong, {
                  nguoi: displaySenderName,
                  n: PRACTICE_TAMPERED_INDEX + 1,
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
