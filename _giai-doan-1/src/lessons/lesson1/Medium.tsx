import React, { useState, useEffect, useRef, useId, useCallback } from 'react';
import { LevelProps } from '../../components/game/LessonShell';
import { Button } from '../../components/ui/Button';
import { Avatar } from '../../components/ui/Avatar';
import { Mascot } from '../../components/ui/Mascot';
import { NumberInput } from '../../components/ui/NumberInput';
import { FeedbackSheet } from '../../components/game/FeedbackSheet';
import { ReflectionQuestion } from '../../components/game/ReflectionQuestion';
import { ChainStrip, ChainPageData } from '../../components/game/ChainStrip';
import {
  pageCode,
  buildChain,
  firstInvalidIndex,
  pickSafeContent,
  randomGenesis,
  randomContents,
  Lesson1Data,
} from './logic';
import { lesson1Texts } from './content';
import { createMulberry32 } from '../../lib/rng';
import { starsFromMistakes } from '../../lib/progressLogic';
import { useProgress } from '../../app/ProgressContext';
import { sound } from '../../lib/sound';
import { GAME_CONFIG } from '../../config/gameConfig';

export const Medium: React.FC<LevelProps> = ({ onComplete }) => {
  const { progress, getLessonData } = useProgress();
  const reducedMotion = progress.settings.reducedMotion;
  const rng = useRef(createMulberry32(Date.now())).current;
  const startTime = useRef(performance.now()).current;

  // 1. Lấy dữ liệu chuỗi từ Bài 1 hoặc tạo mới
  const savedData = getLessonData<Lesson1Data>('lesson1');
  const isValidSaved =
    Boolean(
      savedData &&
      savedData.contents?.length === 5 &&
      savedData.codes?.length === 5 &&
      savedData.contents.every((c) => typeof c === 'number' && c >= 0 && c <= 99) &&
      savedData.codes.every((c) => typeof c === 'number' && c >= 0 && c <= 99) &&
      firstInvalidIndex(
        savedData.genesisCode,
        savedData.contents.map((c, i) => ({ content: c, code: savedData.codes[i] }))
      ) === -1
    );

  const isFromSaved = useRef(isValidSaved).current;
  const genesisCode = useRef(
    isValidSaved ? (savedData as Lesson1Data).genesisCode : randomGenesis(rng)
  ).current;

  const initialContents = useRef(
    isValidSaved ? [...(savedData as Lesson1Data).contents] : randomContents(5, rng)
  ).current;

  const initialCodes = useRef(
    isValidSaved ? [...(savedData as Lesson1Data).codes] : buildChain(genesisCode, initialContents)
  ).current;

  // Chọn trang k ∈ {1, 2} (Trang 2 hoặc Trang 3) để sửa trộm
  const tamperIndex = useRef(rng() < 0.5 ? 1 : 2).current;
  const originalOldContent = initialContents[tamperIndex];
  const tamperedNewContent = useRef(pickSafeContent(originalOldContent, rng)).current;

  // Trạng thái hoạt cảnh Tí sửa trộm
  const [isTampering, setIsTampering] = useState(!reducedMotion);

  // Danh sách các trang trong sổ
  const [pages, setPages] = useState<ChainPageData[]>(() => {
    return initialContents.map((c, idx) => ({
      content: c,
      code: initialCodes[idx],
    }));
  });

  // Số trang đã sửa thành công
  const [fixedCount, setFixedCount] = useState(0);

  // Hiển thị Mascot ngạc nhiên ở lần domino đầu tiên
  const [showFirstDominoAlert, setShowFirstDominoAlert] = useState(false);

  // Input nhập mã
  const [codeInput, setCodeInput] = useState<number | null>(null);
  const [codeError, setCodeError] = useState<string | undefined>();
  const [mistakes, setMistakes] = useState(0);

  // FeedbackSheet
  const [feedback, setFeedback] = useState<{
    isOpen: boolean;
    whatHappened: string;
    whyHappened?: string;
    howToFix?: string;
  }>({
    isOpen: false,
    whatHappened: '',
  });

  // Câu hỏi suy ngẫm sau khi sửa xong
  const [showReflection, setShowReflection] = useState(false);

  const codeInputRef = useRef<HTMLInputElement>(null);
  const codeId = useId();

  // Hoạt cảnh Tí lẻn vào sửa sổ
  useEffect(() => {
    if (reducedMotion) {
      // Bỏ hoạt cảnh, áp dụng việc sửa trộm ngay
      setPages((prev) => {
        const next = [...prev];
        next[tamperIndex] = {
          content: tamperedNewContent,
          code: initialCodes[tamperIndex],
          struckContent: originalOldContent,
        };
        return next;
      });
      setIsTampering(false);
      return;
    }

    const timer = setTimeout(() => {
      sound.playWrong();
      setPages((prev) => {
        const next = [...prev];
        next[tamperIndex] = {
          content: tamperedNewContent,
          code: initialCodes[tamperIndex],
          struckContent: originalOldContent,
        };
        return next;
      });
      setIsTampering(false);
    }, GAME_CONFIG.lesson1.tamperAnimMs);

    return () => clearTimeout(timer);
  }, [reducedMotion, tamperIndex, tamperedNewContent, originalOldContent, initialCodes]);

  // Tìm trang lệch đầu tiên
  const currentFirstInvalid = firstInvalidIndex(
    genesisCode,
    pages.map((p) => ({
      content: p.content ?? 0,
      code: p.code ?? -1,
    }))
  );

  // Focus ô nhập mã trang khi có trang lệch
  useEffect(() => {
    if (!isTampering && currentFirstInvalid !== -1) {
      codeInputRef.current?.focus();
    }
  }, [isTampering, currentFirstInvalid]);

  // Kiểm tra mã trang sửa
  const handleCheckCode = useCallback(() => {
    if (currentFirstInvalid === -1) return;

    if (codeInput === null || codeInput < 0 || codeInput > 99) {
      setCodeError(lesson1Texts.easy.codeError);
      sound.playClick();
      return;
    }

    setCodeError(undefined);

    const prevCode =
      currentFirstInvalid === 0
        ? genesisCode
        : (pages[currentFirstInvalid - 1].code as number);
    const content = pages[currentFirstInvalid].content as number;
    const expected = pageCode(prevCode, content);

    if (codeInput === expected) {
      sound.playCorrect();
      const updatedPages = [...pages];
      updatedPages[currentFirstInvalid] = {
        ...updatedPages[currentFirstInvalid],
        code: codeInput,
      };
      setPages(updatedPages);
      setCodeInput(null);

      const newFixedCount = fixedCount + 1;
      setFixedCount(newFixedCount);

      // Domino: kiểm tra trang tiếp theo sau khi cập nhật
      const nextInvalid = firstInvalidIndex(
        genesisCode,
        updatedPages.map((p) => ({
          content: p.content ?? 0,
          code: p.code ?? -1,
        }))
      );

      // Lần domino đầu tiên: trang k sửa xong khiến trang k+1 lệch
      if (newFixedCount === 1 && nextInvalid !== -1) {
        setShowFirstDominoAlert(true);
      } else {
        setShowFirstDominoAlert(false);
      }

      // Nếu đã sửa hết tất cả các trang
      if (nextInvalid === -1) {
        setShowReflection(true);
      }
    } else {
      sound.playWrong();
      setMistakes((m) => m + 1);
      setFeedback({
        isOpen: true,
        whatHappened: `Mã trang ${codeInput} chưa đúng.`,
        whyHappened: `Công thức: (${prevCode} × 2 + ${content}) mod 100.`,
        howToFix: `Em hãy nhân 2 mã trang trước (${prevCode} × 2 = ${prevCode * 2}), cộng nội dung (${content}), rồi lấy 2 chữ số cuối nhé!`,
      });
    }
  }, [currentFirstInvalid, codeInput, genesisCode, pages, fixedCount]);

  // Xử lý khi hoàn tất suy ngẫm
  const handleCompleteReflection = () => {
    sound.playClick();
    const timeMs = Math.round(performance.now() - startTime);
    onComplete({
      stars: starsFromMistakes(mistakes),
      timeMs,
      learned: lesson1Texts.medium.learned,
    });
  };

  const prevCodeForInvalid =
    currentFirstInvalid <= 0
      ? genesisCode
      : (pages[currentFirstInvalid - 1].code ?? 0);
  const contentForInvalid =
    currentFirstInvalid !== -1 ? pages[currentFirstInvalid].content : 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* 1. Tiêu đề và ghi chú nguồn chuỗi */}
      <div className="text-center space-y-1">
        <h2 className="font-display font-black text-2xl text-[#2A2340]">
          {lesson1Texts.medium.title}
        </h2>
        {isFromSaved && (
          <p className="text-xs font-semibold text-[#1FAF5A] bg-[#1FAF5A]/10 px-3 py-1 rounded-full inline-block">
            ✨ {lesson1Texts.medium.fromPrevious}
          </p>
        )}
      </div>

      {/* 2. Hoạt cảnh Tí sửa trộm sổ */}
      {isTampering ? (
        <div className="p-6 rounded-[20px] bg-[#FFF0ED] border-2 border-[#E5484D] shadow-sticker text-center space-y-3 animate-pulse">
          <Avatar character="ti" size="lg" className="mx-auto" />
          <h3 className="font-display font-bold text-lg text-[#E5484D]">
            Cáo Tí đang lén sửa sổ...!
          </h3>
          <p className="text-xs sm:text-sm text-[#6B6485]">
            Tí đang bí mật gạch số cũ trên trang {tamperIndex + 1} và ghi đè số mới vào...
          </p>
        </div>
      ) : (
        /* Thông báo sau khi Tí sửa xong */
        <div className="p-4 rounded-[16px] bg-[#FFF0ED] border border-[#E5484D] flex items-center justify-between gap-3 shadow-sticker-sm">
          <div className="flex items-center gap-3">
            <Avatar character="ti" size="md" className="shrink-0" />
            <div className="text-xs sm:text-sm">
              <span className="font-bold text-[#E5484D] block">
                {lesson1Texts.medium.tamperAlert(tamperIndex + 1)}
              </span>
              <span className="text-[#6B6485]">
                {lesson1Texts.medium.fixedCountLabel}{' '}
                <strong className="text-[#5B3FD6] text-base">{fixedCount}</strong>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 3. Dãy trang sổ cuộn ngang (ChainStrip) */}
      <div className="bg-white rounded-[20px] border-2 border-[#E3E0EE] shadow-sticker-sm overflow-hidden">
        <ChainStrip
          genesisCode={genesisCode}
          pages={pages}
          firstInvalidIndex={currentFirstInvalid}
          activePageIndex={currentFirstInvalid !== -1 ? currentFirstInvalid : 0}
          isPageConfirmed={(idx) => {
            if (currentFirstInvalid === -1) return true;
            return idx < currentFirstInvalid;
          }}
          isPageWillRecalc={(idx) => {
            if (currentFirstInvalid === -1) return false;
            return idx > currentFirstInvalid;
          }}
          renderCodeSlot={(idx) => {
            if (idx !== currentFirstInvalid || isTampering) return undefined;
            return (
              <div className="w-full flex flex-col items-center">
                <NumberInput
                  id={codeId}
                  ref={codeInputRef}
                  value={codeInput}
                  showButtons={false}
                  placeholder="0–99"
                  inputClassName="w-full text-base sm:text-lg h-9 sm:h-10 text-[#5B3FD6]"
                  onChange={(v) => {
                    setCodeInput(v);
                    setCodeError(undefined);
                  }}
                  onEnter={handleCheckCode}
                  error={codeError}
                  autoFocus
                />
              </div>
            );
          }}
        />
      </div>

      {/* 4. Thông báo Mascot ngạc nhiên khi domino xảy ra */}
      {showFirstDominoAlert && currentFirstInvalid !== -1 && (
        <div className="p-4 rounded-[16px] bg-[#EDE9FE] border-2 border-[#5B3FD6] flex items-center gap-3 animate-in fade-in zoom-in-95">
          <Mascot mood="ngac_nhien" size="md" className="shrink-0" />
          <p className="text-xs sm:text-sm text-[#2A2340] font-semibold">
            {lesson1Texts.medium.dominoAlert(currentFirstInvalid)}
          </p>
        </div>
      )}

      {/* 5. Khung điều khiển & Gợi ý công thức */}
      {!isTampering && currentFirstInvalid !== -1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-[16px] bg-white border-2 border-[#E3E0EE] shadow-sticker-sm">
          <div className="flex items-center gap-3">
            <Mascot mood="suy_nghi" size="md" className="shrink-0" />
            <div className="bg-[#F6F5FB] border border-[#E3E0EE] rounded-[14px] p-3 text-xs sm:text-sm">
              <span className="font-semibold text-[#6B6485] block mb-0.5">
                Tính lại mã cho trang {currentFirstInvalid + 1}:
              </span>
              <span className="font-display font-black text-sm sm:text-base text-[#5B3FD6]">
                ({prevCodeForInvalid} × 2 + {contentForInvalid}) mod 100 = ?
              </span>
            </div>
          </div>

          <div className="shrink-0">
            <Button
              variant="primary"
              size="md"
              onClick={handleCheckCode}
              className="px-6 shadow-sticker"
            >
              Cập nhật mã
            </Button>
          </div>
        </div>
      )}

      {/* 6. Câu hỏi suy ngẫm khi sửa xong trang cuối */}
      {showReflection && (
        <div className="animate-in fade-in zoom-in-95 duration-300 space-y-4">
          <ReflectionQuestion
            question={lesson1Texts.medium.reflectionQuestion}
            options={lesson1Texts.medium.reflectionOptions}
            explanation={lesson1Texts.medium.reflectionExplanation}
          />
          <div className="flex justify-center pt-2">
            <Button
              variant="primary"
              size="lg"
              onClick={handleCompleteReflection}
              className="px-8 shadow-sticker text-base"
            >
              {lesson1Texts.medium.nextLevelButton} →
            </Button>
          </div>
        </div>
      )}

      {/* FeedbackSheet khi sai */}
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
        continueLabel="Thử lại"
      />
    </div>
  );
};
