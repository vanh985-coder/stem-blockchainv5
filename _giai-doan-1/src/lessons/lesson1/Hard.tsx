import React, { useState, useEffect, useRef, useId, useCallback } from 'react';
import { LevelProps } from '../../components/game/LessonShell';
import { Button } from '../../components/ui/Button';
import { Mascot } from '../../components/ui/Mascot';
import { NumberInput } from '../../components/ui/NumberInput';
import { Toast } from '../../components/ui/Toast';
import { ReflectionQuestion } from '../../components/game/ReflectionQuestion';
import { ChainStrip, ChainPageData } from '../../components/game/ChainStrip';
import {
  pageCode,
  buildChain,
  firstInvalidIndex,
  pickSafeContent,
  randomGenesis,
  randomContents,
  pagesToFix,
  spawnDelayMs,
  hardStars,
} from './logic';
import { lesson1Texts } from './content';
import { createMulberry32 } from '../../lib/rng';
import { sound } from '../../lib/sound';
import { GAME_CONFIG } from '../../config/gameConfig';

const C = GAME_CONFIG.lesson1;

interface CountdownTimerProps {
  durationMs: number;
  onTimeUp: () => void;
  isPaused?: boolean;
}

const CountdownTimer: React.FC<CountdownTimerProps> = ({
  durationMs,
  onTimeUp,
  isPaused = false,
}) => {
  const [secondsLeft, setSecondsLeft] = useState(Math.ceil(durationMs / 1000));
  const endAtRef = useRef(performance.now() + durationMs);
  const timeUpTriggered = useRef(false);

  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      const now = performance.now();
      const remain = Math.max(0, endAtRef.current - now);
      const secs = Math.ceil(remain / 1000);
      setSecondsLeft(secs);

      if (remain <= 0 && !timeUpTriggered.current) {
        timeUpTriggered.current = true;
        clearInterval(interval);
        onTimeUp();
      }
    }, 250);

    return () => clearInterval(interval);
  }, [isPaused, onTimeUp]);

  const isLowTime = secondsLeft <= 10;

  return (
    <div
      className={`
        px-3.5 py-1.5 rounded-[12px] border-2 font-display font-black text-lg sm:text-xl
        flex items-center gap-2 shadow-sticker-sm transition-colors
        ${
          isLowTime
            ? 'bg-[#FFF0ED] border-[#E5484D] text-[#E5484D] animate-pulse'
            : 'bg-white border-[#E3E0EE] text-[#5B3FD6]'
        }
      `}
      aria-label={`Thời gian còn lại: ${secondsLeft} giây`}
    >
      <span aria-hidden="true">⏱️</span>
      <span>{secondsLeft}s</span>
    </div>
  );
};

export const Hard: React.FC<LevelProps> = ({ onComplete }) => {
  const rng = useRef(createMulberry32(Date.now())).current;

  // 1. Tạo chuỗi gốc 6 trang
  const genesisCode = useRef(randomGenesis(rng)).current;
  const initialContents = useRef(randomContents(C.hardStartPages, rng)).current;
  const initialCodes = useRef(buildChain(genesisCode, initialContents)).current;

  // Bản chuỗi GỐC của mạng lưới lưu trong useRef
  const origChainRef = useRef<{ contents: number[]; codes: number[] }>({
    contents: [...initialContents],
    codes: [...initialCodes],
  });

  // Số trang mạng đã thêm
  const networkAddedCountRef = useRef(0);

  // Sổ của em: trang index 1 (trang 2) bị sửa trộm
  const tamperedContent = useRef(
    pickSafeContent(initialContents[C.hardTamperIndex], rng)
  ).current;

  const [pages, setPages] = useState<ChainPageData[]>(() => {
    return initialContents.map((c, idx) => ({
      content: idx === C.hardTamperIndex ? tamperedContent : c,
      code: initialCodes[idx],
    }));
  });

  // Số trang em đã sửa (M)
  const [fixedCount, setFixedCount] = useState(0);

  // Trạng thái hết giờ
  const [isTimeUp, setIsTimeUp] = useState(false);

  // Cờ fast khi em đã sửa hết một lần (N = 0)
  const isFastRef = useRef(false);
  const [showFastToast, setShowFastToast] = useState(false);

  // Hiệu ứng nhảy số khi có trang mới
  const [badgeScale, setBadgeScale] = useState(false);

  // Input sửa mã
  const [codeInput, setCodeInput] = useState<number | null>(null);
  const [isInputShaking, setIsInputShaking] = useState(false);

  const codeInputRef = useRef<HTMLInputElement>(null);
  const spawnTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const spawnIndexRef = useRef(0);

  const codeId = useId();

  // Tìm trang lệch đầu tiên
  const currentFirstInvalid = firstInvalidIndex(
    genesisCode,
    pages.map((p) => ({
      content: p.content ?? 0,
      code: p.code ?? -1,
    }))
  );

  const remainingToFix = pagesToFix(currentFirstInvalid, pages.length);

  // Focus ô nhập khi có trang lệch
  useEffect(() => {
    if (!isTimeUp && currentFirstInvalid !== -1) {
      codeInputRef.current?.focus();
    }
  }, [isTimeUp, currentFirstInvalid]);

  // Vòng lặp thêm trang của mạng lưới bằng chuỗi setTimeout (không dùng setInterval)
  const scheduleNextSpawn = useCallback(() => {
    if (isTimeUp) return;

    const delay = spawnDelayMs(spawnIndexRef.current, isFastRef.current);
    spawnIndexRef.current += 1;

    spawnTimeoutRef.current = setTimeout(() => {
      if (isTimeUp) return;

      const newContent = Math.floor(rng() * 100);
      const prevOrigCode =
        origChainRef.current.codes[origChainRef.current.codes.length - 1];
      const newOrigCode = pageCode(prevOrigCode, newContent);

      // Đẩy vào chuỗi gốc
      origChainRef.current.contents.push(newContent);
      origChainRef.current.codes.push(newOrigCode);
      networkAddedCountRef.current += 1;

      // Đẩy vào sổ của em
      setPages((prev) => [
        ...prev,
        {
          content: newContent,
          code: newOrigCode,
        },
      ]);

      // Nảy nhẹ số trang còn phải sửa
      setBadgeScale(true);
      setTimeout(() => setBadgeScale(false), 300);

      // Tiếp tục hẹn giờ thêm trang sau
      scheduleNextSpawn();
    }, delay);
  }, [isTimeUp, rng]);

  // Bắt đầu chuỗi thêm trang khi màn chơi bắt đầu
  useEffect(() => {
    scheduleNextSpawn();
    return () => {
      if (spawnTimeoutRef.current) {
        clearTimeout(spawnTimeoutRef.current);
      }
    };
  }, [scheduleNextSpawn]);

  // Xử lý khi hết giờ 60s
  const handleTimeUp = useCallback(() => {
    sound.playWrong();
    setIsTimeUp(true);
    if (spawnTimeoutRef.current) {
      clearTimeout(spawnTimeoutRef.current);
    }
  }, []);

  // Kiểm tra mã trang nhập
  const handleCheckCode = useCallback(() => {
    if (isTimeUp || currentFirstInvalid === -1) return;

    if (codeInput === null || codeInput < 0 || codeInput > 99) {
      sound.playClick();
      return;
    }

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

      const newFixed = fixedCount + 1;
      setFixedCount(newFixed);

      // Kiểm tra nếu N về 0
      const nextInvalid = firstInvalidIndex(
        genesisCode,
        updatedPages.map((p) => ({
          content: p.content ?? 0,
          code: p.code ?? -1,
        }))
      );

      if (nextInvalid === -1) {
        setShowFastToast(true);
        isFastRef.current = true;
      }
    } else {
      // Sai: rung nhẹ và phát âm thanh, không trừ gì
      sound.playWrong();
      setIsInputShaking(true);
      setTimeout(() => setIsInputShaking(false), 400);
    }
  }, [isTimeUp, currentFirstInvalid, codeInput, genesisCode, pages, fixedCount]);

  // Hoàn tất màn chơi và sang Bài 2
  const handleCompleteHard = () => {
    sound.playClick();
    onComplete({
      stars: hardStars(fixedCount),
      timeMs: C.hardDurationMs,
      learned: lesson1Texts.hard.learned,
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
      {/* 1. Header trạng thái: Đồng hồ đếm ngược, Số trang còn phải sửa, Số trang đã sửa */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-[16px] bg-white border-2 border-[#E3E0EE] shadow-sticker-sm">
        {/* Đồng hồ đếm ngược 60s */}
        <CountdownTimer
          durationMs={C.hardDurationMs}
          onTimeUp={handleTimeUp}
          isPaused={isTimeUp}
        />

        {/* Số trang còn phải sửa (chữ to, màu bút đỏ, scale khi có trang mới) */}
        <div className="flex items-center gap-2">
          <span className="text-xs sm:text-sm font-bold text-[#6B6485]">
            {lesson1Texts.hard.remainingLabel}
          </span>
          <span
            className={`
              font-display font-black text-2xl sm:text-3xl text-[#E5484D]
              transition-transform duration-200 inline-block
              ${badgeScale ? 'scale-125' : 'scale-100'}
            `}
          >
            {remainingToFix}
          </span>
          <span className="text-xs font-semibold text-[#6B6485]">
            {lesson1Texts.hard.pagesUnit}
          </span>
        </div>

        {/* Số trang đã sửa (M) */}
        <div className="flex items-center gap-2">
          <span className="text-xs sm:text-sm font-bold text-[#6B6485]">
            {lesson1Texts.hard.fixedLabel}
          </span>
          <span className="font-display font-black text-2xl sm:text-3xl text-[#1FAF5A]">
            {fixedCount}
          </span>
          <span className="text-xs font-semibold text-[#6B6485]">
            {lesson1Texts.hard.pagesUnit}
          </span>
        </div>
      </div>

      {/* 2. Dãy chuỗi các trang sổ (ChainStrip) */}
      <div className="bg-white rounded-[20px] border-2 border-[#E3E0EE] shadow-sticker-sm overflow-hidden">
        <ChainStrip
          genesisCode={genesisCode}
          pages={pages}
          firstInvalidIndex={currentFirstInvalid}
          activePageIndex={
            currentFirstInvalid !== -1 ? currentFirstInvalid : pages.length - 1
          }
          isPageConfirmed={(idx) => {
            if (currentFirstInvalid === -1) return true;
            return idx < currentFirstInvalid;
          }}
          isPageWillRecalc={(idx) => {
            if (currentFirstInvalid === -1) return false;
            return idx > currentFirstInvalid;
          }}
          renderCodeSlot={(idx) => {
            if (idx !== currentFirstInvalid || isTimeUp) return undefined;
            return (
              <div
                className={`w-full flex flex-col items-center ${
                  isInputShaking ? 'animate-shake' : ''
                }`}
              >
                <NumberInput
                  id={codeId}
                  ref={codeInputRef}
                  value={codeInput}
                  showButtons={false}
                  placeholder="0–99"
                  inputClassName="w-full text-base sm:text-lg h-9 sm:h-10 text-[#5B3FD6]"
                  onChange={(v) => setCodeInput(v)}
                  onEnter={handleCheckCode}
                  autoFocus
                />
              </div>
            );
          }}
        />
      </div>

      {/* 3. Bảng gợi ý công thức và nút nộp */}
      {!isTimeUp && currentFirstInvalid !== -1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-[16px] bg-white border-2 border-[#E3E0EE] shadow-sticker-sm">
          <div className="flex items-center gap-3">
            <Mascot mood="suy_nghi" size="md" className="shrink-0" />
            <div className="bg-[#F6F5FB] border border-[#E3E0EE] rounded-[14px] p-3 text-xs sm:text-sm">
              <span className="font-semibold text-[#6B6485] block mb-0.5">
                Công thức tính mã trang {currentFirstInvalid + 1}:
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

      {/* 4. Tổng kết khi hết giờ */}
      {isTimeUp && (
        <div className="p-6 rounded-[20px] bg-white border-2 border-[#E3E0EE] shadow-sticker space-y-6 animate-in fade-in zoom-in-95 duration-300">
          <div className="text-center space-y-2">
            <h3 className="font-display font-black text-2xl text-[#E5484D]">
              {lesson1Texts.hard.timeUpTitle}
            </h3>
            <div className="flex justify-center my-2">
              <Mascot mood="buon" size="lg" />
            </div>
            <p className="text-sm sm:text-base font-semibold text-[#2A2340]">
              {lesson1Texts.hard.mascotSad}
            </p>
          </div>

          {/* Thống kê 3 chỉ số */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-[14px] bg-[#EDFAF1] border border-[#1FAF5A] text-center">
              <span className="text-xs font-bold text-[#6B6485] block mb-1">
                {lesson1Texts.hard.summaryFixed}
              </span>
              <span className="font-display font-black text-2xl text-[#1FAF5A]">
                {fixedCount}
              </span>
            </div>

            <div className="p-4 rounded-[14px] bg-[#EFF6FF] border border-[#2E90E8] text-center">
              <span className="text-xs font-bold text-[#6B6485] block mb-1">
                {lesson1Texts.hard.summaryAdded}
              </span>
              <span className="font-display font-black text-2xl text-[#2E90E8]">
                {networkAddedCountRef.current}
              </span>
            </div>

            <div className="p-4 rounded-[14px] bg-[#FFF0ED] border border-[#E5484D] text-center">
              <span className="text-xs font-bold text-[#6B6485] block mb-1">
                {lesson1Texts.hard.summaryRemaining}
              </span>
              <span className="font-display font-black text-2xl text-[#E5484D]">
                {remainingToFix}
              </span>
            </div>
          </div>

          {/* Câu hỏi suy ngẫm */}
          <div className="pt-2">
            <ReflectionQuestion
              question={lesson1Texts.hard.reflectionQuestion}
              options={lesson1Texts.hard.reflectionOptions}
              explanation={lesson1Texts.hard.reflectionExplanation}
            />
          </div>

          {/* Nút Sang Bài 2 */}
          <div className="flex justify-center pt-2">
            <Button
              variant="primary"
              size="lg"
              onClick={handleCompleteHard}
              className="px-8 shadow-sticker text-base"
            >
              {lesson1Texts.hard.nextLessonButton} →
            </Button>
          </div>
        </div>
      )}

      {/* 5. Toast thông báo khi N về 0 */}
      {showFastToast && (
        <Toast
          message={lesson1Texts.hard.toastFast}
          type="info"
          duration={3000}
          onClose={() => setShowFastToast(false)}
        />
      )}
    </div>
  );
};
