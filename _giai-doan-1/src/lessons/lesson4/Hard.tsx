import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { LevelProps } from '../../components/game/LessonShell';
import { LevelIntro } from '../../components/game/LevelIntro';
import { FeedbackSheet } from '../../components/game/FeedbackSheet';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { CayMerkle } from './CayMerkle';
import {
  generateHard,
  HardTx,
  CellCoord,
} from './logic';
import { sound } from '../../lib/sound';
import { createMulberry32 } from '../../lib/rng';
import { formatNumber } from '../../lib/format';
import {
  TapOrDragContainer,
  DraggableCard,
  DroppableSlot,
} from '../../components/game/TapOrDrag';

export const Hard: React.FC<LevelProps> = ({ onComplete }) => {
  const startTimeRef = useRef<number>(Date.now());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const [hasStarted, setHasStarted] = useState(false);

  // Sinh đề bài 8 giao dịch
  const challenge = useMemo(() => {
    const seed = (Date.now() ^ (Math.random() * 0x100000000)) >>> 0;
    const rng = createMulberry32(seed);
    return generateHard(rng);
  }, []);

  const [txs] = useState<HardTx[]>(challenge.txs);
  const [tree] = useState<number[][]>(challenge.tree);
  const [hidden] = useState<CellCoord[]>(challenge.hidden);
  const [trayPieces] = useState<number[]>(challenge.tray);
  const [distractors] = useState<number[]>(challenge.distractors);

  // Lưu trạng thái các ô bị ẩn: key `slot-${lvl}-${idx}` -> giá trị đang đặt (hoặc null)
  const [placedPieces, setPlacedPieces] = useState<Record<string, number | null>>(() => {
    const init: Record<string, number | null> = {};
    challenge.hidden.forEach((h) => {
      init[`slot-${h.level}-${h.index}`] = null;
    });
    return init;
  });

  // Các ô đã kiểm tra và đúng (bị khóa lại)
  const [lockedSlots, setLockedSlots] = useState<Record<string, boolean>>({});

  // Số lần bấm "Kiểm tra"
  const [checkCount, setCheckCount] = useState<number>(0);
  const [notice, setNotice] = useState<string | null>(null);

  // FeedbackSheet
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

  // Tập hợp các giá trị đang được đặt trên cây
  const usedPiecesSet = useMemo(() => {
    const set = new Set<number>();
    Object.values(placedPieces).forEach((val) => {
      if (val !== null) set.add(val);
    });
    return set;
  }, [placedPieces]);

  // Các mảnh còn lại trong khay
  const availableTrayPieces = useMemo(() => {
    return trayPieces.filter((p) => !usedPiecesSet.has(p));
  }, [trayPieces, usedPiecesSet]);

  // Kiểm tra xem một ô có phải là ô bị ẩn không
  const isHiddenCell = useCallback(
    (lvl: number, idx: number) => {
      return hidden.some((h) => h.level === lvl && h.index === idx);
    },
    [hidden]
  );

  // Xử lý kéo thả / chạm đặt
  const handleDropOrPlace = useCallback(
    (itemId: string, slotId: string) => {
      // itemId dạng "piece-123", lấy giá trị số
      const match = itemId.match(/^piece-(\d+)$/);
      if (!match) return;
      const pieceVal = parseInt(match[1], 10);

      // 1. Thả về khay
      if (slotId === 'tray-zone') {
        setPlacedPieces((prev) => {
          const next = { ...prev };
          for (const key of Object.keys(next)) {
            if (next[key] === pieceVal && !lockedSlots[key]) {
              next[key] = null;
            }
          }
          return next;
        });
        return;
      }

      // 2. Đặt vào một ô trên cây
      if (slotId.startsWith('slot-')) {
        // Nếu ô đã bị khóa đúng thì không cho đổi
        if (lockedSlots[slotId]) return;

        setPlacedPieces((prev) => {
          const next = { ...prev };
          // Nếu mảnh này đang ở ô khác thì xóa khỏi ô cũ
          for (const key of Object.keys(next)) {
            if (next[key] === pieceVal) {
              next[key] = null;
            }
          }
          // Đặt vào ô mới
          next[slotId] = pieceVal;
          return next;
        });
      }
    },
    [lockedSlots]
  );

  // Kiểm tra kết quả
  const handleCheck = useCallback(() => {
    // 1. Kiểm tra xem đã lấp đủ 6 ô chưa
    const unfilled = hidden.filter(
      (h) => placedPieces[`slot-${h.level}-${h.index}`] === null
    );
    if (unfilled.length > 0) {
      sound.playWrong();
      setNotice(`em hãy xếp đủ ${unfilled.length} ô còn trống trước khi kiểm tra!`);
      setTimeout(() => setNotice(null), 3000);
      return;
    }

    const nextCheckCount = checkCount + 1;
    setCheckCount(nextCheckCount);

    const newlyLocked: Record<string, boolean> = { ...lockedSlots };
    const wrongSlotKeys: string[] = [];
    const wrongExplanations: string[] = [];

    let allCorrect = true;

    for (const h of hidden) {
      const slotKey = `slot-${h.level}-${h.index}`;
      if (lockedSlots[slotKey]) continue;

      const placedVal = placedPieces[slotKey];
      const expectedVal = tree[h.level][h.index];

      if (placedVal === expectedVal) {
        newlyLocked[slotKey] = true;
      } else {
        allCorrect = false;
        wrongSlotKeys.push(slotKey);

        // Tìm lý do sai
        if (h.level >= 1) {
          const childLevel = h.level - 1;
          const leftVal = tree[childLevel][h.index * 2];
          const rightVal = tree[childLevel][h.index * 2 + 1];
          const reverseVal = rightVal * 10 + leftVal;

          const isDistractor = placedVal !== null && distractors.includes(placedVal);
          if (placedVal === reverseVal || isDistractor) {
            const nodeLabel =
              h.level === 3
                ? 'Gốc'
                : h.level === 2
                ? `T${h.index * 4 + 1}-${h.index * 4 + 4}`
                : `T${h.index * 2 + 1}${h.index * 2 + 2}`;
            wrongExplanations.push(
              `${nodeLabel}: em đang ghép ngược thứ tự (${rightVal} × 10 + ${leftVal} = ${reverseVal}).`
            );
          } else {
            wrongExplanations.push(
              `Ô tầng ${h.level}: giá trị ${placedVal} chưa chính xác.`
            );
          }
        } else {
          wrongExplanations.push(`Lá T${h.index + 1}: giá trị ${placedVal} chưa đúng.`);
        }
      }
    }

    if (allCorrect) {
      // Đúng hết!
      sound.playCorrect();
      setLockedSlots(newlyLocked);

      // Tính sao: 1 lần -> 3 sao, 2 lần -> 2 sao, >2 lần -> 1 sao
      const stars: 1 | 2 | 3 =
        nextCheckCount === 1 ? 3 : nextCheckCount === 2 ? 2 : 1;
      const timeMs = Date.now() - startTimeRef.current;

      timerRef.current = setTimeout(() => {
        sound.playLevelComplete();
        onComplete({
          stars,
          timeMs,
          learned:
            'Cây Merkle gói nhiều giao dịch thành 1 gốc. Đổi bất kỳ giao dịch nào thì gốc cũng đổi.',
        });
      }, 500);
    } else {
      // Có ô sai: bật các ô sai về khay
      sound.playWrong();
      setLockedSlots(newlyLocked);

      setPlacedPieces((prev) => {
        const next = { ...prev };
        wrongSlotKeys.forEach((key) => {
          next[key] = null;
        });
        return next;
      });

      // Mở FeedbackSheet giải thích chi tiết
      setFeedback({
        isOpen: true,
        isCorrect: false,
        title: 'Có mảnh ghép chưa đúng',
        whatHappened: `Có ${wrongSlotKeys.length} mảnh ghép chưa đúng vị trí và đã được trả về khay.`,
        whyHappened: wrongExplanations.slice(0, 2).join(' '),
        howToFix:
          'Hãy tính cẩn thận từ dưới lên trên và cảnh giác với các mảnh ghép bị đảo ngược thứ tự!',
      });
    }
  }, [hidden, placedPieces, checkCount, lockedSlots, tree, onComplete]);

  // Chuẩn bị ma trận giá trị cho CayMerkle
  const displayTreeValues = useMemo(() => {
    return tree.map((levelArr, lvl) =>
      levelArr.map((val, idx) => {
        if (isHiddenCell(lvl, idx)) {
          const slotKey = `slot-${lvl}-${idx}`;
          return placedPieces[slotKey] ?? null;
        }
        return val;
      })
    );
  }, [tree, isHiddenCell, placedPieces]);

  // Render tùy biến cho ô trên cây
  const renderCustomSlot = useCallback(
    (lvl: number, idx: number, val: number | null) => {
      if (!isHiddenCell(lvl, idx)) {
        return null; // Để mặc định cho ô không bị ẩn
      }

      const slotKey = `slot-${lvl}-${idx}`;
      const isLocked = Boolean(lockedSlots[slotKey]);

      if (isLocked && val !== null) {
        // Ô đã khóa đúng
        return (
          <div className="w-full h-full rounded-[14px] border-2 border-[#1FAF5A] bg-[#F0FDF4] text-[#1FAF5A] flex flex-col items-center justify-center shadow-sticker-sm">
            <span className="text-[10px] font-bold uppercase text-[#1FAF5A] leading-none">
              ✓ đúng
            </span>
            <span className="font-display font-black text-sm sm:text-base leading-none mt-0.5">
              {formatNumber(val)}
            </span>
          </div>
        );
      }

      // Ô nhận thả (DroppableSlot)
      return (
        <DroppableSlot
          id={slotKey}
          placeholder="?"
          className={`w-full h-full !p-0 !min-h-0 !rounded-[14px] flex items-center justify-center transition-all ${
            val !== null
              ? '!border-[#5B3FD6] !bg-[#FAF9FF] shadow-sticker-sm'
              : '!border-dashed !border-[#D0CCE0] !bg-[#F6F5FB]'
          }`}
        >
          {val !== null ? (
            <DraggableCard
              id={`piece-${val}`}
              className="w-full h-full flex flex-col items-center justify-center cursor-grab active:cursor-grabbing p-1"
            >
              <span className="text-[9px] font-bold text-[#5B3FD6] uppercase leading-none">
                đã đặt
              </span>
              <span className="font-display font-black text-sm sm:text-base text-[#5B3FD6] leading-none mt-0.5">
                {formatNumber(val)}
              </span>
            </DraggableCard>
          ) : (
            <span className="font-display font-bold text-sm text-[#A69EBF]">
              ?
            </span>
          )}
        </DroppableSlot>
      );
    },
    [isHiddenCell, lockedSlots]
  );

  if (!hasStarted) {
    return (
      <LevelIntro
        title="Màn 4.3: Ghép mảnh cây 8 giao dịch"
        lessonName="Bài 4: Cây Merkle"
        difficultyLabel="Khó"
        objective="Kéo hoặc chạm đặt 6 mảnh ghép vào đúng vị trí trên cây Merkle 8 giao dịch, cảnh giác trước 2 mảnh ghép bẫy ngược thứ tự."
        tip="Hãy tính xuôi từ tầng lá dưới cùng lên trên. Các ô đúng sẽ khóa lại màu xanh khi bấm Kiểm tra."
        onStart={() => {
          startTimeRef.current = Date.now();
          setHasStarted(true);
        }}
      />
    );
  }

  return (
    <TapOrDragContainer onDropOrPlace={handleDropOrPlace}>
      <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-200">
        {/* Bảng 8 giao dịch */}
        <Card variant="paper" className="p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3 border-b border-[#E3E0EE] pb-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">📋</span>
              <h3 className="font-display font-black text-sm sm:text-base text-[#2A2340]">
                bảng 8 giao dịch gốc
              </h3>
            </div>
            <span className="text-xs text-[#6B6485]">
              bảng tra cứu giá trị ban đầu của 8 bạn
            </span>
          </div>

          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
            {txs.map((tx) => (
              <div
                key={tx.id}
                className="p-2 rounded-[10px] border border-[#E3E0EE] bg-white flex flex-col items-center text-center shadow-xs"
              >
                <span className="font-display font-black text-xs text-[#5B3FD6]">
                  {tx.id}
                </span>
                <span className="text-[11px] text-[#6B6485] font-medium truncate w-full">
                  {tx.name}
                </span>
                <span className="font-display font-bold text-sm text-[#2A2340] mt-0.5 bg-[#F6F5FB] px-1.5 rounded">
                  {tx.value}
                </span>
              </div>
            ))}
          </div>
        </Card>

        {/* Khung hiển thị Cây Merkle 8 giao dịch */}
        <Card className="p-4 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 border-b border-[#E3E0EE] pb-3">
            <div>
              <h3 className="font-display font-black text-lg text-[#2A2340]">
                cây Merkle 8 giao dịch
              </h3>
              <p className="text-xs text-[#6B6485]">
                kéo hoặc chạm mảnh từ khay để điền vào các ô dấu hỏi chấm (?)
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-[#6B6485] font-semibold">
                lượt kiểm tra: <b className="text-[#5B3FD6]">{checkCount}</b>
              </span>
            </div>
          </div>

          {/* Cây Merkle SVG */}
          <CayMerkle
            treeValues={displayTreeValues}
            renderSlot={renderCustomSlot}
            caption="vuốt ngang để xem đủ 8 nhánh nếu xem trên điện thoại"
          />

          {/* Cảnh báo chưa điền đủ */}
          {notice && (
            <div className="p-2.5 rounded-[10px] bg-[#FFF0ED] border border-[#E5484D] text-xs font-bold text-[#E5484D] text-center animate-in fade-in duration-200">
              ⚠️ {notice}
            </div>
          )}

          {/* Nút bấm Kiểm tra */}
          <div className="flex justify-center pt-2">
            <Button
              variant="primary"
              size="lg"
              onClick={handleCheck}
              className="min-w-[200px]"
            >
              Kiểm tra cây Merkle 🔍
            </Button>
          </div>
        </Card>

        {/* Khay mảnh ghép */}
        <Card variant="paper" className="p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-[#E3E0EE] pb-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">🧩</span>
              <h3 className="font-display font-black text-sm sm:text-base text-[#2A2340]">
                khay mảnh ghép ({availableTrayPieces.length} / {trayPieces.length} mảnh)
              </h3>
            </div>
            <span className="text-xs text-[#6B6485]">
              chứa 6 giá trị đúng + 2 mảnh bẫy ghép ngược
            </span>
          </div>

          {/* Vùng thả về khay (DroppableSlot tray-zone) */}
          <DroppableSlot
            id="tray-zone"
            placeholder="thả mảnh về khay tại đây"
            className="!p-3 !bg-[#FAF9FF] !border-dashed !border-[#DDD6FE] min-h-[90px]"
          >
            {availableTrayPieces.length === 0 ? (
              <span className="text-xs text-[#6B6485] italic">
                Tất cả mảnh ghép đã được đặt lên cây. Bấm "Kiểm tra" ở trên!
              </span>
            ) : (
              <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3 w-full">
                {availableTrayPieces.map((pieceVal) => (
                  <DraggableCard
                    key={`piece-${pieceVal}`}
                    id={`piece-${pieceVal}`}
                    className="p-2.5 sm:p-3 rounded-[12px] bg-white border-2 border-[#5B3FD6] text-[#5B3FD6] shadow-sticker-sm flex items-center justify-center min-w-[70px] sm:min-w-[80px]"
                  >
                    <span className="font-display font-extrabold text-base sm:text-lg">
                      {formatNumber(pieceVal)}
                    </span>
                  </DraggableCard>
                ))}
              </div>
            )}
          </DroppableSlot>
        </Card>

        {/* Phản hồi FeedbackSheet */}
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
    </TapOrDragContainer>
  );
};
