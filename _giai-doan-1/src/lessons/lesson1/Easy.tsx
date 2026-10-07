import React, { useState, useRef, useId, useCallback } from 'react';
import { LevelProps } from '../../components/game/LessonShell';
import { Button } from '../../components/ui/Button';
import { Mascot } from '../../components/ui/Mascot';
import { NumberInput } from '../../components/ui/NumberInput';
import { FeedbackSheet } from '../../components/game/FeedbackSheet';
import { ChainStrip, ChainPageData } from '../../components/game/ChainStrip';
import {
  pageCode,
  randomGenesis,
  solutionSteps,
} from './logic';
import { lesson1Texts } from './content';
import { createMulberry32 } from '../../lib/rng';
import { starsFromMistakes } from '../../lib/progressLogic';
import { useProgress } from '../../app/ProgressContext';
import { sound } from '../../lib/sound';

export const Easy: React.FC<LevelProps> = ({ onComplete }) => {
  const { setLessonData } = useProgress();
  const rng = useRef(createMulberry32(Date.now())).current;
  const startTime = useRef(performance.now()).current;

  // Khởi tạo mã trang bìa ngẫu nhiên [10, 89]
  const genesisCode = useRef(randomGenesis(rng)).current;

  // 5 trang cần xây
  const [pages, setPages] = useState<ChainPageData[]>([
    { content: null, code: null },
    { content: null, code: null },
    { content: null, code: null },
    { content: null, code: null },
    { content: null, code: null },
  ]);

  const [activeIdx, setActiveIdx] = useState(0);
  const [contentVal, setContentVal] = useState<number | null>(null);
  const [codeVal, setCodeVal] = useState<number | null>(null);
  const [contentError, setContentError] = useState<string | undefined>();
  const [codeError, setCodeError] = useState<string | undefined>();

  const [mistakes, setMistakes] = useState(0);
  const [pageMistakes, setPageMistakes] = useState(0);

  const [feedback, setFeedback] = useState<{
    isOpen: boolean;
    whatHappened: string;
    whyHappened?: string;
    howToFix?: string;
  }>({
    isOpen: false,
    whatHappened: '',
  });

  const contentRef = useRef<HTMLInputElement>(null);
  const codeRef = useRef<HTMLInputElement>(null);

  const contentId = useId();
  const codeId = useId();

  // Chọn giúp em một số ngẫu nhiên 0–99
  const handlePickRandom = useCallback(() => {
    sound.playClick();
    const rand = Math.floor(rng() * 100);
    setContentVal(rand);
    setContentError(undefined);
    codeRef.current?.focus();
  }, [rng]);

  // Kiểm tra kết quả
  const handleCheck = useCallback(() => {
    // 1. Kiểm tra ô nhập hợp lệ
    let hasInputError = false;
    if (contentVal === null || contentVal < 0 || contentVal > 99) {
      setContentError(lesson1Texts.easy.contentError);
      hasInputError = true;
    } else {
      setContentError(undefined);
    }

    if (codeVal === null || codeVal < 0 || codeVal > 99) {
      setCodeError(lesson1Texts.easy.codeError);
      hasInputError = true;
    } else {
      setCodeError(undefined);
    }

    if (hasInputError) {
      sound.playClick();
      return;
    }

    const prevCode = activeIdx === 0 ? genesisCode : (pages[activeIdx - 1].code as number);
    const expected = pageCode(prevCode, contentVal as number);

    if (codeVal === expected) {
      sound.playCorrect();
      const updatedPages = [...pages];
      updatedPages[activeIdx] = {
        content: contentVal,
        code: codeVal,
      };
      setPages(updatedPages);

      if (activeIdx < 4) {
        setActiveIdx(activeIdx + 1);
        setContentVal(null);
        setCodeVal(null);
        setPageMistakes(0);
        setContentError(undefined);
        setCodeError(undefined);
      } else {
        // Hoàn thành cả 5 trang!
        const finalContents = updatedPages.map((p) => p.content as number);
        const finalCodes = updatedPages.map((p) => p.code as number);
        setLessonData('lesson1', {
          genesisCode,
          contents: finalContents,
          codes: finalCodes,
        });

        const timeMs = Math.round(performance.now() - startTime);
        onComplete({
          stars: starsFromMistakes(mistakes),
          timeMs,
          learned: lesson1Texts.easy.learned,
        });
      }
    } else {
      sound.playWrong();
      setMistakes((m) => m + 1);
      const newPageMistakes = pageMistakes + 1;
      setPageMistakes(newPageMistakes);

      if (newPageMistakes === 1) {
        setFeedback({
          isOpen: true,
          whatHappened: `Mã trang ${codeVal} chưa đúng.`,
          whyHappened: `Công thức: (${prevCode} × 2 + ${contentVal}) mod 100.`,
          howToFix: `Em hãy nhân đôi mã trang trước (${prevCode} × 2), cộng thêm nội dung (${contentVal}), rồi lấy 2 chữ số cuối (mod 100) nhé!`,
        });
      } else {
        const steps = solutionSteps(prevCode, contentVal as number);
        setFeedback({
          isOpen: true,
          whatHappened: `Mã trang vẫn chưa đúng. Lời giải từng bước:`,
          whyHappened: `1) ${prevCode} × 2 = ${steps.doubled}\n2) ${steps.doubled} + ${contentVal} = ${steps.sum}\n3) Giữ 2 chữ số cuối (mod 100): ${steps.code}`,
          howToFix: `Em hãy nhập lại mã trang là ${steps.code} nhé!`,
        });
      }
    }
  }, [
    contentVal,
    codeVal,
    activeIdx,
    genesisCode,
    pages,
    mistakes,
    pageMistakes,
    setLessonData,
    startTime,
    onComplete,
  ]);

  const prevCodeForActive = activeIdx === 0 ? genesisCode : (pages[activeIdx - 1].code ?? 0);
  const formulaSubstituted =
    contentVal !== null
      ? `(${prevCodeForActive} × 2 + ${contentVal}) mod 100 = ?`
      : `(${prevCodeForActive} × 2 + nội dung) mod 100 = ?`;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* 1. Hướng dẫn và tiến trình trang */}
      <div className="text-center space-y-1">
        <h2 className="font-display font-black text-2xl text-[#2A2340]">
          {lesson1Texts.easy.title}
        </h2>
        <p className="text-xs sm:text-sm text-[#6B6485]">
          Đang làm: <span className="font-bold text-[#5B3FD6]">Trang {activeIdx + 1} / 5</span> — {lesson1Texts.easy.instruction}
        </p>
      </div>

      {/* 2. Dãy chuỗi các trang sổ cuộn ngang (ChainStrip) */}
      <div className="bg-white rounded-[20px] border-2 border-[#E3E0EE] shadow-sticker-sm overflow-hidden">
        <ChainStrip
          genesisCode={genesisCode}
          pages={pages}
          firstInvalidIndex={-1}
          activePageIndex={activeIdx}
          isPageConfirmed={(idx) => idx < activeIdx}
          isPageDimmed={(idx) => idx > activeIdx}
          renderContentSlot={(idx) => {
            if (idx !== activeIdx) return undefined;
            return (
              <div className="flex flex-col items-center gap-1">
                <NumberInput
                  id={contentId}
                  ref={contentRef}
                  value={contentVal}
                  showButtons={false}
                  placeholder="0–99"
                  inputClassName="w-full text-base sm:text-lg h-9 sm:h-10"
                  onChange={(v) => {
                    setContentVal(v);
                    setContentError(undefined);
                  }}
                  onEnter={() => codeRef.current?.focus()}
                  error={contentError}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handlePickRandom}
                  className="text-[11px] font-bold text-[#5B3FD6] hover:underline cursor-pointer transition-colors"
                >
                  🎲 {lesson1Texts.easy.pickRandom}
                </button>
              </div>
            );
          }}
          renderCodeSlot={(idx) => {
            if (idx !== activeIdx) return undefined;
            return (
              <div className="w-full flex flex-col items-center">
                <NumberInput
                  id={codeId}
                  ref={codeRef}
                  value={codeVal}
                  showButtons={false}
                  placeholder="0–99"
                  inputClassName="w-full text-base sm:text-lg h-9 sm:h-10 text-[#5B3FD6]"
                  onChange={(v) => {
                    setCodeVal(v);
                    setCodeError(undefined);
                  }}
                  onEnter={handleCheck}
                  error={codeError}
                />
              </div>
            );
          }}
        />
      </div>

      {/* 3. Bảng điều khiển & Gợi ý công thức từ Mascot (ở trang 1 hoặc các trang) */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-[16px] bg-white border-2 border-[#E3E0EE] shadow-sticker-sm">
        {/* Linh vật nhắc công thức */}
        <div className="flex items-center gap-3">
          <Mascot mood="suy_nghi" size="md" className="shrink-0" />
          <div className="relative bg-[#F6F5FB] border border-[#E3E0EE] rounded-[14px] p-3 text-xs sm:text-sm">
            <span className="font-semibold text-[#6B6485] block mb-0.5">
              💡 Công thức tính mã trang {activeIdx + 1}:
            </span>
            <span className="font-display font-black text-sm sm:text-base text-[#5B3FD6]">
              {formulaSubstituted}
            </span>
          </div>
        </div>

        {/* Nút Kiểm tra */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="primary"
            size="md"
            onClick={handleCheck}
            className="px-6 shadow-sticker"
          >
            {lesson1Texts.easy.checkButton}
          </Button>
        </div>
      </div>

      {/* 4. FeedbackSheet giải thích khi sai */}
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
        continueLabel="Thử lại"
      />
    </div>
  );
};
