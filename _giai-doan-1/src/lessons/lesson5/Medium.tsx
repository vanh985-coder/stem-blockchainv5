import React, { useState, useRef, useEffect, useMemo } from 'react';
import { LevelProps } from '../../components/game/LessonShell';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import {
  TapOrDragContainer,
  DraggableCard,
  DroppableSlot,
} from '../../components/game/TapOrDrag';
import { ReflectionQuestion } from '../../components/game/ReflectionQuestion';
import { createMulberry32, shuffle } from '../../lib/rng';
import { sound } from '../../lib/sound';
import { starsFromMistakes } from '../../lib/progressLogic';
import {
  MEDIUM_ATTACKS,
  MEDIUM_CONSEQUENCES,
  MEDIUM_DEFENSES,
  MEDIUM_PAIRS_A,
  MEDIUM_PAIRS_B,
} from './logic';

export const Medium: React.FC<LevelProps> = ({ onComplete }) => {
  const startTimeRef = useRef<number>(Date.now());
  const rngRef = useRef<() => number>(null as unknown as () => number);

  // Khởi tạo PRNG 1 lần lúc mount
  const rng = useMemo(() => {
    const r = createMulberry32(Date.now() >>> 0);
    rngRef.current = r;
    return r;
  }, []);

  // Xáo trộn thứ tự các thẻ đích
  const shuffledConsequences = useMemo(
    () => shuffle(MEDIUM_CONSEQUENCES, rng),
    [rng]
  );
  const shuffledDefenses = useMemo(
    () => shuffle(MEDIUM_DEFENSES, rng),
    [rng]
  );

  // Xáo trộn đáp án câu hỏi Phần C
  const shuffledPartCOptions = useMemo(() => {
    const raw = [
      'Có, vì Tí mạnh nhất mạng',
      'Không, vì Tí không có khóa riêng của An',
      'Chỉ lấy được một nửa',
    ];
    return shuffle(raw, rng);
  }, [rng]);

  // Tiến trình: 'partA' | 'partB' | 'partC' | 'summary'
  const [stage, setStage] = useState<'partA' | 'partB' | 'partC' | 'summary'>(
    'partA'
  );
  const [mistakes, setMistakes] = useState(0);

  // Cặp nối ở Phần A: map từ targetId (1, 2, 3) sang attackId (A, B, C)
  const [pairsA, setPairsA] = useState<Record<string, string>>({});
  // Trạng thái đã khóa (đúng) ở Phần A
  const [lockedA, setLockedA] = useState<Record<string, boolean>>({});
  // Trạng thái vừa kiểm tra bị sai ở Phần A
  const [wrongA, setWrongA] = useState<Record<string, boolean>>({});

  // Cặp nối ở Phần B: map từ targetId (D, E, F) sang attackId (A, B, C)
  const [pairsB, setPairsB] = useState<Record<string, string>>({});
  // Trạng thái đã khóa ở Phần B
  const [lockedB, setLockedB] = useState<Record<string, boolean>>({});
  // Trạng thái vừa kiểm tra bị sai ở Phần B
  const [wrongB, setWrongB] = useState<Record<string, boolean>>({});

  // Phần C
  const [partCAnswered, setPartCAnswered] = useState(false);

  // Dọn dẹp timer
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // Xử lý kéo thả nối thẻ ở Phần A
  const handleDropOrPlaceA = (attackId: string, slotId: string) => {
    // slotId dạng "slot-consequence-1"
    const targetId = slotId.replace('slot-consequence-', '');
    if (lockedA[targetId]) return; // Thẻ đích đã đúng thì khóa

    setWrongA({}); // Xóa màu đỏ khi người chơi thao tác lại

    setPairsA((prev) => {
      const next = { ...prev };
      // Nếu thẻ tấn công này đã gắn ở chỗ khác chưa bị khóa -> gỡ ra
      for (const [k, v] of Object.entries(next)) {
        if (v === attackId && !lockedA[k]) {
          delete next[k];
        }
      }
      next[targetId] = attackId;
      return next;
    });
  };

  // Kiểm tra Phần A
  const handleCheckA = () => {
    let newMistakes = 0;
    const newLocked = { ...lockedA };
    const newWrong: Record<string, boolean> = {};
    const nextPairs = { ...pairsA };

    for (const [targetId, attackId] of Object.entries(pairsA)) {
      if (lockedA[targetId]) continue;
      if (MEDIUM_PAIRS_A[attackId] === targetId) {
        newLocked[targetId] = true;
      } else {
        newMistakes++;
        newWrong[targetId] = true;
        delete nextPairs[targetId]; // Trả thẻ tấn công về để nối lại
      }
    }

    if (newMistakes > 0) {
      sound.playWrong();
      setMistakes((m) => m + newMistakes);
      setWrongA(newWrong);
      setPairsA(nextPairs);
    } else {
      sound.playCorrect();
    }
    setLockedA(newLocked);

    // Kiểm tra đã đủ 3 cặp đúng chưa
    if (Object.keys(newLocked).length === 3) {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setStage('partB');
      }, 700);
    }
  };

  // Xử lý kéo thả nối thẻ ở Phần B
  const handleDropOrPlaceB = (attackId: string, slotId: string) => {
    const targetId = slotId.replace('slot-defense-', '');
    if (lockedB[targetId]) return;

    setWrongB({});

    setPairsB((prev) => {
      const next = { ...prev };
      for (const [k, v] of Object.entries(next)) {
        if (v === attackId && !lockedB[k]) {
          delete next[k];
        }
      }
      next[targetId] = attackId;
      return next;
    });
  };

  // Kiểm tra Phần B
  const handleCheckB = () => {
    let newMistakes = 0;
    const newLocked = { ...lockedB };
    const newWrong: Record<string, boolean> = {};
    const nextPairs = { ...pairsB };

    for (const [targetId, attackId] of Object.entries(pairsB)) {
      if (lockedB[targetId]) continue;
      if (MEDIUM_PAIRS_B[attackId] === targetId) {
        newLocked[targetId] = true;
      } else {
        newMistakes++;
        newWrong[targetId] = true;
        delete nextPairs[targetId];
      }
    }

    if (newMistakes > 0) {
      sound.playWrong();
      setMistakes((m) => m + newMistakes);
      setWrongB(newWrong);
      setPairsB(nextPairs);
    } else {
      sound.playCorrect();
    }
    setLockedB(newLocked);

    if (Object.keys(newLocked).length === 3) {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setStage('partC');
      }, 700);
    }
  };

  // Xử lý Phần C
  const handlePartCAnswer = (idx: number) => {
    const chosen = shuffledPartCOptions[idx];
    const isCorrect = chosen === 'Không, vì Tí không có khóa riêng của An';
    if (!isCorrect) {
      sound.playWrong();
      setMistakes((m) => m + 1);
    } else {
      sound.playCorrect();
    }
    setPartCAnswered(true);
  };

  const handleFinish = () => {
    sound.playClick();
    const finalStars = starsFromMistakes(mistakes);
    const timeMs = Date.now() - startTimeRef.current;
    onComplete({
      stars: finalStars,
      timeMs,
      learned: 'Kiểm soát mạng không đồng nghĩa với sở hữu tài sản trong ví.',
    });
  };

  // Kiểm tra đã đủ 3 cặp chưa để bật nút Kiểm tra
  const isPartAReady = Object.keys(pairsA).length === 3;
  const isPartBReady = Object.keys(pairsB).length === 3;

  // Lấy danh sách thẻ tấn công còn tự do (chưa nối vào slot nào)
  const usedAttacksA = new Set(Object.values(pairsA));
  const usedAttacksB = new Set(Object.values(pairsB));

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* =========================================
          PHẦN A: NỐI HÌNH THỨC TẤN CÔNG VỚI HẬU QUẢ
         ========================================= */}
      {stage === 'partA' && (
        <div className="space-y-5">
          <Card variant="paper" className="p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold text-[#2E90E8] bg-[#E9F3FF] px-2.5 py-0.5 rounded-full">
                Phần 1 / 3
              </span>
              <span className="text-xs text-[#6B6485]">Nối hành vi & hậu quả</span>
            </div>
            <h3 className="font-display font-black text-lg sm:text-xl text-[#2A2340]">
              Tấn công 51% gây ra hậu quả gì?
            </h3>
            <p className="text-xs sm:text-sm text-[#6B6485] mt-1">
              Kéo hoặc chạm thẻ tấn công, rồi chạm thẻ hậu quả tương ứng bên dưới để ghép cặp.
            </p>
          </Card>

          <TapOrDragContainer onDropOrPlace={handleDropOrPlaceA}>
            <div className="space-y-4">
              {/* Thẻ tấn công A, B, C */}
              <div>
                <span className="text-xs font-bold text-[#6B6485] block mb-2">
                  Thẻ tấn công
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {MEDIUM_ATTACKS.map((atk) => {
                    const isAssigned = usedAttacksA.has(atk.id);
                    return (
                      <DraggableCard
                        key={atk.id}
                        id={atk.id}
                        disabled={isAssigned}
                        className={`p-3 rounded-[14px] bg-white border-2 border-[#E5484D] text-[#2A2340] shadow-sticker-sm transition-all ${
                          isAssigned
                            ? 'opacity-40 cursor-not-allowed bg-[#F6F5FB]'
                            : 'cursor-grab hover:border-[#B8363A]'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="w-6 h-6 rounded-full bg-[#E5484D] text-white flex items-center justify-center font-display font-bold text-xs shrink-0">
                            {atk.id}
                          </span>
                          <span className="font-display font-bold text-sm text-[#E5484D]">
                            {atk.title}
                          </span>
                        </div>
                        <p className="text-xs text-[#6B6485] leading-relaxed">
                          {atk.desc}
                        </p>
                      </DraggableCard>
                    );
                  })}
                </div>
              </div>

              {/* Thẻ đích: Hậu quả 1, 2, 3 */}
              <div>
                <span className="text-xs font-bold text-[#6B6485] block mb-2">
                  Hậu quả xảy ra
                </span>
                <div className="space-y-2.5">
                  {shuffledConsequences.map((csq) => {
                    const assignedAtkId = pairsA[csq.id];
                    const isLocked = lockedA[csq.id];
                    const isWrong = wrongA[csq.id];

                    return (
                      <DroppableSlot
                        key={csq.id}
                        id={`slot-consequence-${csq.id}`}
                        placeholder="Chạm hoặc thả thẻ tấn công vào đây để ghép"
                        className={`!justify-start !p-3.5 !rounded-[16px] transition-all ${
                          isLocked
                            ? '!border-[#1FAF5A] !bg-[#F0FDF4] !border-solid'
                            : isWrong
                              ? '!border-[#E5484D] !bg-[#FEF2F2] !border-solid animate-shake'
                              : assignedAtkId
                                ? '!border-[#E5484D] !bg-[#FFF5F5] !border-solid'
                                : '!border-[#D0CCE0] !bg-white'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3 w-full">
                          <div className="flex-1">
                            <p className="text-xs sm:text-sm text-[#2A2340] font-semibold leading-relaxed">
                              {csq.text}
                            </p>
                          </div>

                          {/* Huy hiệu hiển thị thẻ tấn công đã nối */}
                          {assignedAtkId && (
                            <div
                              className={`px-3 py-1 rounded-full font-display font-bold text-xs shrink-0 flex items-center gap-1.5 ${
                                isLocked
                                  ? 'bg-[#1FAF5A] text-white'
                                  : 'bg-[#E5484D] text-white shadow-sticker-sm'
                              }`}
                            >
                              <span>Thẻ {assignedAtkId}</span>
                              {isLocked && <span>✓</span>}
                            </div>
                          )}
                        </div>
                      </DroppableSlot>
                    );
                  })}
                </div>
              </div>
            </div>
          </TapOrDragContainer>

          <div className="flex justify-center pt-2">
            <Button
              variant="primary"
              size="md"
              disabled={!isPartAReady}
              onClick={handleCheckA}
            >
              Kiểm tra
            </Button>
          </div>
        </div>
      )}

      {/* =========================================
          PHẦN B: NỐI HÌNH THỨC TẤN CÔNG VỚI PHÒNG THỦ
         ========================================= */}
      {stage === 'partB' && (
        <div className="space-y-5 animate-in fade-in duration-200">
          <Card variant="paper" className="p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold text-[#5B3FD6] bg-[#EDE9FE] px-2.5 py-0.5 rounded-full">
                Phần 2 / 3
              </span>
              <span className="text-xs text-[#6B6485]">Nối hành vi & phòng thủ</span>
            </div>
            <h3 className="font-display font-black text-lg sm:text-xl text-[#2A2340]">
              Làm sao để phòng thủ trước các chiêu thức này?
            </h3>
            <p className="text-xs sm:text-sm text-[#6B6485] mt-1">
              Kéo hoặc chạm thẻ tấn công, rồi ghép với biện pháp phòng thủ tương ứng.
            </p>
          </Card>

          <TapOrDragContainer onDropOrPlace={handleDropOrPlaceB}>
            <div className="space-y-4">
              {/* Thẻ tấn công A, B, C */}
              <div>
                <span className="text-xs font-bold text-[#6B6485] block mb-2">
                  Thẻ tấn công
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {MEDIUM_ATTACKS.map((atk) => {
                    const isAssigned = usedAttacksB.has(atk.id);
                    return (
                      <DraggableCard
                        key={atk.id}
                        id={atk.id}
                        disabled={isAssigned}
                        className={`p-3 rounded-[14px] bg-white border-2 border-[#E5484D] text-[#2A2340] shadow-sticker-sm transition-all ${
                          isAssigned
                            ? 'opacity-40 cursor-not-allowed bg-[#F6F5FB]'
                            : 'cursor-grab hover:border-[#B8363A]'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="w-6 h-6 rounded-full bg-[#E5484D] text-white flex items-center justify-center font-display font-bold text-xs shrink-0">
                            {atk.id}
                          </span>
                          <span className="font-display font-bold text-sm text-[#E5484D]">
                            {atk.title}
                          </span>
                        </div>
                        <p className="text-xs text-[#6B6485] leading-relaxed">
                          {atk.desc}
                        </p>
                      </DraggableCard>
                    );
                  })}
                </div>
              </div>

              {/* Thẻ đích: Phòng thủ D, E, F */}
              <div>
                <span className="text-xs font-bold text-[#6B6485] block mb-2">
                  Biện pháp phòng thủ
                </span>
                <div className="space-y-2.5">
                  {shuffledDefenses.map((def) => {
                    const assignedAtkId = pairsB[def.id];
                    const isLocked = lockedB[def.id];
                    const isWrong = wrongB[def.id];

                    return (
                      <DroppableSlot
                        key={def.id}
                        id={`slot-defense-${def.id}`}
                        placeholder="Chạm hoặc thả thẻ tấn công vào đây để ghép"
                        className={`!justify-start !p-3.5 !rounded-[16px] transition-all ${
                          isLocked
                            ? '!border-[#1FAF5A] !bg-[#F0FDF4] !border-solid'
                            : isWrong
                              ? '!border-[#E5484D] !bg-[#FEF2F2] !border-solid animate-shake'
                              : assignedAtkId
                                ? '!border-[#5B3FD6] !bg-[#FAF9FF] !border-solid'
                                : '!border-[#D0CCE0] !bg-white'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3 w-full">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-display font-black text-sm text-[#5B3FD6]">
                                {def.id}. {def.title}
                              </span>
                            </div>
                            <p className="text-xs text-[#6B6485] leading-relaxed">
                              {def.desc}
                            </p>
                          </div>

                          {/* Huy hiệu hiển thị thẻ tấn công đã nối */}
                          {assignedAtkId && (
                            <div
                              className={`px-3 py-1 rounded-full font-display font-bold text-xs shrink-0 flex items-center gap-1.5 ${
                                isLocked
                                  ? 'bg-[#1FAF5A] text-white'
                                  : 'bg-[#5B3FD6] text-white shadow-sticker-sm'
                              }`}
                            >
                              <span>Thẻ {assignedAtkId}</span>
                              {isLocked && <span>✓</span>}
                            </div>
                          )}
                        </div>
                      </DroppableSlot>
                    );
                  })}
                </div>
              </div>
            </div>
          </TapOrDragContainer>

          <div className="flex justify-center pt-2">
            <Button
              variant="primary"
              size="md"
              disabled={!isPartBReady}
              onClick={handleCheckB}
            >
              Kiểm tra
            </Button>
          </div>
        </div>
      )}

      {/* =========================================
          PHẦN C: CÂU HỎI SUY NGẪM & TỔNG KẾT
         ========================================= */}
      {stage === 'partC' && (
        <div className="space-y-5 animate-in fade-in duration-200">
          <ReflectionQuestion
            question="Tí nắm 51% sức mạnh mạng. Tí có lấy được tiền trong ví của An không?"
            options={shuffledPartCOptions}
            explanation="Tấn công 51% chỉ có thể ảnh hưởng đến việc xác nhận và thứ tự các giao dịch (như chi tiêu hai lần hoặc chặn giao dịch). Để chuyển tiền trong ví của An, Tí bắt buộc phải có chữ ký tạo từ khóa riêng của An. Không có khóa riêng, Tí tuyệt đối không thể tạo giao dịch hợp lệ!"
            onAnswered={handlePartCAnswer}
          />

          {partCAnswered && (
            <Card
              variant="paper"
              className="p-5 border-2 border-[#5B3FD6]/30 bg-[#FAF9FF] space-y-3 animate-in fade-in"
            >
              <div className="text-xs font-bold text-[#5B3FD6] flex items-center gap-1.5">
                <span>💡</span> Em có biết?
              </div>
              <p className="text-xs sm:text-sm text-[#2A2340] font-semibold leading-relaxed">
                Tấn công 51% không có nghĩa là hacker "hack được ví của mọi người". Nó chủ yếu cho kẻ tấn công ảnh hưởng rất lớn tới việc xác nhận và thứ tự giao dịch. Kiểm soát mạng không đồng nghĩa với sở hữu tài sản trong ví.
              </p>
              <div className="pt-2 flex justify-center">
                <Button variant="primary" size="md" onClick={handleFinish}>
                  Tiếp tục
                </Button>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};
