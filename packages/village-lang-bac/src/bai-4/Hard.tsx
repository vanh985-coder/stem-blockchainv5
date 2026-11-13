import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  Button,
  Card,
  DraggableCard,
  DroppableSlot,
  FeedbackSheet,
  TapOrDragContainer,
  TutorialSpotlight,
  type TutorialStep,
  tutorialTexts,
  fmt,
  sound,
  type StationResult,
  rich,
} from '@so-chung/core';
import { bai4Texts } from '@so-chung/core/content/lessons/bai-4';
import { formatNumber } from '@so-chung/core/lib/format';
import { createMulberry32 } from '@so-chung/core/lib/rng';
import { generateHard, SAMPLE_HARD_CHALLENGE, type CellCoord, type HardTx } from '@so-chung/core/lessons/bai-4/logic';
import { CayMerkle } from './CayMerkle';
import { demoProbe } from '@so-chung/core/demo/probe';
import { TRON } from '@so-chung/core/demo/tron/data';
import { PACING } from '@so-chung/core/demo/pacing';

const T = bai4Texts.tramKho;

export function Hard({ onComplete }: { onComplete: (r: StationResult) => void; onFail?: (tip: string) => void }) {
  const startTimeRef = useRef<number>(Date.now());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // Sinh đề bài 8 giao dịch
  const challenge = useMemo(() => {
    const seed = (Date.now() ^ (Math.random() * 0x100000000)) >>> 0;
    const rng = createMulberry32(seed);
    return TRON ? { ...SAMPLE_HARD_CHALLENGE } : generateHard(rng);
  }, []);

  const [txs] = useState<HardTx[]>(challenge.txs);
  const [tree] = useState<number[][]>(challenge.tree);
  const [hidden] = useState<CellCoord[]>(challenge.hidden);
  const [trayPieces] = useState<number[]>(challenge.tray);
  const [distractors] = useState<number[]>(challenge.distractors);

  // Lưu trạng thái các ô bị ẩn: key `slot-${lvl}-${idx}` -> giá trị đang đặt (hoặc null)
  // Nhịp video (chỉ demo): các ô đầu đã điền đúng sẵn, bot chỉ đặt vài ô cuối
  const initialPlaced = useCallback((): Record<string, number | null> => {
    const init: Record<string, number | null> = {};
    const keep = PACING ? Math.max(0, challenge.hidden.length - PACING.man10.hardPlace) : 0;
    challenge.hidden.forEach((h, i) => {
      init[`slot-${h.level}-${h.index}`] = i < keep ? challenge.tree[h.level][h.index] : null;
    });
    return init;
  }, [challenge]);
  const [placedPieces, setPlacedPieces] = useState<Record<string, number | null>>(initialPlaced);

  // Các ô đã kiểm tra và đúng (bị khóa lại)
  const [lockedSlots, setLockedSlots] = useState<Record<string, boolean>>({});

  // Số lần bấm "Kiểm tra"
  const [checkCount, setCheckCount] = useState<number>(0);
  const [notice, setNotice] = useState<string | null>(null);

  // ==========================================
  // HƯỚNG DẪN FOCUS & LÀM THỬ (P8 - Màn 10 Khó)
  // ==========================================
  const [tutorialActive, setTutorialActive] = useState<boolean>(true);
  const [tutorialStep, setTutorialStep] = useState<number>(0);
  const [isRevisitingTutorial, setIsRevisitingTutorial] = useState<boolean>(false);

  // Lưu trạng thái trước khi mở lại giữa bài
  const savedStateRef = useRef<{
    placedPieces: Record<string, number | null>;
    lockedSlots: Record<string, boolean>;
    checkCount: number;
  } | null>(null);

  const startRealGame = useCallback(() => {
    sound.playClick();
    setTutorialActive(false);
    setIsRevisitingTutorial(false);
    // Reset lại bàn cờ về trạng thái ban đầu sạch
    setPlacedPieces(initialPlaced());
    setLockedSlots({});
    setCheckCount(0);
    setNotice(null);
    startTimeRef.current = Date.now();
  }, [initialPlaced]);

  const handleOpenTutorial = useCallback(() => {
    sound.playClick();
    savedStateRef.current = {
      placedPieces,
      lockedSlots,
      checkCount,
    };
    setIsRevisitingTutorial(true);
    setTutorialActive(true);
    setTutorialStep(0);
  }, [placedPieces, lockedSlots, checkCount]);

  const handleCloseRevisit = useCallback(() => {
    sound.playClick();
    setTutorialActive(false);
    setIsRevisitingTutorial(false);
    if (savedStateRef.current) {
      setPlacedPieces(savedStateRef.current.placedPieces);
      setLockedSlots(savedStateRef.current.lockedSlots);
      setCheckCount(savedStateRef.current.checkCount);
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
      setNotice(fmt(T.emHayXepDuO, { so: unfilled.length }));
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
                ? T.goc
                : h.level === 2
                ? `T${h.index * 4 + 1}-${h.index * 4 + 4}`
                : `T${h.index * 2 + 1}${h.index * 2 + 2}`;
            wrongExplanations.push(
              fmt(T.emDangGhepNguocThu, { nodeLabel, rightVal, leftVal, reverseVal })
            );
          } else {
            wrongExplanations.push(
              fmt(T.oTangGiaTriChua, { level: h.level, placedVal: placedVal ?? '' })
            );
          }
        } else {
          wrongExplanations.push(fmt(T.laGiaTriChuaDung, { so: h.index + 1, placedVal: placedVal ?? '' }));
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
            T.cayMerkleGoiNhieuGiao,
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
        title: T.coManhGhepChuaDung,
        whatHappened: fmt(T.coManhGhepChuaDung2, { so: wrongSlotKeys.length }),
        whyHappened: wrongExplanations.slice(0, 2).join(' '),
        howToFix:
          T.hayTinhCanThanTu,
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
          <div className="w-full h-full rounded-[14px] border-2 border-xanh-la-dam bg-xanh-la/10 text-xanh-la-dam flex flex-col items-center justify-center">
            <span className="text-sm font-bold uppercase text-xanh-la-dam leading-none">{T.dung}</span>
            <span className="font-display font-extrabold text-sm sm:text-base leading-none mt-0.5">
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
              ? '!border-muc-tim !bg-white/60'
              : '!border-dashed !border-nau-go/40 !bg-giay'
          }`}
        >
          {val !== null ? (
            <DraggableCard
              id={`piece-${val}`}
              className="w-full h-full flex flex-col items-center justify-center cursor-grab active:cursor-grabbing p-1"
            >
              <span className="text-sm font-bold text-muc-tim-dam uppercase leading-none">{T.daDat}</span>
              <span className="font-display font-extrabold text-sm sm:text-base text-muc-tim-dam leading-none mt-0.5">
                {formatNumber(val)}
              </span>
            </DraggableCard>
          ) : (
            <span className="font-display font-bold text-sm text-nau-go-dam">
              ?
            </span>
          )}
        </DroppableSlot>
      );
    },
    [isHiddenCell, lockedSlots]
  );

  const tutorialSteps = useMemo<TutorialStep[]>(() => {
    return [
      {
        id: 'intro',
        title: tutorialTexts.man10Kho.tieuDe,
        content: tutorialTexts.man10Kho.intro,
        nextLabel: tutorialTexts.chung.tiep,
      },
      {
        id: 'table',
        targetSelector: '#tutorial-man10kho-table',
        title: tutorialTexts.man10Kho.tieuDe,
        content: tutorialTexts.man10Kho.table,
        nextLabel: tutorialTexts.chung.daHieu,
      },
      {
        id: 'tree',
        targetSelector: '#tutorial-man10kho-tree',
        title: tutorialTexts.man10Kho.tieuDe,
        content: tutorialTexts.man10Kho.place,
        nextLabel: tutorialTexts.chung.tiep,
      },
      {
        id: 'tray',
        targetSelector: '#tutorial-man10kho-tray',
        title: tutorialTexts.man10Kho.tieuDe,
        content: tutorialTexts.man10Kho.tray,
        nextLabel: tutorialTexts.chung.tiep,
      },
      {
        id: 'check',
        targetSelector: '#tutorial-man10kho-check',
        title: tutorialTexts.man10Kho.tieuDe,
        content: tutorialTexts.man10Kho.check,
        interactive: true,
      },
      {
        id: 'result',
        targetSelector: '#tutorial-man10kho-tree',
        title: tutorialTexts.man10Kho.tieuDe,
        content: tutorialTexts.man10Kho.correct,
      },
    ];
  }, []);

  // Bot demo (chỉ bản build VITE_DEMO): ô nào cần mảnh nào, lấy từ cây đúng của đề
  demoProbe('man10', {
    station: 'kho',
    tutorialActive,
    plan: hidden.map((h) => ({ slot: `slot-${h.level}-${h.index}`, piece: `piece-${tree[h.level][h.index]}`, placed: placedPieces[`slot-${h.level}-${h.index}`] === tree[h.level][h.index] })),
  });
  return (
    <TapOrDragContainer onDropOrPlace={handleDropOrPlace}>
      <div className="max-w-5xl mx-auto space-y-2 animate-in fade-in duration-200 md:grid md:grid-cols-[minmax(0,5fr)_minmax(0,8fr)] md:items-start md:gap-x-3 md:gap-y-2 md:space-y-0">
        {/* Bảng 8 giao dịch */}
        <div id="tutorial-man10kho-table" className="md:col-span-2 md:row-start-1">
          <Card variant="paper" className="p-2">
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 mb-1 border-b border-nau-go/30 pb-1">
              <div className="flex items-center gap-2">
                <span className="text-lg">📋</span>
                <h3 className="first-letter:uppercase font-display font-extrabold text-sm sm:text-base text-chu">{T.bang8GiaoDichGoc}</h3>
              </div>
              <div className="flex items-center gap-3">
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
                <span className="text-sm text-nau-go-dam">{T.bangTraCuuGiaTri}</span>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-8">
              {txs.map((tx) => (
                <div
                  key={tx.id}
                  className="px-1 py-0.5 rounded-[10px] border border-nau-go/30 bg-white/70 flex flex-col items-center text-center shadow-xs"
                >
                  <span className="flex w-full items-center justify-between gap-1">
                    <span className="font-display font-extrabold text-sm text-muc-tim-dam">{tx.id}</span>
                    <span className="font-display font-bold text-sm text-chu bg-giay px-1.5 rounded">{tx.value}</span>
                  </span>
                  <span className="text-sm text-nau-go-dam font-medium truncate w-full">
                    {tx.name}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Khung hiển thị Cây Merkle 8 giao dịch */}
        <div id="tutorial-man10kho-tree" className="md:col-start-2 md:row-span-2 md:row-start-2">
          <Card className="p-2 space-y-2">
            <div className="border-b border-nau-go/30 pb-1">
              <div>
                <div className="flex flex-wrap items-baseline gap-x-3">
                  <h3 className="first-letter:uppercase font-display font-extrabold text-lg text-chu">{T.cayMerkle8GiaoDich}</h3>
                  <span className="text-sm text-nau-go-dam font-semibold">{rich(T.luotKiemTra, { checkCount })}</span>
                </div>
                <p className="text-sm text-nau-go-dam">{T.keoHoacChamManhTu}</p>
              </div>
            </div>

            {/* Cây Merkle SVG */}
            <CayMerkle
              compact
              treeValues={displayTreeValues}
              renderSlot={renderCustomSlot}
            />

            {/* Cảnh báo chưa điền đủ */}
            {notice && (
              <div className="p-2.5 rounded-[10px] bg-do-son/10 border border-do-son text-sm font-bold text-do-son-dam text-center animate-in fade-in duration-200">
                ⚠️ {notice}
              </div>
            )}

          </Card>
        </div>

        {/* Nút bấm Kiểm tra: ngay sau cây khi màn hẹp; ở màn rộng nằm dưới khay (cột trái còn chỗ) để cả trạm gọn một màn hình */}
        <div id="tutorial-man10kho-check" className="flex justify-center md:col-start-1 md:row-start-3">
          <Button variant="primary" size="md" data-demo="check" onClick={handleCheck} className="min-w-[200px]">{T.kiemTraCayMerkle}</Button>
        </div>

        {/* Khay mảnh ghép */}
        <div id="tutorial-man10kho-tray" className="md:col-start-1 md:row-start-2">
          <Card variant="paper" className="p-2 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-nau-go/30 pb-1">
              <div className="flex items-center gap-2">
                <span className="text-lg">🧩</span>
                <h3 className="first-letter:uppercase font-display font-extrabold text-sm sm:text-base text-chu">{fmt(T.khayManhGhepManh, { so: availableTrayPieces.length, so2: trayPieces.length })}</h3>
              </div>
              <span className="text-sm text-nau-go-dam">{T.chua6GiaTriDung}</span>
            </div>

            {/* Vùng thả về khay (DroppableSlot tray-zone) */}
            <DroppableSlot
              id="tray-zone"
              placeholder={T.thaManhVeKhayTai}
              className="!p-2 !bg-white/60 !border-dashed !border-muc-tim/30 min-h-[64px]"
            >
              {availableTrayPieces.length === 0 ? (
                <span className="text-sm text-nau-go-dam italic">{T.tatCaManhGhepDa}</span>
              ) : (
                <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3 w-full">
                  {availableTrayPieces.map((pieceVal) => (
                    <DraggableCard
                      key={`piece-${pieceVal}`}
                      id={`piece-${pieceVal}`}
                      className="p-2 rounded-[12px] bg-white/70 border-2 border-muc-tim text-muc-tim-dam flex items-center justify-center min-w-[64px]"
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
        </div>

        {/* Phản hồi FeedbackSheet */}
        <div className="md:col-span-2"><FeedbackSheet
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
        /></div>

        {/* Hướng dẫn Focus Spotlight (P8) */}
        <TutorialSpotlight
          isOpen={tutorialActive}
          steps={tutorialSteps}
          currentStepIndex={tutorialStep}
          onNext={() => setTutorialStep((prev) => Math.min(prev + 1, tutorialSteps.length - 1))}
          onPrev={() => setTutorialStep((prev) => Math.max(0, prev - 1))}
          onSkip={startRealGame}
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
    </TapOrDragContainer>
  );
}
