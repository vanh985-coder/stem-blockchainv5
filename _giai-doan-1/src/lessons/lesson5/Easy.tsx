import React, { useState, useRef, useEffect, useMemo } from 'react';
import { LevelProps } from '../../components/game/LessonShell';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import {
  TapOrDragContainer,
  DraggableCard,
  DroppableSlot,
} from '../../components/game/TapOrDrag';
import { GAME_CONFIG } from '../../config/gameConfig';
import { createMulberry32, shuffle } from '../../lib/rng';
import { sound } from '../../lib/sound';
import { formatNumber } from '../../lib/format';
import { hackerPercent, checkEasyTask } from './logic';

export const Easy: React.FC<LevelProps> = ({ onComplete }) => {
  const startTimeRef = useRef<number>(Date.now());
  const rngRef = useRef<() => number>(null as unknown as () => number);

  // Khởi tạo shuffle powers 1 lần duy nhất lúc mount bằng PRNG
  const [powers] = useState<number[]>(() => {
    const rng = createMulberry32(Date.now() >>> 0);
    rngRef.current = rng;
    return shuffle(GAME_CONFIG.lesson5.easyPowers, rng);
  });

  // State các node: lưu danh sách id (0..9) đang ở phía Hacker
  const [hackerNodes, setHackerNodes] = useState<number[]>([]);
  // Nhiệm vụ hiện tại: 1, 2, hoặc 3
  const [task, setTask] = useState<1 | 2 | 3>(1);
  // Gợi ý đã bấm hay chưa cho từng nhiệm vụ
  const [hintUsed, setHintUsed] = useState<Record<1 | 2 | 3, boolean>>({
    1: false,
    2: false,
    3: false,
  });
  const [showHint, setShowHint] = useState<boolean>(false);
  // Kết quả kiểm tra của nhiệm vụ hiện tại (chỉ hiện sau khi bấm Kiểm tra)
  const [checkResult, setCheckResult] = useState<{
    tested: boolean;
    ok: boolean;
    reason: string;
  }>({
    tested: false,
    ok: false,
    reason: '',
  });

  // Màn hình kết thúc mức Dễ (thẻ "Rút ra")
  const [isFinished, setIsFinished] = useState(false);

  // Dọn dẹp timer nếu có
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // Tính % Hacker hiện tại để hiển thị trên thanh đo (công cụ đo trực tiếp)
  const currentHackerPercent = useMemo(
    () => hackerPercent(powers, hackerNodes),
    [powers, hackerNodes]
  );

  const defenderNodes = useMemo(() => {
    const hackerSet = new Set(hackerNodes);
    return Array.from({ length: 10 }, (_, i) => i).filter(
      (id) => !hackerSet.has(id)
    );
  }, [hackerNodes]);

  // Kéo hoặc chạm chuyển thẻ qua lại 2 cột
  const handleDropOrPlace = (itemId: string, slotId: string) => {
    // itemId dạng "node-0" .. "node-9"
    const nodeIndex = parseInt(itemId.replace('node-', ''), 10);
    if (isNaN(nodeIndex)) return;

    // Reset kết quả kiểm tra khi người chơi thay đổi nước đi để không lộ đáp án trước
    setCheckResult({ tested: false, ok: false, reason: '' });

    if (slotId === 'hacker') {
      setHackerNodes((prev) => {
        if (prev.includes(nodeIndex)) return prev;
        return [...prev, nodeIndex].sort((a, b) => a - b);
      });
    } else if (slotId === 'defender') {
      setHackerNodes((prev) => prev.filter((id) => id !== nodeIndex));
    }
  };

  const handleResetToDefender = () => {
    sound.playClick();
    setHackerNodes([]);
    setCheckResult({ tested: false, ok: false, reason: '' });
  };

  const handleCheck = () => {
    const res = checkEasyTask(task, powers, hackerNodes);
    setCheckResult({ tested: true, ok: res.ok, reason: res.reason });
    if (res.ok) {
      sound.playCorrect();
    } else {
      sound.playWrong();
    }
  };

  const handleShowHint = () => {
    sound.playClick();
    setHintUsed((prev) => ({ ...prev, [task]: true }));
    setShowHint(true);
  };

  const handleNextTask = () => {
    sound.playClick();
    if (task === 1) {
      setTask(2);
      setCheckResult({ tested: false, ok: false, reason: '' });
      setShowHint(false);
    } else if (task === 2) {
      setTask(3);
      setCheckResult({ tested: false, ok: false, reason: '' });
      setShowHint(false);
    } else {
      // Hoàn thành cả 3 nhiệm vụ
      setIsFinished(true);
    }
  };

  const handleFinalContinue = () => {
    sound.playClick();
    const noHintCount = ([1, 2, 3] as const).filter((t) => !hintUsed[t]).length;
    const finalStars = (noHintCount === 0 ? 1 : noHintCount) as 1 | 2 | 3;
    const timeMs = Date.now() - startTimeRef.current;
    onComplete({
      stars: finalStars,
      timeMs,
      learned: 'Chỉ cần sức mạnh lớn hơn, không cần nhiều node.',
    });
  };

  const taskTitles: Record<1 | 2 | 3, string> = {
    1: 'Nhiệm vụ 1: Giúp Hacker thắng (đạt ít nhất 51%)',
    2: 'Nhiệm vụ 2: Hacker thắng với ÍT node nhất (đúng 3 node)',
    3: 'Nhiệm vụ 3: Hacker có 7 node mà vẫn THUA (dưới 51%)',
  };

  const taskHints: Record<1 | 2 | 3, string> = {
    1: 'Kéo những node có sức mạnh lớn sang trước.',
    2: 'Bắt đầu từ node mạnh nhất, cộng dần tới khi vượt 50%.',
    3: 'Để Hacker có nhiều node mà vẫn yếu, hãy chọn những node nhỏ nhất.',
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5 animate-in fade-in duration-200">
      {/* Tiêu đề & Hướng dẫn nhiệm vụ */}
      <Card variant="paper" className="p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#5B3FD6] bg-[#EDE9FE] px-2.5 py-0.5 rounded-full">
                Mức Dễ: Thử thách 3 bước
              </span>
              <span className="text-xs font-semibold text-[#6B6485]">
                Bước {task}/3
              </span>
            </div>
            <h3 className="font-display font-black text-lg sm:text-xl text-[#2A2340] mt-1">
              {taskTitles[task]}
            </h3>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button variant="secondary" size="sm" onClick={handleShowHint}>
              Xem gợi ý
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleResetToDefender}
            >
              Đưa hết về Người bảo vệ
            </Button>
          </div>
        </div>

        {/* Khung hiển thị gợi ý khi bấm */}
        {showHint && (
          <div className="p-3 bg-[#FFFBEB] rounded-[14px] border border-[#FDE68A] text-xs sm:text-sm text-[#92400E] flex items-center justify-between gap-2 mb-3 animate-in fade-in">
            <div className="flex items-center gap-2">
              <span>💡</span>
              <span className="font-medium">{taskHints[task]}</span>
            </div>
            <button
              type="button"
              onClick={() => setShowHint(false)}
              className="text-[#92400E] font-bold text-xs hover:underline cursor-pointer"
            >
              Đóng
            </button>
          </div>
        )}

        {/* Khối công thức trình bày 3 tầng */}
        <div className="bg-[#FAF9FF] p-3 sm:p-4 rounded-[14px] border border-[#DDD6FE] space-y-2 text-xs sm:text-sm text-[#2A2340]">
          <div className="font-display font-bold text-[#5B3FD6] text-sm sm:text-base">
            (1) % Hacker = tổng sức mạnh node của Hacker ÷ tổng sức mạnh cả mạng × 100%
          </div>
          <div className="text-[#6B6485]">
            (2) Cả mạng có tổng sức mạnh 100, nên sức mạnh của mỗi node cũng chính là phần trăm của nó.
          </div>
          <div className="text-[#6B6485] italic">
            (3) Ví dụ: Hacker giữ 3 node 10, 5, 3 → 18 → 18%.
          </div>
        </div>
      </Card>

      {/* Thanh đo % sức mạnh của Hacker */}
      <Card variant="paper" className="p-4 sm:p-5 space-y-2">
        <div className="flex items-center justify-between text-xs sm:text-sm font-bold text-[#2A2340]">
          <span>Sức mạnh Hacker: {formatNumber(currentHackerPercent)}%</span>
          <span className="text-[#6B6485]">Cần ít nhất 51%</span>
        </div>

        {/* Thanh thước đo trực quan có vạch 50% */}
        <div className="relative w-full h-7 bg-[#E3E0EE] rounded-full overflow-hidden p-1 shadow-inner">
          {/* Vạch đo Hacker (màu cố định but-do không đổi màu trước khi nộp) */}
          <div
            className="h-full bg-[#E5484D] rounded-full transition-all duration-300"
            style={{ width: `${Math.min(100, currentHackerPercent)}%` }}
          />

          {/* Vạch mốc 50% */}
          <div
            className="absolute top-0 bottom-0 w-1 bg-[#2A2340] z-10"
            style={{ left: '50%' }}
            title="Mốc 50%"
          />
        </div>

        <div className="flex justify-between items-center text-[11px] text-[#6B6485]">
          <span>0%</span>
          <span className="font-bold text-[#2A2340]">| 50%</span>
          <span>100%</span>
        </div>

        {/* Chú thích thanh đo theo quy ước */}
        <p className="text-xs text-[#6B6485] font-medium pt-1 text-center">
          Thanh đo: tổng sức mạnh các node đang theo Hacker.
        </p>
      </Card>

      {/* Bàn chơi 2 cột DroppableSlot: Người bảo vệ & Hacker */}
      <TapOrDragContainer onDropOrPlace={handleDropOrPlace}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Cột 1: Người bảo vệ */}
          <Card variant="paper" className="p-4 flex flex-col min-h-[260px]">
            <div className="flex items-center justify-between mb-3 border-b border-[#E3E0EE] pb-2">
              <span className="font-display font-black text-base text-[#2E90E8] flex items-center gap-1.5">
                <span>🛡️</span> Người bảo vệ
              </span>
              <span className="text-xs font-bold text-[#6B6485]">
                {defenderNodes.length} node
              </span>
            </div>

            <DroppableSlot
              id="defender"
              placeholder="Kéo hoặc chạm đặt node về đây"
              className="flex-1 !min-h-[200px] !justify-start !items-start !p-3 !bg-[#F6F5FB]"
            >
              <div className="flex flex-wrap gap-2 w-full">
                {defenderNodes.map((id) => (
                  <DraggableCard
                    key={`node-${id}`}
                    id={`node-${id}`}
                    className="p-2 sm:p-2.5 rounded-[12px] bg-white border-2 border-[#2E90E8] text-[#2E90E8] shadow-sticker-sm flex items-center gap-1.5 cursor-grab"
                  >
                    <span className="font-mono font-bold text-xs sm:text-sm">
                      N{id + 1}
                    </span>
                    <span className="text-xs text-[#6B6485]">·</span>
                    <span className="font-display font-extrabold text-xs sm:text-sm text-[#2A2340]">
                      {powers[id]}
                    </span>
                  </DraggableCard>
                ))}
              </div>
            </DroppableSlot>
          </Card>

          {/* Cột 2: Hacker */}
          <Card variant="paper" className="p-4 flex flex-col min-h-[260px]">
            <div className="flex items-center justify-between mb-3 border-b border-[#E3E0EE] pb-2">
              <span className="font-display font-black text-base text-[#E5484D] flex items-center gap-1.5">
                <span>😈</span> Hacker (Tí)
              </span>
              <span className="text-xs font-bold text-[#6B6485]">
                {hackerNodes.length} node · {currentHackerPercent}%
              </span>
            </div>

            <DroppableSlot
              id="hacker"
              placeholder="Kéo hoặc chạm đặt node theo Hacker"
              className="flex-1 !min-h-[200px] !justify-start !items-start !p-3 !bg-[#FFF5F5] !border-[#FFA8AA]"
            >
              <div className="flex flex-wrap gap-2 w-full">
                {hackerNodes.length === 0 ? (
                  <span className="text-xs text-[#6B6485] italic p-2">
                    Chưa có node nào theo Hacker. Kéo thẻ sang đây!
                  </span>
                ) : (
                  hackerNodes.map((id) => (
                    <DraggableCard
                      key={`node-${id}`}
                      id={`node-${id}`}
                      className="p-2 sm:p-2.5 rounded-[12px] bg-white border-2 border-[#E5484D] text-[#E5484D] shadow-sticker-sm flex items-center gap-1.5 cursor-grab"
                    >
                      <span className="font-mono font-bold text-xs sm:text-sm">
                        N{id + 1}
                      </span>
                      <span className="text-xs text-[#6B6485]">·</span>
                      <span className="font-display font-extrabold text-xs sm:text-sm text-[#2A2340]">
                        {powers[id]}
                      </span>
                    </DraggableCard>
                  ))
                )}
              </div>
            </DroppableSlot>
          </Card>
        </div>
      </TapOrDragContainer>

      {/* Phản hồi sau khi bấm Kiểm tra */}
      {checkResult.tested && (
        <Card
          variant="paper"
          className={`p-4 border-2 ${
            checkResult.ok
              ? 'border-[#1FAF5A] bg-[#F0FDF4]'
              : 'border-[#E5484D] bg-[#FEF2F2]'
          }`}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">{checkResult.ok ? '🎉' : '⚠️'}</span>
              <span
                className={`text-sm font-bold ${
                  checkResult.ok ? 'text-[#1FAF5A]' : 'text-[#E5484D]'
                }`}
              >
                {checkResult.ok
                  ? `Đạt yêu cầu nhiệm vụ ${task}!`
                  : checkResult.reason}
              </span>
            </div>

            {checkResult.ok && (
              <Button variant="primary" size="sm" onClick={handleNextTask}>
                {task < 3 ? 'Nhiệm vụ tiếp theo' : 'Xem kết quả'}
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* Thanh nút hành động chính */}
      {!checkResult.ok && (
        <div className="flex justify-center pt-2">
          <Button variant="primary" size="md" onClick={handleCheck}>
            Kiểm tra
          </Button>
        </div>
      )}

      {/* Màn hình kết thúc: Thẻ Rút ra */}
      {isFinished && (
        <div className="fixed inset-0 z-50 bg-[#2A2340]/60 backdrop-blur-sm flex items-center justify-center p-4">
          <Card
            variant="paper"
            className="p-6 max-w-md w-full text-center space-y-4 shadow-sticker-lg animate-in zoom-in-95 duration-200"
          >
            <div className="text-4xl">🌟</div>
            <h3 className="font-display font-black text-2xl text-[#5B3FD6]">
              Rút ra
            </h3>
            <p className="text-base text-[#2A2340] font-semibold leading-relaxed">
              "Chỉ cần sức mạnh lớn hơn, không cần nhiều node."
            </p>
            <p className="text-xs text-[#6B6485]">
              Dù có ít node nhưng nắm sức mạnh lớn, kẻ tấn công vẫn có thể chiếm hơn 50% mạng!
            </p>
            <div className="pt-2">
              <Button
                variant="primary"
                size="md"
                onClick={handleFinalContinue}
                fullWidth
              >
                Tiếp tục
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
