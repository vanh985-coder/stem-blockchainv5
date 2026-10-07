import React, { useState, useMemo, useRef } from 'react';
import { LevelProps } from '../../components/game/LessonShell';
import { Hearts } from '../../components/ui/Hearts';
import { Button } from '../../components/ui/Button';
import { Avatar, CharacterType } from '../../components/ui/Avatar';
import { TrangSo } from '../../components/ui/TrangSo';
import { MatXich } from '../../components/ui/MatXich';
import { FeedbackSheet } from '../../components/game/FeedbackSheet';
import { generateMedium, explainCheck, MediumRound, MediumPage } from './logic';
import { createMulberry32 } from '../../lib/rng';

const SENDER_NAMES: Record<CharacterType, string> = {
  binh: 'Bình',
  chi: 'Chi',
  ti: 'Tí',
  an: 'An',
  dung: 'Dũng',
  bi: 'Bi',
  em: 'Em',
};

export const Medium: React.FC<LevelProps> = ({ onComplete, onFail }) => {
  const startTimeRef = useRef<number>(Date.now());

  // Khởi tạo đề bài 5 vòng
  const gameData = useMemo(() => {
    const seed = (Date.now() ^ (Math.random() * 0x100000000)) >>> 0;
    const rng = createMulberry32(seed);
    return generateMedium(rng);
  }, []);

  const [hearts, setHearts] = useState<number>(3);
  const [mistakes, setMistakes] = useState<number>(0);
  const [roundIndex, setRoundIndex] = useState<number>(0);

  // Sổ của em lưu lịch sử trang
  const [myLedger, setMyLedger] = useState<MediumPage[]>(() => [...gameData.startPages]);

  // Trạng thái đã bấm trả lời chưa
  const [answered, setAnswered] = useState<boolean>(false);

  // Đồng bộ cuộn ngang giữa 2 hàng trên màn hình nhỏ
  const row1ScrollRef = useRef<HTMLDivElement>(null);
  const row2ScrollRef = useRef<HTMLDivElement>(null);
  const isSyncingScrollRef = useRef<boolean>(false);

  const handleRow1Scroll = () => {
    if (isSyncingScrollRef.current) return;
    if (!row1ScrollRef.current || !row2ScrollRef.current) return;
    isSyncingScrollRef.current = true;
    row2ScrollRef.current.scrollLeft = row1ScrollRef.current.scrollLeft;
    requestAnimationFrame(() => {
      isSyncingScrollRef.current = false;
    });
  };

  const handleRow2Scroll = () => {
    if (isSyncingScrollRef.current) return;
    if (!row1ScrollRef.current || !row2ScrollRef.current) return;
    isSyncingScrollRef.current = true;
    row1ScrollRef.current.scrollLeft = row2ScrollRef.current.scrollLeft;
    requestAnimationFrame(() => {
      isSyncingScrollRef.current = false;
    });
  };

  // FeedbackSheet
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

  const currentRound: MediumRound | undefined = gameData.rounds[roundIndex];
  const myLast3 = myLedger.slice(-3);
  const myLastCode = myLast3[myLast3.length - 1].code;

  const senderName = currentRound ? SENDER_NAMES[currentRound.sender] : '';

  const handleDecision = (userAgreed: boolean) => {
    if (!currentRound || feedback.isOpen) return;

    setAnswered(true);
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

    const checkExplanation = explainCheck(myLastCode, currentRound.proposal);
    let tamperedNote = '';
    if (currentRound.kind === 'tampered' && currentRound.tamperedIndex !== undefined && currentRound.oldContent !== undefined) {
      const newContent = currentRound.senderPages[currentRound.tamperedIndex].content;
      tamperedNote = `Sổ của ${senderName} đã bị sửa ở trang có nội dung ${currentRound.oldContent} → ${newContent}, nên các mã phía sau bị lệch.`;
    }

    const whyText = [tamperedNote, extraNote].filter(Boolean).join(' ');

    setFeedback({
      isOpen: true,
      isCorrect,
      whatHappened: checkExplanation,
      whyHappened: whyText || undefined,
    });
  };

  const handleContinue = () => {
    setFeedback((prev) => ({ ...prev, isOpen: false }));
    setAnswered(false);

    if (row1ScrollRef.current) row1ScrollRef.current.scrollLeft = 0;
    if (row2ScrollRef.current) row2ScrollRef.current.scrollLeft = 0;

    if (hearts <= 0) {
      onFail('Nhớ so sổ bạn gửi với sổ của em trước, rồi tính lại mã trang mới nhé!');
      return;
    }

    // Nếu vòng hợp lệ, sổ của em được cập nhật trang mới
    if (currentRound && currentRound.isValid) {
      setMyLedger((prev) => [...prev, currentRound.proposal]);
    }

    if (roundIndex + 1 < gameData.rounds.length) {
      setRoundIndex((prev) => prev + 1);
    } else {
      const timeMs = Date.now() - startTimeRef.current;
      const stars: 1 | 2 | 3 = mistakes === 0 ? 3 : mistakes === 1 ? 2 : 1;
      onComplete({
        stars,
        timeMs,
        learned: 'Node kiểm cả 2 thứ: sổ có khớp không, và mã có đúng không.',
      });
    }
  };

  if (!currentRound) return null;

  const basePageNum = myLedger.length - myLast3.length + 1;

  return (
    <div className="w-full max-w-6xl mx-auto px-2 sm:px-4 py-4 sm:py-6 flex flex-col gap-5 overflow-x-hidden">
      {/* 1. Header: Vòng và Tim */}
      <div className="flex items-center justify-between bg-white rounded-2xl p-3 sm:p-4 border-2 border-[#E3E0EE] shadow-sticker-sm">
        <div className="flex items-center gap-2">
          <span className="font-display font-black text-sm sm:text-base text-[#2E90E8] bg-[#2E90E8]/10 px-3 py-1 rounded-full">
            Vòng {roundIndex + 1} / {gameData.rounds.length}
          </span>
          <span className="text-xs text-[#6B6485] hidden sm:inline">
            So sánh sổ của em với sổ người gửi trước khi biểu quyết
          </span>
        </div>
        <Hearts current={hearts} max={3} />
      </div>

      {/* 2. So sánh 2 cuốn sổ: Xếp thành 2 hàng rộng hết khung, mỗi hàng 4 cột thẳng hàng */}
      <div className="flex flex-col gap-4 sm:gap-6 w-full">
        {/* Hàng 1: Sổ của em (3 trang cuối + ô trống thứ 4) */}
        <div className="bg-white rounded-2xl p-3.5 sm:p-5 border-2 border-[#E3E0EE] shadow-sticker-sm flex flex-col w-full">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#E3E0EE]">
            <h2 className="font-display font-black text-sm sm:text-base text-[#2A2340] flex items-center gap-2 whitespace-nowrap">
              <span>📖</span> Sổ của em (3 trang cuối)
            </h2>
          </div>

          <div
            ref={row1ScrollRef}
            onScroll={handleRow1Scroll}
            className="w-full overflow-x-auto py-3 sm:overflow-x-visible"
          >
            <div className="grid grid-cols-4 gap-4 sm:gap-6 min-w-[620px] lg:min-w-0 w-full">
              {myLast3.map((page, idx) => {
                const pageNum = basePageNum + idx;

                return (
                  <div key={idx} className="relative flex justify-center items-center w-full">
                    {idx > 0 && (
                      <div className="absolute -left-2 sm:-left-3 -translate-x-1/2 top-1/2 -translate-y-1/2 z-20 pointer-events-none flex items-center justify-center">
                        <MatXich size="sm" status={answered ? 'valid' : 'neutral'} />
                      </div>
                    )}
                    <TrangSo
                      size="xs"
                      pageNumber={pageNum}
                      prevCode={page.prevCode}
                      content={page.content}
                      pageCode={page.code}
                      isConfirmed={answered}
                    />
                  </div>
                );
              })}

              {/* Ô trống thứ 4: trang mới sẽ ở đây */}
              <div className="relative flex justify-center items-center w-full">
                <div className="w-[140px] sm:w-[170px] min-h-[245px] rounded-[14px] border-2 border-dashed border-[#C5BAF8] bg-[#FAF8FF]/60 flex flex-col items-center justify-center p-3 text-center select-none shadow-sticker-sm">
                  <div className="w-9 h-9 rounded-full border-2 border-dashed border-[#A798E8] flex items-center justify-center mb-2 text-[#7C65C1] text-base font-bold">
                    +
                  </div>
                  <span className="text-xs font-semibold text-[#8C82A0] italic leading-tight">
                    trang mới sẽ ở đây
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Hàng 2: Sổ của người gửi (3 trang trước + trang mới đề xuất) */}
        <div className="bg-white rounded-2xl p-3.5 sm:p-5 border-2 border-[#5B3FD6]/30 shadow-sticker flex flex-col w-full">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#E3E0EE]">
            <div className="flex items-center gap-2 min-w-0">
              <Avatar character={currentRound.sender} size="sm" />
              <h2 className="font-display font-black text-sm sm:text-base text-[#2A2340] whitespace-nowrap">
                Sổ của {senderName}
              </h2>
            </div>
            {answered && (
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${
                  currentRound.isValid
                    ? 'bg-[#1FAF5A]/10 text-[#1FAF5A]'
                    : 'bg-[#E5484D]/10 text-[#E5484D]'
                }`}
              >
                {currentRound.isValid ? '✓ Hợp lệ' : '✗ Không hợp lệ'}
              </span>
            )}
          </div>

          <div
            ref={row2ScrollRef}
            onScroll={handleRow2Scroll}
            className="w-full overflow-x-auto py-3 sm:overflow-x-visible"
          >
            <div className="grid grid-cols-4 gap-4 sm:gap-6 min-w-[620px] lg:min-w-0 w-full">
              {/* 3 trang trước của người gửi */}
              {currentRound.senderPages.map((page, idx) => {
                const pageNum = basePageNum + idx;
                const isTamperedPage =
                  answered && currentRound.kind === 'tampered' && currentRound.tamperedIndex === idx;
                const isRecalcPage =
                  answered &&
                  currentRound.kind === 'tampered' &&
                  currentRound.recalcIndices?.includes(idx);

                return (
                  <div key={idx} className="relative flex justify-center items-center w-full">
                    {idx > 0 && (
                      <div className="absolute -left-2 sm:-left-3 -translate-x-1/2 top-1/2 -translate-y-1/2 z-20 pointer-events-none flex items-center justify-center">
                        <MatXich
                          size="sm"
                          status={
                            answered
                              ? isTamperedPage || isRecalcPage
                                ? 'broken'
                                : 'valid'
                              : 'neutral'
                          }
                        />
                      </div>
                    )}
                    <TrangSo
                      size="xs"
                      pageNumber={pageNum}
                      prevCode={page.prevCode}
                      content={page.content}
                      pageCode={page.code}
                      isConfirmed={answered && !isTamperedPage && !isRecalcPage}
                      isInvalid={answered && (isTamperedPage || isRecalcPage)}
                      struckContent={
                        answered && isTamperedPage ? currentRound.oldContent : undefined
                      }
                      invalidBadgeText={
                        answered
                          ? isTamperedPage
                            ? 'Sửa lén'
                            : isRecalcPage
                              ? 'Mã bị lệch'
                              : undefined
                          : undefined
                      }
                    />
                  </div>
                );
              })}

              {/* Vị trí thứ 4: Trang mới được đề xuất */}
              <div className="relative flex justify-center items-center w-full">
                {/* Mắt xích nối tới trang mới */}
                <div className="absolute -left-2 sm:-left-3 -translate-x-1/2 top-1/2 -translate-y-1/2 z-20 pointer-events-none flex items-center justify-center">
                  <MatXich
                    size="sm"
                    status={
                      answered
                        ? currentRound.isValid
                          ? 'valid'
                          : 'broken'
                        : 'neutral'
                    }
                  />
                </div>

                <div className="relative flex justify-center">
                  {/* Nhãn Trang mới */}
                  <div
                    className={`absolute -top-2.5 z-30 px-2.5 py-0.5 rounded-full text-white text-[10px] font-black shadow-sticker-sm whitespace-nowrap ${
                      answered
                        ? currentRound.isValid
                          ? 'bg-[#1FAF5A]'
                          : 'bg-[#E5484D]'
                        : 'bg-[#5B3FD6]'
                    }`}
                  >
                    Trang mới
                  </div>

                  <div
                    className={`rounded-[14px] ${
                      answered
                        ? currentRound.isValid
                          ? 'ring-2 ring-[#1FAF5A]'
                          : 'ring-2 ring-[#E5484D]'
                        : 'ring-2 ring-[#5B3FD6] shadow-sticker'
                    }`}
                  >
                    <TrangSo
                      size="xs"
                      pageNumber={myLedger.length + 1}
                      prevCode={currentRound.proposal.prevCode}
                      content={currentRound.proposal.content}
                      pageCode={currentRound.proposal.code}
                      isConfirmed={answered && currentRound.isValid}
                      isInvalid={answered && !currentRound.isValid}
                      invalidBadgeText={
                        answered
                          ? currentRound.kind === 'wrong-code'
                            ? 'Mã tính sai'
                            : currentRound.kind === 'tampered'
                              ? 'Nối từ sổ sai'
                              : undefined
                          : undefined
                      }
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Vùng hành động và nút biểu quyết */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border-2 border-[#E3E0EE] shadow-sticker-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-xs sm:text-sm text-[#6B6485] text-center sm:text-left">
          <strong className="text-[#2A2340]">Em hãy kiểm tra:</strong>
          <span className="ml-1">
            3 trang trước trong sổ của {senderName} có khớp với sổ của em không? Và mã trang mới có
            tính đúng không?
          </span>
        </div>

        <div className="flex items-center gap-3 shrink-0 w-full sm:w-auto">
          <Button
            variant="primary"
            size="md"
            onClick={() => handleDecision(true)}
            disabled={feedback.isOpen}
            fullWidth
            className="sm:w-36 shadow-sticker"
          >
            ✓ Đồng ý
          </Button>
          <Button
            variant="danger"
            size="md"
            onClick={() => handleDecision(false)}
            disabled={feedback.isOpen}
            fullWidth
            className="sm:w-36 shadow-sticker"
          >
            ✗ Từ chối
          </Button>
        </div>
      </div>

      {/* 4. FeedbackSheet */}
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
