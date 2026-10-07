import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { LevelProps } from '../../components/game/LessonShell';
import { LevelIntro } from '../../components/game/LevelIntro';
import { FeedbackSheet } from '../../components/game/FeedbackSheet';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Avatar } from '../../components/ui/Avatar';
import { NumberInput } from '../../components/ui/NumberInput';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { generateEasy, combine, EasyTx } from './logic';
import { starsFromMistakes } from '../../lib/progressLogic';
import { sound } from '../../lib/sound';
import { GAME_CONFIG } from '../../config/gameConfig';
import { createMulberry32 } from '../../lib/rng';

export const Easy: React.FC<LevelProps> = ({ onComplete }) => {
  const startTimeRef = useRef<number>(Date.now());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Dọn dẹp timer khi unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // Khởi tạo đề bài
  const [hasStarted, setHasStarted] = useState(false);
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

    // 1. Kiểm tra ô trống hoặc ngoài khoảng
    if (inputValue === null || inputValue < 10 || inputValue > 99) {
      sound.playWrong();
      setMistakes((prev) => prev + 1);
      setInputError('vui lòng nhập một số từ 10 đến 99');
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
              learned: 'Ghép hai giao dịch thì thứ tự quan trọng: T12 khác T21.',
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
          title: 'Bẫy thứ tự!',
          whatHappened: `Em đã ghép ngược thứ tự: ${inputValue} là kết quả của T12!`,
          whyHappened: `T21 = T2 × 10 + T1 = ${txA.value} × 10 + ${txB.value} = ${expectedValue}, khác T12 = ${txB.value * 10 + txA.value}.`,
          howToFix: `Lấy số của giao dịch đứng trước (T2 = ${txA.value}) nhân 10, rồi cộng giao dịch đứng sau (T1 = ${txB.value}).`,
        });
      } else {
        // Gợi ý ba tầng chuẩn mực
        setFeedback({
          isOpen: true,
          isCorrect: false,
          title: 'Chưa chính xác',
          whatHappened: `Kết quả ${inputValue} chưa đúng cho phép ghép ${pairLabel}.`,
          whyHappened: `Công thức ghép cặp tổng quát: T_ab = T_a × 10 + T_b. Lấy giá trị giao dịch đầu nhân 10 rồi cộng giao dịch thứ hai.`,
          howToFix: `Với ${pairLabel}: ${txA.id} × 10 + ${txB.id} = ${txA.value} × 10 + ${txB.value} = ${expectedValue}.`,
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
  ]);

  if (!hasStarted) {
    return (
      <LevelIntro
        title="Màn 4.1: Làm quen ghép cặp"
        lessonName="Bài 4: Cây Merkle"
        difficultyLabel="Dễ"
        objective="Học cách ghép từng cặp giao dịch thành một giá trị mới và chú ý thứ tự ghép."
        tip="Công thức ghép: T_ab = T_a × 10 + T_b. Đứng trước nhân 10, đứng sau cộng vào!"
        onStart={() => {
          startTimeRef.current = Date.now();
          setHasStarted(true);
        }}
      />
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-200">
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-[#6B6485] font-semibold">
          <span>tiến độ ghép cặp</span>
          <span>câu hỏi {currentIndex + 1} / {questions.length}</span>
        </div>
        <ProgressBar
          current={currentIndex + 1}
          max={questions.length}
        />
      </div>

      {/* Bảng giao dịch tra cứu */}
      <Card variant="paper" className="p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3 border-b border-[#E3E0EE] pb-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">📋</span>
            <h3 className="font-display font-black text-sm sm:text-base text-[#2A2340]">
              bảng giao dịch
            </h3>
          </div>
          <span className="text-xs text-[#6B6485]">
            bảng tra cứu giá trị từng giao dịch
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {txs.map((tx) => (
            <div
              key={tx.id}
              className={`p-2.5 rounded-[12px] border-2 transition-all flex flex-col items-center text-center ${
                tx.id === txA.id || tx.id === txB.id
                  ? 'border-[#5B3FD6] bg-[#FAF9FF] shadow-sticker-sm'
                  : 'border-[#E3E0EE] bg-white opacity-80'
              }`}
            >
              <div className="flex items-center gap-1 mb-1">
                <Avatar character={tx.character} size="sm" showName={false} />
                <span className="font-display font-black text-xs text-[#5B3FD6]">
                  {tx.id}
                </span>
              </div>
              <div className="text-[11px] text-[#6B6485] font-medium truncate w-full">
                {tx.name} {tx.item}
              </div>
              <div className="font-display font-black text-base text-[#2A2340] mt-1 bg-[#F6F5FB] px-2 py-0.5 rounded-[6px]">
                {tx.value}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Khu vực ghép thẻ */}
      <Card className="p-6 sm:p-8 flex flex-col items-center text-center relative overflow-hidden">
        <div className="text-xs font-bold text-[#5B3FD6] uppercase tracking-wider mb-2">
          câu {currentIndex + 1}: ghép cặp {pairLabel}
        </div>
        <p className="text-sm text-[#6B6485] mb-6">
          hãy ghép giá trị của hai giao dịch bên dưới theo công thức: <code className="bg-[#FAF9FF] text-[#5B3FD6] px-1.5 py-0.5 rounded border border-[#EDE9FE] font-mono">T_ab = T_a × 10 + T_b</code>
        </p>

        {/* Khung hiển thị hai thẻ trượt vào nhau */}
        <div className="min-h-[120px] flex items-center justify-center relative w-full mb-6">
          {mergedCard ? (
            <div className="animate-in zoom-in-95 duration-200 p-4 rounded-[16px] border-2 border-[#1FAF5A] bg-[#F0FDF4] shadow-sticker flex flex-col items-center min-w-[140px]">
              <span className="text-xs font-bold text-[#1FAF5A] uppercase">
                thẻ gộp {mergedCard.label}
              </span>
              <span className="font-display font-black text-3xl text-[#1FAF5A] mt-1">
                {mergedCard.value}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-3 sm:gap-6 relative">
              {/* Thẻ A (bên trái) */}
              <div
                className={`p-3.5 sm:p-4 rounded-[16px] border-2 border-[#5B3FD6] bg-[#FAF9FF] shadow-sticker-sm flex flex-col items-center min-w-[110px] sm:min-w-[130px] transition-all duration-400 ${
                  isMerging ? 'translate-x-[45px] opacity-0 scale-90' : ''
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <Avatar character={txA.character} size="sm" showName={false} />
                  <span className="font-display font-black text-sm text-[#5B3FD6]">
                    {txA.id}
                  </span>
                </div>
                <div className="text-xs text-[#6B6485] truncate max-w-[100px]">
                  {txA.name}
                </div>
                <div className="font-display font-black text-2xl text-[#2A2340] mt-1">
                  {txA.value}
                </div>
              </div>

              {/* Dấu ghép */}
              <div
                className={`font-display font-black text-xl text-[#A69EBF] transition-opacity duration-300 ${
                  isMerging ? 'opacity-0' : 'opacity-100'
                }`}
              >
                +
              </div>

              {/* Thẻ B (bên phải) */}
              <div
                className={`p-3.5 sm:p-4 rounded-[16px] border-2 border-[#5B3FD6] bg-[#FAF9FF] shadow-sticker-sm flex flex-col items-center min-w-[110px] sm:min-w-[130px] transition-all duration-400 ${
                  isMerging ? '-translate-x-[45px] opacity-0 scale-90' : ''
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <Avatar character={txB.character} size="sm" showName={false} />
                  <span className="font-display font-black text-sm text-[#5B3FD6]">
                    {txB.id}
                  </span>
                </div>
                <div className="text-xs text-[#6B6485] truncate max-w-[100px]">
                  {txB.name}
                </div>
                <div className="font-display font-black text-2xl text-[#2A2340] mt-1">
                  {txB.value}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Ô nhập số và nút nộp */}
        <div className="flex flex-col items-center gap-3 w-full max-w-xs">
          <div className="flex items-center justify-center gap-2 w-full">
            <span className="font-display font-bold text-sm text-[#6B6485]">
              {pairLabel} =
            </span>
            <NumberInput
              value={inputValue}
              onChange={(val) => {
                setInputValue(val);
                if (inputError) setInputError(undefined);
              }}
              min={10}
              max={99}
              showButtons={false}
              placeholder="??"
              error={inputError}
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
          >
            ghép giao dịch
          </Button>
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
        continueLabel="Thử lại"
      />
    </div>
  );
};
