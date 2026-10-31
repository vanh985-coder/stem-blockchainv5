import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  Avatar,
  Button,
  Card,
  FeedbackSheet,
  NumberInput,
  ProgressBar,
  TutorialSpotlight,
  type TutorialStep,
  tutorialTexts,
  fmt,
  sound,
  starsFromMistakes,
  type StationResult,
  rich,
} from '@so-chung/core';
import { bai4Texts } from '@so-chung/core/content/lessons/bai-4';
import { GAME_CONFIG } from '@so-chung/core/config/gameConfig';
import { createMulberry32 } from '@so-chung/core/lib/rng';
import { generateEasy, combine, type EasyTx } from '@so-chung/core/lessons/bai-4/logic';
import { portraitOf } from './nguoi';

const T = bai4Texts.tramDe;

export function Easy({ onComplete }: { onComplete: (r: StationResult) => void; onFail?: (tip: string) => void }) {
  const startTimeRef = useRef<number>(Date.now());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Dọn dẹp timer khi unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // Khởi tạo đề bài
  const data = useMemo(() => {
    // Lần đầu tải dùng bảng mặc định, nếu chơi lại dùng rng ngẫu nhiên
    const seed = (Date.now() ^ (Math.random() * 0x100000000)) >>> 0;
    const rng = createMulberry32(seed);
    return generateEasy(rng, false);
  }, []);

  const [txs] = useState<EasyTx[]>(data.txs);
  const [questions] = useState<[string, string][]>(data.questions);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [inputValue, setInputValue] = useState<number | null>(null);
  const [inputError, setInputError] = useState<string | undefined>();
  const [isMerging, setIsMerging] = useState(false);
  const [mergedCard, setMergedCard] = useState<{ label: string; value: number } | null>(null);
  const [mistakes, setMistakes] = useState(0);

  // ==========================================
  // HƯỚNG DẪN FOCUS & LÀM THỬ (P8 - Màn 10 Dễ)
  // ==========================================
  const [tutorialActive, setTutorialActive] = useState<boolean>(true);
  const [tutorialStep, setTutorialStep] = useState<number>(0);
  const [isRevisitingTutorial, setIsRevisitingTutorial] = useState<boolean>(false);
  const [practiceError, setPracticeError] = useState<string | undefined>();

  // Lưu trạng thái trước khi mở lại giữa bài
  const savedStateRef = useRef<{
    currentIndex: number;
    inputValue: number | null;
    mistakes: number;
  } | null>(null);

  const startRealGame = useCallback(() => {
    sound.playClick();
    setTutorialActive(false);
    setIsRevisitingTutorial(false);
    setIsMerging(false);
    setMergedCard(null);
    setInputValue(null);
    setInputError(undefined);
    setCurrentIndex(0);
    setMistakes(0);
    startTimeRef.current = Date.now();
  }, []);

  const handleOpenTutorial = useCallback(() => {
    sound.playClick();
    savedStateRef.current = {
      currentIndex,
      inputValue,
      mistakes,
    };
    setIsRevisitingTutorial(true);
    setTutorialActive(true);
    setTutorialStep(0);
    setPracticeError(undefined);
    setIsMerging(false);
    setMergedCard(null);
  }, [currentIndex, inputValue, mistakes]);

  const handleCloseRevisit = useCallback(() => {
    sound.playClick();
    setTutorialActive(false);
    setIsRevisitingTutorial(false);
    setIsMerging(false);
    setMergedCard(null);
    if (savedStateRef.current) {
      setCurrentIndex(savedStateRef.current.currentIndex);
      setInputValue(savedStateRef.current.inputValue);
      setMistakes(savedStateRef.current.mistakes);
      savedStateRef.current = null;
    }
  }, []);

  // Expose probe cho test
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__tutorial = {
        active: tutorialActive,
        step: tutorialStep,
        setStep: (s: number) => setTutorialStep(s),
        startRealGame,
        openTutorial: handleOpenTutorial,
      };
    }
  }, [tutorialActive, tutorialStep, startRealGame, handleOpenTutorial]);

  // Quản lý phản hồi FeedbackSheet
  const [feedback, setFeedback] = useState<{
    isOpen: boolean;
    isCorrect: boolean;
    title?: string;
    whatHappened: string;
    whyHappened?: string;
    howToFix?: string;
  }>({
    isOpen: false,
    isCorrect: false,
    whatHappened: '',
  });

  const txMap = useMemo(() => {
    const map = new Map<string, EasyTx>();
    txs.forEach((t) => map.set(t.id, t));
    return map;
  }, [txs]);

  const currentPair = questions[currentIndex];
  const txA = txMap.get(currentPair[0])!;
  const txB = txMap.get(currentPair[1])!;
  const pairLabel = `${txA.id}${txB.id.replace('T', '')}`;
  const expectedValue = combine(txA.value, txB.value);

  // Xử lý kiểm tra đáp án
  const handleCheck = useCallback(() => {
    if (isMerging) return;

    // Xử lý khi đang trong chế độ Hướng dẫn & Làm thử
    if (tutorialActive) {
      if (inputValue === null || inputValue < 10 || inputValue > 99) {
        sound.playWrong();
        setPracticeError(tutorialTexts.man10De.nhapSaiKhoang);
        return;
      }

      if (inputValue === expectedValue) {
        sound.playCorrect();
        setPracticeError(undefined);
        setIsMerging(true);

        const mergeDelay = GAME_CONFIG.lesson4.cardMergeDelayMs || 400;
        timerRef.current = setTimeout(() => {
          setMergedCard({
            label: pairLabel,
            value: expectedValue,
          });
          setTutorialStep(4);
        }, mergeDelay);
      } else {
        sound.playWrong();
        setPracticeError(
          fmt(tutorialTexts.man10De.wrong, {
            value: txA.value,
            value2: txB.value,
            expected: expectedValue,
          })
        );
      }
      return;
    }

    // 1. Kiểm tra ô trống hoặc ngoài khoảng
    if (inputValue === null || inputValue < 10 || inputValue > 99) {
      sound.playWrong();
      setMistakes((prev) => prev + 1);
      setInputError(T.vuiLongNhapMotSo);
      return;
    }

    setInputError(undefined);

    // 2. So khớp đáp án
    if (inputValue === expectedValue) {
      // Đúng!
      sound.playCorrect();
      setIsMerging(true);

      const mergeDelay = GAME_CONFIG.lesson4.cardMergeDelayMs || 400;
      timerRef.current = setTimeout(() => {
        setMergedCard({
          label: pairLabel,
          value: expectedValue,
        });

        // Chờ hiển thị thẻ gộp rồi sang câu tiếp theo
        timerRef.current = setTimeout(() => {
          setIsMerging(false);
          setMergedCard(null);
          setInputValue(null);

          if (currentIndex + 1 < questions.length) {
            setCurrentIndex((prev) => prev + 1);
          } else {
            // Hoàn thành cả 5 câu!
            const totalMistakes = mistakes;
            const stars = starsFromMistakes(totalMistakes);
            const timeMs = Date.now() - startTimeRef.current;
            sound.playLevelComplete();
            onComplete({
              stars,
              timeMs,
              learned: T.ghepHaiGiaoDichThi,
            });
          }
        }, 500);
      }, mergeDelay);
    } else {
      // Sai!
      sound.playWrong();
      setMistakes((prev) => prev + 1);

      // Kiểm tra xem có phải bẫy thứ tự ở T21 không
      const isReverseTrap =
        pairLabel === 'T21' && inputValue === combine(txB.value, txA.value);

      if (isReverseTrap) {
        setFeedback({
          isOpen: true,
          isCorrect: false,
          title: T.bayThuTu,
          whatHappened: fmt(T.emDaGhepNguocThu, { inputValue }),
          whyHappened: fmt(T.giaiThichT21, { value: txA.value, value2: txB.value, expectedValue, so4: txB.value * 10 + txA.value }),
          howToFix: fmt(T.laySoCuaGiaoDich, { value: txA.value, value2: txB.value }),
        });
      } else {
        // Gợi ý ba tầng chuẩn mực
        setFeedback({
          isOpen: true,
          isCorrect: false,
          title: T.chuaChinhXac,
          whatHappened: fmt(T.ketQuaChuaDungCho, { inputValue, pairLabel }),
          whyHappened: T.congThucGhepCapTong,
          howToFix: fmt(T.congThucTheSoCapGhep, { pairLabel, id: txA.id, id2: txB.id, value: txA.value, value2: txB.value, expectedValue }),
        });
      }
    }
  }, [
    isMerging,
    inputValue,
    expectedValue,
    pairLabel,
    txA,
    txB,
    currentIndex,
    questions.length,
    mistakes,
    onComplete,
    tutorialActive,
    expectedValue,
    pairLabel,
    txA.value,
    txB.value,
  ]);

  const tutorialSteps = useMemo<TutorialStep[]>(() => {
    return [
      {
        id: 'intro',
        title: tutorialTexts.man10De.tieuDe,
        content: tutorialTexts.man10De.intro,
        nextLabel: tutorialTexts.chung.tiep,
      },
      {
        id: 'table',
        targetSelector: '#tutorial-man10de-table',
        title: tutorialTexts.man10De.tieuDe,
        content: fmt(tutorialTexts.man10De.table, {
          id: txA.id,
          id2: txB.id,
          value: txA.value,
          value2: txB.value,
        }),
        nextLabel: tutorialTexts.chung.daHieu,
      },
      {
        id: 'pair',
        targetSelector: '#tutorial-man10de-pair',
        title: tutorialTexts.man10De.tieuDe,
        content:
          fmt(tutorialTexts.man10De.pair, {
            pairLabel,
            id: txA.id,
            id2: txB.id,
            value: txA.value,
            value2: txB.value,
          }) +
          ' ' +
          fmt(tutorialTexts.man10De.formula, {
            pairLabel,
            value: txA.value,
            value2: txB.value,
            expected: expectedValue,
          }),
        nextLabel: tutorialTexts.chung.thuTinhNgay,
      },
      {
        id: 'input',
        targetSelector: '#tutorial-man10de-input',
        title: tutorialTexts.man10De.tieuDe,
        content: fmt(tutorialTexts.man10De.input, { expected: expectedValue }),
        interactive: true,
        hideNextButton: true,
      },
      {
        id: 'result',
        targetSelector: '#tutorial-man10de-pair',
        title: tutorialTexts.man10De.tieuDe,
        content: fmt(tutorialTexts.man10De.correct, { pairLabel, expected: expectedValue }),
      },
    ];
  }, [txA, txB, pairLabel, expectedValue]);

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-200">
      <div className="space-y-1">
        <div className="flex items-center justify-between text-sm text-nau-go-dam font-semibold">
          <span>{T.tienDoGhepCap}</span>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleOpenTutorial}
              aria-label={tutorialTexts.chung.huongDan}
              className="flex items-center gap-1.5 text-nau-go-dam hover:text-muc-tim-dam font-bold"
            >
              <span>💡</span>
              <span>{tutorialTexts.chung.huongDan}</span>
            </Button>
            <span>{fmt(T.cauHoi, { so: currentIndex + 1, so2: questions.length })}</span>
          </div>
        </div>
        <ProgressBar
          current={currentIndex + 1}
          max={questions.length}
        />
      </div>

      {/* Bảng giao dịch tra cứu */}
      <div id="tutorial-man10de-table">
        <Card variant="paper" className="p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3 border-b border-nau-go/30 pb-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">📋</span>
              <h3 className="first-letter:uppercase font-display font-extrabold text-sm sm:text-base text-chu">{T.bangGiaoDich}</h3>
            </div>
            <span className="text-sm text-nau-go-dam">{T.bangTraCuuGiaTri}</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {txs.map((tx) => (
              <div
                key={tx.id}
                className={`p-2.5 rounded-[12px] border-2 transition-all flex flex-col items-center text-center ${
                  tx.id === txA.id || tx.id === txB.id
                    ? 'border-muc-tim bg-white/60'
                    : 'border-nau-go/30 bg-white/70 opacity-80'
                }`}
              >
                <div className="flex items-center gap-1 mb-1">
                  <Avatar portrait={portraitOf(tx.character)} size="sm" />
                  <span className="font-display font-extrabold text-sm text-muc-tim-dam">
                    {tx.id}
                  </span>
                </div>
                <div className="text-sm text-nau-go-dam font-medium truncate w-full">
                  {tx.name} {tx.item}
                </div>
                <div className="font-display font-extrabold text-base text-chu mt-1 bg-giay px-2 py-0.5 rounded-[6px]">
                  {tx.value}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Khu vực ghép thẻ */}
      <Card className="p-6 sm:p-8 flex flex-col items-center text-center relative overflow-hidden">
        <div className="text-sm font-bold text-muc-tim-dam uppercase tracking-wider mb-2">{fmt(T.cauGhepCap, { so: currentIndex + 1, pairLabel })}</div>
        <p className="text-sm text-nau-go-dam mb-6">{T.hayGhepGiaTriCua}{' '}<code className="bg-white/60 text-muc-tim-dam px-1.5 py-0.5 rounded border border-muc-tim/10 font-mono">{rich(T.congThucGhepCap)}</code>
        </p>

        {/* Khung hiển thị hai thẻ trượt vào nhau */}
        <div id="tutorial-man10de-pair" className="min-h-[120px] flex items-center justify-center relative w-full mb-6">
          {mergedCard ? (
            <div className="animate-in zoom-in-95 duration-200 p-4 rounded-[16px] border-2 border-xanh-la-dam bg-xanh-la/10 flex flex-col items-center min-w-[140px]">
              <span className="text-sm font-bold text-xanh-la-dam uppercase">{fmt(T.theGop, { label: mergedCard.label })}</span>
              <span className="font-display font-extrabold text-3xl text-xanh-la-dam mt-1">
                {mergedCard.value}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-3 sm:gap-6 relative">
              {/* Thẻ A (bên trái) */}
              <div
                className={`p-3.5 sm:p-4 rounded-[16px] border-2 border-muc-tim bg-white/60 flex flex-col items-center min-w-[110px] sm:min-w-[130px] transition-all duration-400 ${
                  isMerging ? 'translate-x-[45px] opacity-0 scale-90' : ''
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <Avatar portrait={portraitOf(txA.character)} size="sm" />
                  <span className="font-display font-extrabold text-sm text-muc-tim-dam">
                    {txA.id}
                  </span>
                </div>
                <div className="text-sm text-nau-go-dam truncate max-w-[100px]">
                  {txA.name}
                </div>
                <div className="font-display font-extrabold text-2xl text-chu mt-1">
                  {txA.value}
                </div>
              </div>

              {/* Dấu ghép */}
              <div
                className={`font-display font-extrabold text-xl text-nau-go-dam transition-opacity duration-300 ${
                  isMerging ? 'opacity-0' : 'opacity-100'
                }`}
              >
                +
              </div>

              {/* Thẻ B (bên phải) */}
              <div
                className={`p-3.5 sm:p-4 rounded-[16px] border-2 border-muc-tim bg-white/60 flex flex-col items-center min-w-[110px] sm:min-w-[130px] transition-all duration-400 ${
                  isMerging ? '-translate-x-[45px] opacity-0 scale-90' : ''
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <Avatar portrait={portraitOf(txB.character)} size="sm" />
                  <span className="font-display font-extrabold text-sm text-muc-tim-dam">
                    {txB.id}
                  </span>
                </div>
                <div className="text-sm text-nau-go-dam truncate max-w-[100px]">
                  {txB.name}
                </div>
                <div className="font-display font-extrabold text-2xl text-chu mt-1">
                  {txB.value}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Ô nhập số và nút nộp */}
        <div id="tutorial-man10de-input" className="flex flex-col items-center gap-3 w-full max-w-xs">
          <div className="flex items-center justify-center gap-2 w-full">
            <span className="font-display font-bold text-sm text-nau-go-dam">
              {pairLabel} =
            </span>
            <NumberInput
              value={inputValue}
              onChange={(val) => {
                setInputValue(val);
                if (inputError) setInputError(undefined);
                if (practiceError) setPracticeError(undefined);
              }}
              min={10}
              max={99}
              showButtons={false}
              placeholder="??"
              error={tutorialActive ? practiceError : inputError}
              onEnter={handleCheck}
              autoFocus
              className="w-28"
            />
          </div>

          <Button
            variant="primary"
            size="md"
            fullWidth
            onClick={handleCheck}
            disabled={isMerging}
          >{T.ghepGiaoDich}</Button>
        </div>
      </Card>

      {/* Phản hồi giải thích */}
      <FeedbackSheet
        isOpen={feedback.isOpen}
        isCorrect={feedback.isCorrect}
        title={feedback.title}
        whatHappened={feedback.whatHappened}
        whyHappened={feedback.whyHappened}
        howToFix={feedback.howToFix}
        onContinue={() => {
          setFeedback((prev) => ({ ...prev, isOpen: false }));
        }}
        continueLabel={T.thuLai}
      />

      {/* Hướng dẫn Focus Spotlight (P8) */}
      <TutorialSpotlight
        isOpen={tutorialActive}
        steps={tutorialSteps}
        currentStepIndex={tutorialStep}
        onNext={() => setTutorialStep((prev) => Math.min(prev + 1, tutorialSteps.length - 1))}
        onPrev={() => setTutorialStep((prev) => Math.max(0, prev - 1))}
        onSkip={startRealGame}
        feedbackMessage={practiceError}
        feedbackType={practiceError ? 'error' : undefined}
        actionButton={
          tutorialStep === tutorialSteps.length - 1
            ? {
                label: isRevisitingTutorial
                  ? tutorialTexts.chung.troLaiBaiLam
                  : tutorialTexts.chung.batDauChoi,
                onClick: isRevisitingTutorial ? handleCloseRevisit : startRealGame,
                variant: 'primary',
              }
            : undefined
        }
      />
    </div>
  );
}
