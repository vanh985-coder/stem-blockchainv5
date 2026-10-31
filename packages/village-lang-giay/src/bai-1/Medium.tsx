import { useCallback, useEffect, useId, useRef, useState } from 'react';
import {
  Button,
  ChainStrip,
  FeedbackSheet,
  NumberInput,
  PortraitFrame,
  ReflectionQuestion,
  TutorialSpotlight,
  characterNames,
  fmt,
  sound,
  starsFromMistakes,
  tutorialTexts,
  useSettings,
  type ChainPageData,
  type StationResult,
  type TutorialStep,
} from '@so-chung/core';
import { bai1Texts } from '@so-chung/core/content/lessons/bai-1';
import { GAME_CONFIG } from '@so-chung/core/config/gameConfig';
import {
  buildChain,
  firstInvalidIndex,
  pageCode,
  pickSafeContent,
  randomContents,
  randomGenesis,
  type Lesson1Data,
} from '@so-chung/core/lessons/bai-1/logic';
import { createMulberry32 } from '@so-chung/core/lib/rng';

const T = bai1Texts;

// Dữ liệu làm thử cố định cho trạm Trung bình (P8b)
const PRACTICE_GENESIS = 12;
const PRACTICE_TAMPER_PAGE = 2; // Trang 2 (index 1)
const PRACTICE_OLD_CONTENT = 8;
const PRACTICE_NEW_CONTENT = 9;
const PRACTICE_OLD_CODE = 66; // 29 * 2 + 8 = 66
const PRACTICE_PREV_CODE = 29; // Trang 1 có mã 29
const PRACTICE_EXPECTED_CODE = 67; // 29 * 2 + 9 = 67

interface Feedback {
  isOpen: boolean;
  whatHappened: string;
  whyHappened?: string;
  howToFix?: string;
}

const toLogic = (pages: ChainPageData[]) => pages.map((p) => ({ content: p.content ?? 0, code: p.code ?? -1 }));

/** Trạm Trung bình: "{phanDien} sửa trộm sổ". Dùng chuỗi em vừa xây ở trạm Dễ (không có thì tạo ngẫu nhiên). */
export function Medium({ onComplete, saved }: { onComplete: (r: StationResult) => void; saved: Lesson1Data | null }) {
  const { settings } = useSettings();
  const reducedMotion = settings.reducedMotion;
  const rng = useRef(createMulberry32(Date.now())).current;
  const realStartTime = useRef<number>(performance.now());

  const isValidSaved = Boolean(
    saved &&
      saved.contents.length === 5 &&
      saved.codes.length === 5 &&
      saved.contents.every((c) => c >= 0 && c <= 99) &&
      saved.codes.every((c) => c >= 0 && c <= 99) &&
      firstInvalidIndex(saved.genesisCode, saved.contents.map((c, i) => ({ content: c, code: saved.codes[i] }))) === -1,
  );
  const isFromSaved = useRef(isValidSaved).current;
  const genesisCode = useRef(isValidSaved ? (saved as Lesson1Data).genesisCode : randomGenesis(rng)).current;
  const initialContents = useRef(isValidSaved ? [...(saved as Lesson1Data).contents] : randomContents(5, rng)).current;
  const initialCodes = useRef(isValidSaved ? [...(saved as Lesson1Data).codes] : buildChain(genesisCode, initialContents)).current;

  // Trang k (trang 2 hoặc trang 3) bị sửa trộm, độ chênh an toàn
  const tamperIndex = useRef(rng() < 0.5 ? 1 : 2).current;
  const originalOld = initialContents[tamperIndex];
  const tamperedNew = useRef(pickSafeContent(originalOld, rng)).current;

  // Quản lý trạng thái Hướng dẫn focus và Làm thử (P8b)
  const [tutorialOpen, setTutorialOpen] = useState(true);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [practiceVal, setPracticeVal] = useState<number | null>(null);
  const [practiceError, setPracticeError] = useState<string | undefined>();
  const [practiceErrorPrompt, setPracticeErrorPrompt] = useState<string | undefined>();
  const [practiceConfirmed, setPracticeConfirmed] = useState(false);
  const [practiceResult, setPracticeResult] = useState<'correct' | 'wrong' | null>(null);

  const practiceCodeRef = useRef<HTMLInputElement>(null);
  const practiceCodeId = useId();

  const [isTampering, setIsTampering] = useState(!reducedMotion);
  const [pages, setPages] = useState<ChainPageData[]>(() => initialContents.map((c, i) => ({ content: c, code: initialCodes[i] })));
  const [fixedCount, setFixedCount] = useState(0);
  const [showFirstDomino, setShowFirstDomino] = useState(false);
  const [codeInput, setCodeInput] = useState<number | null>(null);
  const [codeError, setCodeError] = useState<string | undefined>();
  const [mistakes, setMistakes] = useState(0);
  const [feedback, setFeedback] = useState<Feedback>({ isOpen: false, whatHappened: '' });
  const [showReflection, setShowReflection] = useState(false);

  const codeInputRef = useRef<HTMLInputElement>(null);
  const codeId = useId();

  // Kết thúc hoặc bỏ qua hướng dẫn: khởi động bài thật sạch sẽ
  const finishTutorial = useCallback(() => {
    setTutorialOpen(false);
    setTutorialStep(0);
    setPracticeVal(null);
    setPracticeConfirmed(false);
    setPracticeResult(null);
    setPracticeError(undefined);
    setPracticeErrorPrompt(undefined);
    // Bấm giờ bài thật từ khoảnh khắc này
    realStartTime.current = performance.now();
    setTimeout(() => {
      codeInputRef.current?.focus();
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
    setPracticeErrorPrompt(undefined);
  }, []);

  // Thử lại khi làm thử sai: giữ nguyên số đã nhập để học sinh sửa, không xóa trắng
  const retryPractice = useCallback(() => {
    setPracticeResult(null);
    setPracticeError(undefined);
    setPracticeErrorPrompt(undefined);
    setTutorialStep(3); // Quay lại bước ô nhập
    setTimeout(() => {
      practiceCodeRef.current?.focus();
      practiceCodeRef.current?.select();
    }, 50);
  }, []);

  // Kiểm tra kết quả làm thử
  const handlePracticeCheck = useCallback(() => {
    if (practiceVal === null || practiceVal < 0 || practiceVal > 99) {
      setPracticeError(tutorialTexts.man1Tb.chuaNhap);
      setPracticeErrorPrompt(tutorialTexts.man1Tb.chuaNhap);
      sound.playClick();
      setTutorialStep(3);
      setTimeout(() => {
        practiceCodeRef.current?.focus();
      }, 50);
      return;
    }
    setPracticeError(undefined);
    setPracticeErrorPrompt(undefined);

    if (practiceVal === PRACTICE_EXPECTED_CODE) {
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

  // Hoạt cảnh {phanDien} lẻn vào sửa; "Giảm chuyển động" thì sửa ngay.
  useEffect(() => {
    const apply = () => {
      setPages((prev) => {
        const next = [...prev];
        next[tamperIndex] = { content: tamperedNew, code: initialCodes[tamperIndex], struckContent: originalOld };
        return next;
      });
      setIsTampering(false);
    };
    if (reducedMotion) {
      apply();
      return;
    }
    const timer = setTimeout(() => {
      sound.playWrong();
      apply();
    }, GAME_CONFIG.lesson1.tamperAnimMs);
    return () => clearTimeout(timer);
  }, [reducedMotion, tamperIndex, tamperedNew, originalOld, initialCodes]);

  const currentFirstInvalid = firstInvalidIndex(genesisCode, toLogic(pages));

  useEffect(() => {
    if (!tutorialOpen && !isTampering && currentFirstInvalid !== -1) codeInputRef.current?.focus();
  }, [tutorialOpen, isTampering, currentFirstInvalid]);

  const check = useCallback(() => {
    if (currentFirstInvalid === -1) return;
    if (codeInput === null || codeInput < 0 || codeInput > 99) {
      setCodeError(T.de.maSaiKhoang);
      sound.playClick();
      return;
    }
    setCodeError(undefined);

    const prevCode = currentFirstInvalid === 0 ? genesisCode : (pages[currentFirstInvalid - 1].code as number);
    const content = pages[currentFirstInvalid].content as number;

    if (codeInput === pageCode(prevCode, content)) {
      sound.playCorrect();
      const updated = [...pages];
      updated[currentFirstInvalid] = { ...updated[currentFirstInvalid], code: codeInput };
      setPages(updated);
      setCodeInput(null);

      const newFixed = fixedCount + 1;
      setFixedCount(newFixed);
      const nextInvalid = firstInvalidIndex(genesisCode, toLogic(updated));
      // Lần domino đầu tiên: sửa xong trang k thì trang k+1 lệch
      setShowFirstDomino(newFixed === 1 && nextInvalid !== -1);
      if (nextInvalid === -1) setShowReflection(true);
    } else {
      sound.playWrong();
      setMistakes((m) => m + 1);
      const vars = { ma: codeInput, truoc: prevCode, nd: content, gapDoi: prevCode * 2 };
      setFeedback({
        isOpen: true,
        whatHappened: fmt(T.tb.sai1Chuyen, vars),
        whyHappened: fmt(T.tb.sai1ViSao, vars),
        howToFix: fmt(T.tb.sai1CachSua, vars),
      });
    }
  }, [currentFirstInvalid, codeInput, genesisCode, pages, fixedCount]);

  const finish = () => {
    sound.playClick();
    onComplete({
      stars: starsFromMistakes(mistakes),
      timeMs: Math.round(performance.now() - realStartTime.current),
      learned: T.tb.hocDuoc,
    });
  };

  const prevForInvalid = currentFirstInvalid <= 0 ? genesisCode : (pages[currentFirstInvalid - 1].code ?? 0);
  const contentForInvalid = currentFirstInvalid !== -1 ? pages[currentFirstInvalid].content : 0;

  // Dữ liệu chuỗi hiển thị: làm thử hoặc bài thật
  const displayPracticePages: ChainPageData[] = [
    { content: 5, code: 29 },
    {
      content: PRACTICE_NEW_CONTENT,
      code: practiceConfirmed ? PRACTICE_EXPECTED_CODE : PRACTICE_OLD_CODE,
      struckContent: PRACTICE_OLD_CONTENT,
    },
    { content: 4, code: 36 },
    { content: 7, code: 79 },
    { content: 3, code: 61 },
  ];

  const displayGenesis = tutorialOpen ? PRACTICE_GENESIS : genesisCode;
  const displayPages = tutorialOpen ? displayPracticePages : pages;
  const displayFirstInvalid = tutorialOpen ? (practiceConfirmed ? -1 : 1) : currentFirstInvalid;
  const displayActiveIndex = tutorialOpen ? 1 : currentFirstInvalid !== -1 ? currentFirstInvalid : 0;

  const formulaTruoc = tutorialOpen ? PRACTICE_PREV_CODE : prevForInvalid;
  const formulaNd = tutorialOpen ? PRACTICE_NEW_CONTENT : (contentForInvalid ?? 0);

  // Định nghĩa các bước Hướng dẫn focus và Làm thử (P8b)
  const tutorialSteps: TutorialStep[] = [
    {
      id: 'intro',
      targetSelector: '[data-tutorial="chain-strip"]',
      title: tutorialTexts.man1Tb.tieuDe,
      content: fmt(tutorialTexts.man1Tb.intro, characterNames()),
      nextLabel: tutorialTexts.chung.tiep,
    },
    {
      id: 'inspect',
      targetSelector: '[data-tutorial="chain-strip"]',
      title: tutorialTexts.man1Tb.tieuDe,
      content: fmt(tutorialTexts.man1Tb.inspect, {
        n: PRACTICE_TAMPER_PAGE,
        cu: PRACTICE_OLD_CONTENT,
        moi: PRACTICE_NEW_CONTENT,
        maCu: PRACTICE_OLD_CODE,
      }),
      nextLabel: tutorialTexts.chung.daHieu,
    },
    {
      id: 'formula',
      targetSelector: '[data-tutorial="formula-box"]',
      title: tutorialTexts.man1Tb.tieuDe,
      content: fmt(tutorialTexts.man1Tb.formula, {
        truoc: PRACTICE_PREV_CODE,
        nd: PRACTICE_NEW_CONTENT,
        tong: PRACTICE_EXPECTED_CODE,
      }),
      nextLabel: tutorialTexts.chung.thuTinhNgay,
    },
    {
      id: 'input',
      targetSelector: '[data-tutorial="practice-area"]',
      title: tutorialTexts.man1Tb.tieuDe,
      content: tutorialTexts.man1Tb.input,
      interactive: true,
      nextLabel: tutorialTexts.chung.tiep,
    },
    {
      id: 'check',
      targetSelector: '[data-tutorial="practice-area"]',
      title: tutorialTexts.man1Tb.tieuDe,
      content: tutorialTexts.man1Tb.check,
      interactive: true,
      hideNextButton: true,
    },
    {
      id: 'result',
      targetSelector: '[data-tutorial="practice-area"]',
      title: tutorialTexts.man1Tb.tieuDe,
      content:
        practiceResult === 'correct'
          ? fmt(tutorialTexts.man1Tb.correct, { ma: PRACTICE_EXPECTED_CODE, n: PRACTICE_TAMPER_PAGE })
          : fmt(tutorialTexts.man1Tb.wrong, {
              truoc: PRACTICE_PREV_CODE,
              nd: PRACTICE_NEW_CONTENT,
              tong: PRACTICE_EXPECTED_CODE,
              ma: PRACTICE_EXPECTED_CODE,
            }),
      interactive: practiceResult !== 'correct',
    },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      {/* Tiêu đề trạm và nút Xem lại hướng dẫn */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-nau-go/20 pb-2">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold">{fmt(T.tb.tieuDe)}</h2>
          {tutorialOpen ? (
            <p className="text-base font-semibold text-muc-tim-dam">{tutorialTexts.man1Tb.tieuDe}</p>
          ) : isFromSaved ? (
            <p className="inline-block rounded-full border-2 border-xanh-la-dam bg-xanh-la/15 px-3 py-1 text-sm font-semibold">
              <span aria-hidden="true">✨ </span>
              {T.tb.tuChuoiCu}
            </p>
          ) : null}
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

      {tutorialOpen ? (
        <div className="flex items-center gap-3 rounded-bang border-2 border-do-son bg-do-son/10 p-4">
          <PortraitFrame portrait="ti" size={72} />
          <div className="text-base">
            <span className="block font-bold text-do-son-dam">
              <span aria-hidden="true">✗ </span>
              {fmt(T.tb.daBiDoi, { n: PRACTICE_TAMPER_PAGE })}
            </span>
            <span className="text-sm font-semibold text-muc-tim-dam">
              {tutorialTexts.man1Tb.tieuDe}
            </span>
          </div>
        </div>
      ) : isTampering ? (
        <div className="animate-pulse space-y-3 rounded-bang border-2 border-do-son bg-do-son/10 p-6 text-center" role="status">
          <div className="flex justify-center">
            <PortraitFrame portrait="ti" size={96} />
          </div>
          <h3 className="text-lg text-do-son-dam">{fmt(T.tb.dangSua)}</h3>
          <p className="text-base">{fmt(T.tb.dangSuaChiTiet, { n: tamperIndex + 1 })}</p>
        </div>
      ) : (
        <div className="flex items-center gap-3 rounded-bang border-2 border-do-son bg-do-son/10 p-4">
          <PortraitFrame portrait="ti" size={72} />
          <div className="text-base">
            <span className="block font-bold text-do-son-dam">
              <span aria-hidden="true">✗ </span>
              {fmt(T.tb.daBiDoi, { n: tamperIndex + 1 })}
            </span>
            <span>
              {T.tb.soTrangDaSua} <strong className="text-lg text-muc-tim-dam">{fixedCount}</strong>
            </span>
          </div>
        </div>
      )}

      {/* Vùng làm thử bao trùm dải trang sổ và khung công thức + nút Kiểm tra (P8b) */}
      <div data-tutorial="practice-area" className="space-y-4">
        <div className="overflow-hidden rounded-bang border-2 border-nau-go/50 bg-white/50" data-tutorial="chain-strip">
          <ChainStrip
            genesisCode={displayGenesis}
            pages={displayPages}
            firstInvalidIndex={displayFirstInvalid}
            activePageIndex={displayActiveIndex}
            isPageConfirmed={(idx) =>
              tutorialOpen
                ? practiceConfirmed
                  ? idx <= 1
                  : idx === 0
                : currentFirstInvalid === -1
                  ? true
                  : idx < currentFirstInvalid
            }
            isPageWillRecalc={(idx) =>
              tutorialOpen
                ? !practiceConfirmed && idx > 1
                : currentFirstInvalid === -1
                  ? false
                  : idx > currentFirstInvalid
            }
            renderCodeSlot={(idx) => {
              if (tutorialOpen) {
                if (idx !== 1) return undefined;
                return (
                  <div
                    className={`flex w-full flex-col items-center transition-all ${
                      tutorialStep === 3
                        ? 'ring-4 ring-yellow-400 rounded-xl shadow-[0_0_15px_rgba(250,204,21,0.8)]'
                        : ''
                    }`}
                    data-tutorial="code-input"
                  >
                    <NumberInput
                      className="w-full"
                      id={practiceCodeId}
                      ref={practiceCodeRef}
                      autoFocus={tutorialStep >= 3}
                      value={practiceVal}
                      showButtons={false}
                      placeholder={tutorialTexts.man1Tb.inputPlaceholder}
                      ariaLabel={fmt(T.de.nhanMaTrang, { n: PRACTICE_TAMPER_PAGE })}
                      inputClassName="!h-10 !w-full !text-lg"
                      onChange={(v) => {
                        setPracticeVal(v);
                        setPracticeError(undefined);
                        setPracticeErrorPrompt(undefined);
                      }}
                      onEnter={handlePracticeCheck}
                      error={practiceError}
                    />
                  </div>
                );
              }

              if (idx !== currentFirstInvalid || isTampering) return undefined;
              return (
                <div className="flex w-full flex-col items-center" data-tutorial="code-input">
                  <NumberInput
                    className="w-full"
                    id={codeId}
                    ref={codeInputRef}
                    value={codeInput}
                    showButtons={false}
                    placeholder={T.chung.khoangSo}
                    ariaLabel={fmt(T.de.nhanMaTrang, { n: idx + 1 })}
                    inputClassName="!h-10 !w-full !text-lg"
                    onChange={(v) => {
                      setCodeInput(v);
                      setCodeError(undefined);
                    }}
                    onEnter={check}
                    error={codeError}
                    autoFocus
                  />
                </div>
              );
            }}
          />
        </div>

        {showFirstDomino && !tutorialOpen && currentFirstInvalid !== -1 && (
          <div className="flex items-center gap-3 rounded-bang border-2 border-muc-tim bg-muc-tim/10 p-4" role="status">
            <PortraitFrame portrait="bi" size={72} />
            <p className="text-base font-semibold">{fmt(T.tb.domino, { n: currentFirstInvalid + 1, truoc: currentFirstInvalid })}</p>
          </div>
        )}

        {/* Khung gợi ý công thức và nút Kiểm tra/Cập nhật mã */}
        {(tutorialOpen || (!isTampering && currentFirstInvalid !== -1)) && (
          <div className="flex flex-col items-center justify-between gap-4 rounded-bang border-2 border-nau-go/50 bg-white/60 p-4 sm:flex-row">
            <div className="flex items-center gap-3" data-tutorial="formula-box">
              <PortraitFrame portrait="bi" size={72} />
              <div className="rounded-2xl border-2 border-nau-go/50 bg-giay p-3">
                <span className="mb-0.5 block text-sm font-semibold text-nau-go-dam">
                  <span aria-hidden="true">💡 </span>
                  {fmt(T.tb.tinhLai, { n: tutorialOpen ? PRACTICE_TAMPER_PAGE : currentFirstInvalid + 1 })}
                </span>
                <span className="font-display text-lg font-extrabold text-muc-tim-dam">
                  {fmt(T.chung.congThucThe, { truoc: formulaTruoc, nd: formulaNd })}
                </span>
              </div>
            </div>

            <div
              data-tutorial="check-button"
              className={`transition-all rounded-nut ${
                tutorialOpen && tutorialStep === 4
                  ? 'ring-4 ring-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.8)]'
                  : ''
              }`}
            >
              <Button onClick={tutorialOpen ? handlePracticeCheck : check}>
                {T.chung.capNhatMa}
              </Button>
            </div>
          </div>
        )}
      </div>

      {showReflection && !tutorialOpen && (
        <div className="space-y-4">
          <ReflectionQuestion question={T.tb.cauHoi} options={T.tb.luaChon} explanation={T.tb.giaiThich} />
          <div className="flex justify-center pt-2">
            <Button size="lg" onClick={finish}>
              {T.tb.xongTram}
            </Button>
          </div>
        </div>
      )}

      {/* Lớp phủ Spotlight & Tooltip của Tutorial (P8b) */}
      <TutorialSpotlight
        isOpen={tutorialOpen}
        steps={tutorialSteps}
        currentStepIndex={tutorialStep}
        onNext={() => {
          setPracticeErrorPrompt(undefined);
          setTutorialStep((s) => Math.min(tutorialSteps.length - 1, s + 1));
        }}
        onPrev={() => {
          setPracticeErrorPrompt(undefined);
          setTutorialStep((s) => Math.max(0, s - 1));
        }}
        onSkip={finishTutorial}
        feedbackMessage={
          practiceErrorPrompt
            ? practiceErrorPrompt
            : practiceResult === 'correct'
              ? fmt(tutorialTexts.man1Tb.correct, { ma: PRACTICE_EXPECTED_CODE, n: PRACTICE_TAMPER_PAGE })
              : practiceResult === 'wrong'
                ? fmt(tutorialTexts.man1Tb.wrong, {
                    truoc: PRACTICE_PREV_CODE,
                    nd: PRACTICE_NEW_CONTENT,
                    tong: PRACTICE_EXPECTED_CODE,
                    ma: PRACTICE_EXPECTED_CODE,
                  })
                : undefined
        }
        feedbackType={
          practiceErrorPrompt
            ? 'error'
            : practiceResult === 'correct'
              ? 'success'
              : practiceResult === 'wrong'
                ? 'error'
                : 'info'
        }
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

      <FeedbackSheet
        isOpen={feedback.isOpen}
        isCorrect={false}
        whatHappened={feedback.whatHappened}
        whyHappened={feedback.whyHappened}
        howToFix={feedback.howToFix}
        onContinue={() => {
          setFeedback((f) => ({ ...f, isOpen: false }));
          codeInputRef.current?.focus();
        }}
        continueLabel={T.chung.thuLai}
      />
    </div>
  );
}
