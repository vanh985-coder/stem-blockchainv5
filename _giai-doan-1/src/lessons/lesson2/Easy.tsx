import React, { useState, useMemo, useRef } from 'react';
import { LevelProps } from '../../components/game/LessonShell';
import { Hearts } from '../../components/ui/Hearts';
import { Button } from '../../components/ui/Button';
import { Avatar } from '../../components/ui/Avatar';
import { TrangSo } from '../../components/ui/TrangSo';
import { MatXich } from '../../components/ui/MatXich';
import { FeedbackSheet } from '../../components/game/FeedbackSheet';
import { generateEasy, explainCheck, Proposal, EasyRound } from './logic';
import { createMulberry32 } from '../../lib/rng';
import { formatNumber } from '../../lib/format';

export const Easy: React.FC<LevelProps> = ({ onComplete, onFail }) => {
  const startTimeRef = useRef<number>(Date.now());

  // Khởi tạo dữ liệu màn chơi bằng Mulberry32 seed ngẫu nhiên
  const gameData = useMemo(() => {
    const seed = (Date.now() ^ (Math.random() * 0x100000000)) >>> 0;
    const rng = createMulberry32(seed);
    return generateEasy(rng);
  }, []);

  const [hearts, setHearts] = useState<number>(3);
  const [mistakes, setMistakes] = useState<number>(0);
  const [roundIndex, setRoundIndex] = useState<number>(0);

  // Sổ của em lưu danh sách các trang (bắt đầu bằng 2 trang mẫu)
  const [myLedger, setMyLedger] = useState<
    { prevCode: number; content: number; code: number }[]
  >(() => [...gameData.startPages]);

  // Trạng thái hiển thị giải thích sau khi bấm
  const [feedback, setFeedback] = useState<{
    isOpen: boolean;
    isCorrect: boolean;
    whatHappened: string;
    whyHappened?: string;
  }>({
    isOpen: false,
    isCorrect: true,
    whatHappened: '',
  });

  const currentRound: EasyRound | undefined = gameData.rounds[roundIndex];
  const lastPage = myLedger[myLedger.length - 1];
  const lastCodeX = lastPage ? lastPage.code : gameData.startGenesis;

  const currentProposal: Proposal = useMemo(() => {
    return {
      prevCode: lastCodeX,
      content: currentRound ? currentRound.content : 0,
      code: currentRound ? currentRound.code : 0,
    };
  }, [lastCodeX, currentRound]);

  const handleDecision = (userAgreed: boolean) => {
    if (!currentRound || feedback.isOpen) return;

    const isCorrect = userAgreed === currentRound.isValid;
    let nextHearts = hearts;
    let nextMistakes = mistakes;

    let extraNote = '';
    if (!isCorrect) {
      nextMistakes = mistakes + 1;
      nextHearts = hearts - 1;
      setMistakes(nextMistakes);
      setHearts(nextHearts);
      extraNote = `May là các node khác đã tính đúng và ${currentRound.isValid ? 'đồng ý' : 'từ chối'} trang này.`;
    }

    const explanation = explainCheck(lastCodeX, currentProposal);
    setFeedback({
      isOpen: true,
      isCorrect,
      whatHappened: explanation,
      whyHappened: extraNote || undefined,
    });
  };

  const handleContinue = () => {
    setFeedback((prev) => ({ ...prev, isOpen: false }));

    // Nếu hết tim -> Thất bại
    if (hearts <= 0) {
      onFail('Nhớ tính lại (X × 2 + nội dung) mod 100 rồi so với mã trang.');
      return;
    }

    // Cập nhật sổ: Sổ luôn đi theo quyết định ĐÚNG của mạng lưới
    if (currentRound && currentRound.isValid) {
      setMyLedger((prev) => [
        ...prev,
        {
          prevCode: lastCodeX,
          content: currentRound.content,
          code: currentRound.code,
        },
      ]);
    }

    // Chuyển vòng tiếp theo hoặc Hoàn thành
    if (roundIndex + 1 < gameData.rounds.length) {
      setRoundIndex((prev) => prev + 1);
    } else {
      const timeMs = Date.now() - startTimeRef.current;
      const stars: 1 | 2 | 3 = mistakes === 0 ? 3 : mistakes === 1 ? 2 : 1;
      onComplete({
        stars,
        timeMs,
        learned: 'Mỗi node tự tính lại để kiểm tra, không tin ngay trang người khác gửi.',
      });
    }
  };

  if (!currentRound) return null;

  // Lấy 2 trang cuối của sổ em
  const visiblePages = myLedger.slice(-2);

  return (
    <div className="w-full max-w-3xl mx-auto px-3 sm:px-4 py-4 sm:py-6 flex flex-col gap-6">
      {/* 1. Header: Vòng chơi và Tim */}
      <div className="flex items-center justify-between bg-white rounded-2xl p-3 sm:p-4 border-2 border-[#E3E0EE] shadow-sticker-sm">
        <div className="flex items-center gap-2">
          <span className="font-display font-black text-sm sm:text-base text-[#5B3FD6] bg-[#5B3FD6]/10 px-3 py-1 rounded-full">
            Vòng {roundIndex + 1} / {gameData.rounds.length}
          </span>
          <span className="text-xs text-[#6B6485] hidden sm:inline">
            Duyệt trang mới từ các bạn trong lớp
          </span>
        </div>
        <Hearts current={hearts} max={3} />
      </div>

      {/* 2. "Sổ của em": 2 trang cuối với mã trang cuối X được làm nổi bật */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 border-2 border-[#E3E0EE] shadow-sticker-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display font-black text-base sm:text-lg text-[#2A2340] flex items-center gap-2">
            <span>📖</span> Sổ của em
          </h2>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#5B3FD6]/10 border border-[#5B3FD6]/30 text-xs font-bold text-[#5B3FD6]">
            <span>Mã trang cuối X:</span>
            <span className="font-black text-sm text-[#5B3FD6] underline">
              {formatNumber(lastCodeX)}
            </span>
          </div>
        </div>

        {/* Dãy 2 trang cuối sổ của em */}
        <div className="w-full overflow-x-auto py-2 flex items-center justify-center gap-2 sm:gap-3">
          {visiblePages.map((page, idx) => {
            const pageNum = myLedger.length - visiblePages.length + idx + 1;
            const isLast = idx === visiblePages.length - 1;

            return (
              <React.Fragment key={idx}>
                {idx > 0 && (
                  <div className="shrink-0 flex items-center justify-center">
                    <MatXich size="sm" status="valid" />
                  </div>
                )}
                <div
                  className={`shrink-0 transition-transform ${
                    isLast ? 'ring-2 ring-[#5B3FD6] rounded-[16px] shadow-sticker' : ''
                  }`}
                >
                  <TrangSo
                    size="xs"
                    pageNumber={pageNum}
                    prevCode={page.prevCode}
                    content={page.content}
                    pageCode={page.code}
                    isConfirmed={true}
                  />
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* 3. Thẻ trang mới do bạn gửi */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 border-2 border-[#5B3FD6]/30 shadow-sticker">
        {/* Người gửi */}
        <div className="flex items-center gap-3 mb-4 pb-3 border-b border-[#E3E0EE]">
          <Avatar character={currentRound.sender} size="md" showName />
          <div>
            <div className="text-xs text-[#6B6485]">Người gửi trang mới</div>
            <div className="font-display font-bold text-sm sm:text-base text-[#2A2340]">
              vừa gửi một trang mới đề xuất ghi vào sổ chung!
            </div>
          </div>
        </div>

        {/* Thẻ nội dung đề xuất */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 my-2">
          {/* Thẻ trang đề xuất */}
          <div className="shrink-0">
            <TrangSo
              size="sm"
              pageNumber={myLedger.length + 1}
              prevCode={currentProposal.prevCode}
              content={currentProposal.content}
              pageCode={currentProposal.code}
              isConfirmed={false}
            />
          </div>

          {/* Hộp gợi ý công thức đối chiếu */}
          <div className="flex flex-col gap-3 max-w-sm w-full">
            <div className="p-3.5 rounded-xl bg-[#F6F5FB] border border-[#E3E0EE] text-xs sm:text-sm text-[#2A2340] leading-relaxed">
              <div className="font-bold text-[#5B3FD6] mb-1">🔍 Cách em kiểm tra:</div>
              <div>
                1. Lấy mã trang cuối trong sổ của em: <strong>X = {lastCodeX}</strong>.
              </div>
              <div className="mt-1">
                2. Tính: <strong>({lastCodeX} × 2 + {currentRound.content}) mod 100</strong>.
              </div>
              <div className="mt-1">
                3. So sánh kết quả với mã trang bạn gửi (<strong>{currentRound.code}</strong>).
              </div>
            </div>

            {/* Nút biểu quyết: Đồng ý / Từ chối */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <Button
                variant="primary"
                size="lg"
                onClick={() => handleDecision(true)}
                disabled={feedback.isOpen}
                className="w-full shadow-sticker"
              >
                ✓ Đồng ý
              </Button>
              <Button
                variant="danger"
                size="lg"
                onClick={() => handleDecision(false)}
                disabled={feedback.isOpen}
                className="w-full shadow-sticker"
              >
                ✗ Từ chối
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 4. FeedbackSheet giải thích chi tiết */}
      <FeedbackSheet
        isOpen={feedback.isOpen}
        isCorrect={feedback.isCorrect}
        whatHappened={feedback.whatHappened}
        whyHappened={feedback.whyHappened}
        onContinue={handleContinue}
        continueLabel={hearts <= 0 ? 'Xem kết quả' : 'Vòng tiếp theo'}
      />
    </div>
  );
};
