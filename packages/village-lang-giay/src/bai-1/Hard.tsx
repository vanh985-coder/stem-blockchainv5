import { useCallback, useEffect, useId, useRef, useState } from 'react';
import {
  Button,
  ChainStrip,
  NumberInput,
  PortraitFrame,
  ReflectionQuestion,
  Toast,
  TutorialSpotlight,
  fmt,
  sound,
  tutorialTexts,
  type ChainPageData,
  type StationResult,
  type TutorialStep,
} from '@so-chung/core';
import { bai1Texts } from '@so-chung/core/content/lessons/bai-1';
import { GAME_CONFIG } from '@so-chung/core/config/gameConfig';
import {
  buildChain,
  firstInvalidIndex,
  hardStars,
  pageCode,
  pagesToFix,
  pickSafeContent,
  randomContents,
  randomGenesis,
  spawnDelayMs,
} from '@so-chung/core/lessons/bai-1/logic';
import { createMulberry32 } from '@so-chung/core/lib/rng';

const T = bai1Texts;
const C = GAME_CONFIG.lesson1;

// Dữ liệu làm thử cố định cho trạm Khó (P8b)
const PRACTICE_GENESIS = 10;
const PRACTICE_TAMPER_PAGE = 2; // Trang 2 (index 1)
const PRACTICE_OLD_CONTENT = 7;
const PRACTICE_PREV_CODE = 24; // Trang 1 có mã 24
const PRACTICE_WRONG_CODE = 50; // Mã sai đang có trong sổ
const PRACTICE_EXPECTED_CODE = 55; // 24 * 2 + 7 = 55
const PRACTICE_START_PAGES = 6;
const PRACTICE_PAGES_TO_FIX = 5;

const toLogic = (pages: ChainPageData[]) => pages.map((p) => ({ content: p.content ?? 0, code: p.code ?? -1 }));

/** Đồng hồ đếm ngược: cập nhật bằng state riêng, hỗ trợ dừng và tiếp tục mượt mà. */
function CountdownTimer({
  durationMs,
  onTimeUp,
  isPaused,
  resetTrigger,
}: {
  durationMs: number;
  onTimeUp: () => void;
  isPaused: boolean;
  resetTrigger?: number;
}) {
  const [secondsLeft, setSecondsLeft] = useState(Math.ceil(durationMs / 1000));
  const remainingMsRef = useRef(durationMs);
  const lastTickRef = useRef<number | null>(null);
  const firedRef = useRef(false);

  // Đặt lại đồng hồ khi kết thúc tutorial chuyển sang bài thật
  useEffect(() => {
    remainingMsRef.current = durationMs;
    setSecondsLeft(Math.ceil(durationMs / 1000));
    firedRef.current = false;
    lastTickRef.current = null;
  }, [resetTrigger, durationMs]);

  useEffect(() => {
    if (isPaused) {
      lastTickRef.current = null;
      return;
    }

    lastTickRef.current = performance.now();
    const interval = setInterval(() => {
      const now = performance.now();
      const delta = lastTickRef.current ? now - lastTickRef.current : 0;
      lastTickRef.current = now;

      remainingMsRef.current = Math.max(0, remainingMsRef.current - delta);
      const secs = Math.ceil(remainingMsRef.current / 1000);
      setSecondsLeft(secs);

      if (remainingMsRef.current <= 0 && !firedRef.current) {
        firedRef.current = true;
        clearInterval(interval);
        onTimeUp();
      }
    }, 250);

    return () => clearInterval(interval);
  }, [isPaused, onTimeUp]);

  const low = secondsLeft <= 10;
  return (
    <div
      role="timer"
      aria-label={fmt(T.kho.thoiGianConLai, { s: secondsLeft })}
      className={`flex items-center gap-2 rounded-nut border-2 px-3.5 py-1.5 font-display text-xl font-extrabold ${
        low ? 'animate-pulse border-do-son bg-do-son/10 text-do-son-dam' : 'border-nau-go bg-giay text-muc-tim-dam'
      }`}
    >
      <span aria-hidden="true">⏱️</span>
      <span>{fmt(T.kho.giay, { s: secondsLeft })}</span>
    </div>
  );
}

/** Trạm Khó: "Cuộc đua với cả mạng lưới". Mạng thêm trang mới đều đặn, em sửa cho kịp; hết 60 giây thì tổng kết. */
export function Hard({ onComplete }: { onComplete: (r: StationResult) => void }) {
  const rng = useRef(createMulberry32(Date.now())).current;

  // Chuỗi gốc 6 trang của mạng lưới
  const genesisCode = useRef(randomGenesis(rng)).current;
  const initialContents = useRef(randomContents(C.hardStartPages, rng)).current;
  const initialCodes = useRef(buildChain(genesisCode, initialContents)).current;
  const origChain = useRef({ contents: [...initialContents], codes: [...initialCodes] });
  const networkAdded = useRef(0);

  // Sổ của em: trang 2 bị sửa trộm
  const tamperedContent = useRef(pickSafeContent(initialContents[C.hardTamperIndex], rng)).current;
  const [pages, setPages] = useState<ChainPageData[]>(() =>
    initialContents.map((c, i) => ({ content: i === C.hardTamperIndex ? tamperedContent : c, code: initialCodes[i] })),
  );
  const [fixedCount, setFixedCount] = useState(0);
  const [isTimeUp, setIsTimeUp] = useState(false);
  const isFast = useRef(false);
  const [showFastToast, setShowFastToast] = useState(false);
  const [badgeScale, setBadgeScale] = useState(false);
  const [codeInput, setCodeInput] = useState<number | null>(null);
  const [shaking, setShaking] = useState(false);

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
  const [gameResetTrigger, setGameResetTrigger] = useState(0);

  const codeInputRef = useRef<HTMLInputElement>(null);
  const spawnTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const spawnIndex = useRef(0);
  const timeUpRef = useRef(false);
  const codeId = useId();

  const currentFirstInvalid = firstInvalidIndex(genesisCode, toLogic(pages));
  const remaining = pagesToFix(currentFirstInvalid, pages.length);

  // Kết thúc hoặc bỏ qua hướng dẫn: khởi động bài thật sạch sẽ
  const finishTutorial = useCallback(() => {
    setTutorialOpen(false);
    setTutorialStep(0);
    setPracticeVal(null);
    setPracticeConfirmed(false);
    setPracticeResult(null);
    setPracticeError(undefined);
    setPracticeErrorPrompt(undefined);
    setGameResetTrigger((c) => c + 1);
    setTimeout(() => {
      codeInputRef.current?.focus();
    }, 50);
  }, []);

  // Mở lại hướng dẫn giữa bài (bảo lưu nguyên vẹn trạng thái bài thật, tạm dừng đồng hồ và mạng)
  const openTutorialReview = useCallback(() => {
    setTutorialOpen(true);
    setTutorialStep(0);
    setPracticeVal(null);
    setPracticeConfirmed(false);
    setPracticeResult(null);
    setPracticeError(undefined);
    setPracticeErrorPrompt(undefined);
    if (spawnTimeout.current) clearTimeout(spawnTimeout.current);
  }, []);

  // Thử lại khi làm thử sai: giữ nguyên số đã nhập để học sinh sửa
  const retryPractice = useCallback(() => {
    setPracticeResult(null);
    setPracticeError(undefined);
    setPracticeErrorPrompt(undefined);
    setTutorialStep(3);
    setTimeout(() => {
      practiceCodeRef.current?.focus();
      practiceCodeRef.current?.select();
    }, 50);
  }, []);

  // Kiểm tra kết quả làm thử
  const handlePracticeCheck = useCallback(() => {
    if (practiceVal === null || practiceVal < 0 || practiceVal > 99) {
      setPracticeError(tutorialTexts.man1Kho.chuaNhap);
      setPracticeErrorPrompt(tutorialTexts.man1Kho.chuaNhap);
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
      __hardTimer: {
        isPaused: isTimeUp || tutorialOpen,
      },
    });
  }

  useEffect(() => {
    if (!tutorialOpen && !isTimeUp && currentFirstInvalid !== -1) codeInputRef.current?.focus();
  }, [tutorialOpen, isTimeUp, currentFirstInvalid]);

  // Mạng thêm trang bằng chuỗi setTimeout (không dùng setInterval), dọn sạch khi rời màn hoặc khi mở hướng dẫn.
  const scheduleNextSpawn = useCallback(() => {
    if (timeUpRef.current || tutorialOpen) return;
    const delay = spawnDelayMs(spawnIndex.current, isFast.current);
    spawnIndex.current += 1;
    spawnTimeout.current = setTimeout(() => {
      if (timeUpRef.current || tutorialOpen) return;
      const newContent = Math.floor(rng() * 100);
      const prev = origChain.current.codes[origChain.current.codes.length - 1];
      const newCode = pageCode(prev, newContent);
      origChain.current.contents.push(newContent);
      origChain.current.codes.push(newCode);
      networkAdded.current += 1;
      setPages((p) => [...p, { content: newContent, code: newCode }]);
      setBadgeScale(true);
      setTimeout(() => setBadgeScale(false), 300);
      scheduleNextSpawn();
    }, delay);
  }, [rng, tutorialOpen]);

  useEffect(() => {
    if (!tutorialOpen && !isTimeUp) {
      scheduleNextSpawn();
    }
    return () => {
      if (spawnTimeout.current) clearTimeout(spawnTimeout.current);
    };
  }, [tutorialOpen, isTimeUp, scheduleNextSpawn]);

  const handleTimeUp = useCallback(() => {
    sound.playWrong();
    timeUpRef.current = true;
    setIsTimeUp(true);
    if (spawnTimeout.current) clearTimeout(spawnTimeout.current);
  }, []);

  const check = useCallback(() => {
    if (isTimeUp || currentFirstInvalid === -1) return;
    if (codeInput === null || codeInput < 0 || codeInput > 99) {
      sound.playClick();
      return;
    }
    const prev = currentFirstInvalid === 0 ? genesisCode : (pages[currentFirstInvalid - 1].code as number);
    const content = pages[currentFirstInvalid].content as number;
    if (codeInput === pageCode(prev, content)) {
      sound.playCorrect();
      const updated = [...pages];
      updated[currentFirstInvalid] = { ...updated[currentFirstInvalid], code: codeInput };
      setPages(updated);
      setCodeInput(null);
      setFixedCount((n) => n + 1);
      if (firstInvalidIndex(genesisCode, toLogic(updated)) === -1) {
        // Sửa hết một lần: mạng tăng tốc lên 2 giây một trang
        setShowFastToast(true);
        isFast.current = true;
      }
    } else {
      // Sai: rung nhẹ, không trừ gì
      sound.playWrong();
      setShaking(true);
      setTimeout(() => setShaking(false), 400);
    }
  }, [isTimeUp, currentFirstInvalid, codeInput, genesisCode, pages]);

  const prevForInvalid = currentFirstInvalid <= 0 ? genesisCode : (pages[currentFirstInvalid - 1].code ?? 0);
  const contentForInvalid = currentFirstInvalid !== -1 ? pages[currentFirstInvalid].content : 0;

  // Dữ liệu hiển thị làm thử hoặc bài thật
  const displayPracticePages: ChainPageData[] = [
    { content: 4, code: 24 },
    { content: 7, code: practiceConfirmed ? PRACTICE_EXPECTED_CODE : PRACTICE_WRONG_CODE },
    { content: 6, code: 6 },
    { content: 8, code: 20 },
    { content: 3, code: 43 },
    { content: 9, code: 95 },
  ];

  const displayGenesis = tutorialOpen ? PRACTICE_GENESIS : genesisCode;
  const displayPages = tutorialOpen ? displayPracticePages : pages;
  const displayRemaining = tutorialOpen ? (practiceConfirmed ? PRACTICE_PAGES_TO_FIX - 1 : PRACTICE_PAGES_TO_FIX) : remaining;
  const displayFixedCount = tutorialOpen ? (practiceConfirmed ? 1 : 0) : fixedCount;
  const displayFirstInvalid = tutorialOpen ? (practiceConfirmed ? -1 : 1) : currentFirstInvalid;
  const displayActiveIndex = tutorialOpen ? (practiceConfirmed ? 0 : 1) : currentFirstInvalid !== -1 ? currentFirstInvalid : pages.length - 1;

  const formulaTruoc = tutorialOpen ? PRACTICE_PREV_CODE : prevForInvalid;
  const formulaNd = tutorialOpen ? PRACTICE_OLD_CONTENT : (contentForInvalid ?? 0);

  // Định nghĩa các bước Hướng dẫn focus và Làm thử (P8b)
  const tutorialSteps: TutorialStep[] = [
    {
      id: 'intro',
      targetSelector: '[data-tutorial="stats-bar"]',
      title: tutorialTexts.man1Kho.tieuDe,
      content: tutorialTexts.man1Kho.intro,
      nextLabel: tutorialTexts.chung.tiep,
    },
    {
      id: 'spot-error',
      targetSelector: '[data-tutorial="chain-strip"]',
      title: tutorialTexts.man1Kho.tieuDe,
      content: tutorialTexts.man1Kho.spotError,
      nextLabel: tutorialTexts.chung.daHieu,
    },
    {
      id: 'formula',
      targetSelector: '[data-tutorial="formula-box"]',
      title: tutorialTexts.man1Kho.tieuDe,
      content: fmt(tutorialTexts.man1Kho.formula, {
        truoc: PRACTICE_PREV_CODE,
        nd: PRACTICE_OLD_CONTENT,
        tong: PRACTICE_EXPECTED_CODE,
      }),
      nextLabel: tutorialTexts.chung.thuTinhNgay,
    },
    {
      id: 'input',
      targetSelector: '[data-tutorial="practice-area"]',
      title: tutorialTexts.man1Kho.tieuDe,
      content: tutorialTexts.man1Kho.input,
      interactive: true,
      nextLabel: tutorialTexts.chung.tiep,
    },
    {
      id: 'check',
      targetSelector: '[data-tutorial="practice-area"]',
      title: tutorialTexts.man1Kho.tieuDe,
      content: tutorialTexts.man1Kho.check,
      interactive: true,
      hideNextButton: true,
    },
    {
      id: 'result',
      targetSelector: '[data-tutorial="practice-area"]',
      title: tutorialTexts.man1Kho.tieuDe,
      content:
        practiceResult === 'correct'
          ? fmt(tutorialTexts.man1Kho.correct, { ma: PRACTICE_EXPECTED_CODE })
          : fmt(tutorialTexts.man1Kho.wrong, {
              truoc: PRACTICE_PREV_CODE,
              nd: PRACTICE_OLD_CONTENT,
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
          <h2 className="text-2xl font-bold">{fmt(T.kho.tieuDe)}</h2>
          {tutorialOpen && (
            <p className="text-base font-semibold text-muc-tim-dam">{tutorialTexts.man1Kho.tieuDe}</p>
          )}
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

      <div
        className="flex flex-wrap items-center justify-between gap-3 rounded-bang border-2 border-nau-go/50 bg-white/60 p-4"
        data-tutorial="stats-bar"
      >
        <CountdownTimer
          durationMs={C.hardDurationMs}
          onTimeUp={handleTimeUp}
          isPaused={isTimeUp || tutorialOpen}
          resetTrigger={gameResetTrigger}
        />

        <div className="flex items-center gap-2" aria-live="polite">
          <span className="text-base font-bold text-nau-go-dam">{T.kho.conPhaiSua}</span>
          <span
            className={`inline-block font-display text-3xl font-extrabold text-do-son-dam transition-transform duration-200 ${
              badgeScale ? 'scale-125' : 'scale-100'
            }`}
          >
            {displayRemaining}
          </span>
          <span className="text-sm font-semibold text-nau-go-dam">{T.kho.trang}</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-base font-bold text-nau-go-dam">{T.kho.daSua}</span>
          <span className="font-display text-3xl font-extrabold text-xanh-la-dam">{displayFixedCount}</span>
          <span className="text-sm font-semibold text-nau-go-dam">{T.kho.trang}</span>
        </div>
      </div>

      {/* Vùng làm thử bao trùm dải trang sổ và khung công thức + nút Kiểm tra (P8b) */}
      <div data-tutorial="practice-area" className="space-y-4">
        <div className="overflow-hidden rounded-bang border-2 border-nau-go/50 bg-white/50" data-tutorial="chain-strip">
          <ChainStrip
            genesisCode={displayGenesis}
            pages={displayPages}
            firstInvalidIndex={displayFirstInvalid}
            activePageIndex={displayActiveIndex}
            slideInFromIndex={tutorialOpen ? PRACTICE_START_PAGES : C.hardStartPages}
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
                      placeholder={tutorialTexts.man1Kho.inputPlaceholder}
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

              if (idx !== currentFirstInvalid || isTimeUp) return undefined;
              return (
                <div className={`flex w-full flex-col items-center ${shaking ? 'animate-shake' : ''}`} data-tutorial="code-input">
                  <NumberInput
                    className="w-full"
                    id={codeId}
                    ref={codeInputRef}
                    value={codeInput}
                    showButtons={false}
                    placeholder={T.chung.khoangSo}
                    ariaLabel={fmt(T.de.nhanMaTrang, { n: idx + 1 })}
                    inputClassName="!h-10 !w-full !text-lg"
                    onChange={setCodeInput}
                    onEnter={check}
                    autoFocus
                  />
                </div>
              );
            }}
          />
        </div>

        {/* Khung gợi ý công thức và nút Kiểm tra/Cập nhật mã */}
        {(tutorialOpen || (!isTimeUp && currentFirstInvalid !== -1)) && (
          <div className="flex flex-col items-center justify-between gap-4 rounded-bang border-2 border-nau-go/50 bg-white/60 p-4 sm:flex-row">
            <div className="flex items-center gap-3" data-tutorial="formula-box">
              <PortraitFrame portrait="bi" size={72} />
              <div className="rounded-2xl border-2 border-nau-go/50 bg-giay p-3">
                <span className="mb-0.5 block text-sm font-semibold text-nau-go-dam">
                  <span aria-hidden="true">💡 </span>
                  {fmt(T.chung.congThuc, { n: tutorialOpen ? PRACTICE_TAMPER_PAGE : currentFirstInvalid + 1 })}
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

      {isTimeUp && !tutorialOpen && (
        <div className="space-y-6 rounded-bang border-2 border-nau-go/50 bg-white/60 p-4 sm:p-6">
          <h3 className="text-center text-3xl text-do-son-dam">{T.kho.hetGio}</h3>

          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border-2 border-xanh-la-dam bg-xanh-la/10 p-4 text-center">
              <dt className="mb-1 text-sm font-bold">{T.kho.tongKetDaSua}</dt>
              <dd className="font-display text-3xl font-extrabold text-xanh-la-dam">{fixedCount}</dd>
            </div>
            <div className="rounded-2xl border-2 border-muc-tim bg-muc-tim/10 p-4 text-center">
              <dt className="mb-1 text-sm font-bold">{T.kho.tongKetMangThem}</dt>
              <dd className="font-display text-3xl font-extrabold text-muc-tim-dam">{networkAdded.current}</dd>
            </div>
            <div className="rounded-2xl border-2 border-do-son bg-do-son/10 p-4 text-center">
              <dt className="mb-1 text-sm font-bold">{T.kho.tongKetConLech}</dt>
              <dd className="font-display text-3xl font-extrabold text-do-son-dam">{remaining}</dd>
            </div>
          </dl>

          <ReflectionQuestion question={T.kho.cauHoi} options={T.kho.luaChon} explanation={T.kho.giaiThich} />

          <div className="flex justify-center pt-2">
            <Button
              size="lg"
              onClick={() => {
                sound.playClick();
                onComplete({ stars: hardStars(fixedCount), timeMs: C.hardDurationMs, learned: T.kho.hocDuoc });
              }}
            >
              {T.kho.xongTram}
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
              ? fmt(tutorialTexts.man1Kho.correct, { ma: PRACTICE_EXPECTED_CODE })
              : practiceResult === 'wrong'
                ? fmt(tutorialTexts.man1Kho.wrong, {
                    truoc: PRACTICE_PREV_CODE,
                    nd: PRACTICE_OLD_CONTENT,
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

      {showFastToast && !tutorialOpen && (
        <Toast message={T.kho.nhanQua} type="info" duration={3000} onClose={() => setShowFastToast(false)} />
      )}
    </div>
  );
}
