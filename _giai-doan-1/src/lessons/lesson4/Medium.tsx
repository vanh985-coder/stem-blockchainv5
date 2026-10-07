import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { LevelProps } from '../../components/game/LessonShell';
import { LevelIntro } from '../../components/game/LevelIntro';
import { FeedbackSheet } from '../../components/game/FeedbackSheet';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Avatar } from '../../components/ui/Avatar';
import { Mascot } from '../../components/ui/Mascot';
import { NumberInput } from '../../components/ui/NumberInput';
import { CayMerkle, CellStatus } from './CayMerkle';
import {
  buildTree,
  pathToRoot,
  generateMedium,
  DEFAULT_EASY_TXS,
  EasyTx,
} from './logic';
import { starsFromMistakes } from '../../lib/progressLogic';
import { sound } from '../../lib/sound';
import { GAME_CONFIG } from '../../config/gameConfig';
import { createMulberry32 } from '../../lib/rng';

type MediumPhase = 'phase_a' | 'phase_b' | 'phase_c';

export const Medium: React.FC<LevelProps> = ({ onComplete }) => {
  const startTimeRef = useRef<number>(Date.now());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Dọn dẹp timer khi unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const [hasStarted, setHasStarted] = useState(false);
  const [phase, setPhase] = useState<MediumPhase>('phase_a');

  // ==========================================
  // PHẦN A: XEM CÂY ĐƯỢC TẠO THẾ NÀO (5 BƯỚC)
  // ==========================================
  const partATxs: EasyTx[] = DEFAULT_EASY_TXS;
  const partALeaves = partATxs.map((t) => t.value); // [3, 7, 5, 2]
  const partATree = useMemo(() => buildTree(partALeaves), [partALeaves]); // [[3,7,5,2], [37,52], [422]]
  const [stepA, setStepA] = useState(0); // 0..4

  // Ma trận giá trị cây ở Phần A theo từng bước
  const currentTreeA = useMemo(() => {
    // Tầng 0 luôn hiện
    const lvl0 = [...partALeaves];
    // Tầng 1: T12 hiện từ step 1, T34 hiện từ step 2
    const lvl1: (number | null)[] = [
      stepA >= 1 ? partATree[1][0] : null,
      stepA >= 2 ? partATree[1][1] : null,
    ];
    // Tầng 2: Gốc hiện từ step 3
    const lvl2: (number | null)[] = [stepA >= 3 ? partATree[2][0] : null];
    return [lvl0, lvl1, lvl2];
  }, [stepA, partALeaves, partATree]);

  // Thông tin giải thích từng bước phần A
  const stepAInfo = useMemo(() => {
    switch (stepA) {
      case 0:
        return {
          title: 'bước 1: bắt đầu từ các lá',
          desc: 'hàng dưới cùng là 4 giao dịch ban đầu của các bạn: T1=3, T2=7, T3=5, T4=2.',
          calc: '4 lá ở đáy cây',
        };
      case 1:
        return {
          title: 'bước 2: ghép cặp T1 và T2',
          desc: 'hai giao dịch đầu tiên được ghép lại theo công thức Tab = Ta × 10 + Tb.',
          calc: `T12 = T1 × 10 + T2 = ${partALeaves[0]} × 10 + ${partALeaves[1]} = ${partATree[1][0]}`,
        };
      case 2:
        return {
          title: 'bước 3: ghép cặp T3 và T4',
          desc: 'hai giao dịch tiếp theo cũng được ghép tương tự.',
          calc: `T34 = T3 × 10 + T4 = ${partALeaves[2]} × 10 + ${partALeaves[3]} = ${partATree[1][1]}`,
        };
      case 3:
        return {
          title: 'bước 4: ghép lên gốc Merkle',
          desc: 'hai nhánh T12 và T34 tiếp tục được ghép với nhau để tạo thành đỉnh duy nhất.',
          calc: `gốc = T12 × 10 + T34 = ${partATree[1][0]} × 10 + ${partATree[1][1]} = ${partATree[2][0]}`,
        };
      default:
        return {
          title: 'bước 5: con số đại diện duy nhất',
          desc: 'gốc Merkle 422 gói gọn toàn bộ 4 giao dịch. Chỉ cần ghi con số này vào trang sổ là đảm bảo an toàn!',
          calc: 'đã hoàn thành dựng cây 4 giao dịch',
        };
    }
  }, [stepA, partALeaves, partATree]);

  // ==========================================
  // PHẦN B: TỰ XÂY CÂY
  // ==========================================
  const mediumData = useMemo(() => {
    const seed = (Date.now() ^ (Math.random() * 0x100000000)) >>> 0;
    const rng = createMulberry32(seed);
    return generateMedium(rng);
  }, []);

  const [partBTxs] = useState<EasyTx[]>(mediumData.txs);
  const partBLeaves = useMemo(() => partBTxs.map((t) => t.value), [partBTxs]);
  const partBTree = useMemo(() => buildTree(partBLeaves), [partBLeaves]);

  // Các giá trị đã giải đúng
  const [valT12, setValT12] = useState<number | null>(null);
  const [valT34, setValT34] = useState<number | null>(null);
  const [valRoot, setValRoot] = useState<number | null>(null);

  // Ô đang chọn để nhập: 't12' | 't34' | 'root' | null
  const [selectedSlot, setSelectedSlot] = useState<'t12' | 't34' | 'root' | null>('t12');
  const [inputVal, setInputVal] = useState<number | null>(null);
  const [inputError, setInputError] = useState<string | undefined>();
  const [mistakesB, setMistakesB] = useState<number>(0);
  const [lockedNotice, setLockedNotice] = useState<string | null>(null);

  const isT12Solved = valT12 !== null;
  const isT34Solved = valT34 !== null;
  const isRootSolved = valRoot !== null;
  const isChildrenReady = isT12Solved && isT34Solved;

  // Cập nhật slot chọn tự động khi hoàn thành
  useEffect(() => {
    if (!isT12Solved) {
      setSelectedSlot('t12');
    } else if (!isT34Solved) {
      setSelectedSlot('t34');
    } else if (!isRootSolved) {
      setSelectedSlot('root');
    } else {
      setSelectedSlot(null);
    }
    setInputVal(null);
    setInputError(undefined);
  }, [isT12Solved, isT34Solved, isRootSolved]);

  // Ma trận giá trị cây ở Phần B
  const currentTreeB = useMemo(() => {
    const lvl0 = [...partBLeaves];
    const lvl1 = [valT12, valT34];
    const lvl2 = [valRoot];
    return [lvl0, lvl1, lvl2];
  }, [partBLeaves, valT12, valT34, valRoot]);

  // Ma trận trạng thái cây ở Phần B
  const cellStatusesB = useMemo(() => {
    const s0: CellStatus[] = ['dung', 'dung', 'dung', 'dung'];
    const s1: CellStatus[] = [
      valT12 !== null ? 'dung' : selectedSlot === 't12' ? 'mo-nhap' : 'trong',
      valT34 !== null ? 'dung' : selectedSlot === 't34' ? 'mo-nhap' : 'trong',
    ];
    const s2: CellStatus[] = [
      valRoot !== null
        ? 'dung'
        : selectedSlot === 'root'
        ? 'mo-nhap'
        : isChildrenReady
        ? 'trong'
        : 'trong',
    ];
    return [s0, s1, s2];
  }, [valT12, valT34, valRoot, selectedSlot, isChildrenReady]);

  // Kiểm tra đáp án ô đang chọn ở Phần B
  const handleCheckPartB = useCallback(() => {
    if (!selectedSlot) return;

    if (inputVal === null || inputVal <= 0) {
      sound.playWrong();
      setMistakesB((prev) => prev + 1);
      setInputError('vui lòng nhập một số hợp lệ');
      return;
    }

    setInputError(undefined);

    let expected = 0;
    let hintFormula = '';

    if (selectedSlot === 't12') {
      expected = partBTree[1][0];
      hintFormula = `T12 = T1 × 10 + T2 = ${partBLeaves[0]} × 10 + ${partBLeaves[1]}`;
    } else if (selectedSlot === 't34') {
      expected = partBTree[1][1];
      hintFormula = `T34 = T3 × 10 + T4 = ${partBLeaves[2]} × 10 + ${partBLeaves[3]}`;
    } else if (selectedSlot === 'root') {
      expected = partBTree[2][0];
      hintFormula = `gốc = T12 × 10 + T34 = ${partBTree[1][0]} × 10 + ${partBTree[1][1]}`;
    }

    if (inputVal === expected) {
      sound.playCorrect();
      if (selectedSlot === 't12') setValT12(expected);
      if (selectedSlot === 't34') setValT34(expected);
      if (selectedSlot === 'root') setValRoot(expected);
      setInputVal(null);
    } else {
      sound.playWrong();
      setMistakesB((prev) => prev + 1);
      setFeedback({
        isOpen: true,
        isCorrect: false,
        title: 'Chưa chính xác',
        whatHappened: `Giá trị ${inputVal} chưa đúng cho ô ${selectedSlot.toUpperCase()}.`,
        whyHappened: 'Hãy kiểm tra lại phép nhân 10 và phép cộng từ 2 ô con bên dưới.',
        howToFix: `Công thức đã thế số: ${hintFormula} = ${expected}.`,
      });
    }
  }, [selectedSlot, inputVal, partBTree, partBLeaves]);

  // ==========================================
  // PHẦN C: KHOẢNH KHẮC "À RA THẾ"
  // ==========================================
  const tamperedLeafIndex = mediumData.tamperedLeafIndex; // T3 (index 2)
  const tamperedNewValue = mediumData.tamperedNewValue;
  const tamperedLeaves = useMemo(() => {
    const arr = [...partBLeaves];
    arr[tamperedLeafIndex] = tamperedNewValue;
    return arr;
  }, [partBLeaves, tamperedLeafIndex, tamperedNewValue]);

  const tamperedTree = useMemo(() => buildTree(tamperedLeaves), [tamperedLeaves]);
  const tamperPath = useMemo(() => pathToRoot(tamperedLeafIndex, 2), [tamperedLeafIndex]);

  // Hoạt cảnh lan truyền đổi màu đỏ từ lá lên gốc
  const [tamperStep, setTamperStep] = useState<number>(-1); // -1: chưa đổi, 0: lá, 1: T34, 2: gốc
  const [isTampering, setIsTampering] = useState<boolean>(false);

  const startTamperAnimation = useCallback(() => {
    setIsTampering(true);
    setTamperStep(0);
    sound.playWrong();

    const delay = GAME_CONFIG.lesson4.tamperStepDelayMs || 600;

    // Bước 1: nút con cấp 1 (T34) đổi màu
    timerRef.current = setTimeout(() => {
      setTamperStep(1);
      sound.playWrong();

      // Bước 2: nút gốc đổi màu
      timerRef.current = setTimeout(() => {
        setTamperStep(2);
        sound.playWrong();
        setIsTampering(false);
      }, delay);
    }, delay);
  }, []);

  // Cây hiển thị ở Phần C
  const currentTreeC = useMemo(() => {
    if (tamperStep < 0) {
      return partBTree;
    }
    // Sao chép cây gốc của phần B
    const tree = [
      [...partBTree[0]],
      [...partBTree[1]],
      [...partBTree[2]],
    ];
    if (tamperStep >= 0) {
      tree[0][tamperedLeafIndex] = tamperedNewValue;
    }
    if (tamperStep >= 1) {
      const pIdx = tamperPath[1].index;
      tree[1][pIdx] = tamperedTree[1][pIdx];
    }
    if (tamperStep >= 2) {
      tree[2][0] = tamperedTree[2][0];
    }
    return tree;
  }, [partBTree, tamperedTree, tamperStep, tamperedLeafIndex, tamperedNewValue, tamperPath]);

  // Trạng thái các ô ở Phần C
  const cellStatusesC = useMemo(() => {
    const s0: CellStatus[] = ['dung', 'dung', 'dung', 'dung'];
    const s1: CellStatus[] = ['dung', 'dung'];
    const s2: CellStatus[] = ['dung'];

    if (tamperStep >= 0) s0[tamperedLeafIndex] = 'doi-mau';
    if (tamperStep >= 1) s1[tamperPath[1].index] = 'doi-mau';
    if (tamperStep >= 2) s2[0] = 'doi-mau';

    return [s0, s1, s2];
  }, [tamperStep, tamperedLeafIndex, tamperPath]);

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

  if (!hasStarted) {
    return (
      <LevelIntro
        title="Màn 4.2: Xây cây 4 giao dịch"
        lessonName="Bài 4: Cây Merkle"
        difficultyLabel="Trung bình"
        objective="Xem cách dựng cây Merkle, tự tay tính các ô và hiểu vì sao đổi 1 giao dịch thì gốc đổi ngay."
        tip="Một ô chỉ mở nhập khi cả hai ô con bên dưới đã có kết quả đúng."
        onStart={() => {
          startTimeRef.current = Date.now();
          setHasStarted(true);
        }}
      />
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Tab chuyển đổi trạng thái 3 phần */}
      <div className="flex items-center justify-between bg-white p-2 rounded-[16px] border border-[#E3E0EE] shadow-sticker-sm text-xs font-bold">
        <button
          type="button"
          onClick={() => setPhase('phase_a')}
          className={`flex-1 py-2 px-3 rounded-[10px] transition-all cursor-pointer text-center ${
            phase === 'phase_a'
              ? 'bg-[#5B3FD6] text-white shadow-xs'
              : 'text-[#6B6485] hover:bg-[#F6F5FB]'
          }`}
        >
          1. Xem dựng cây
        </button>
        <button
          type="button"
          onClick={() => setPhase('phase_b')}
          className={`flex-1 py-2 px-3 rounded-[10px] transition-all cursor-pointer text-center ${
            phase === 'phase_b'
              ? 'bg-[#5B3FD6] text-white shadow-xs'
              : 'text-[#6B6485] hover:bg-[#F6F5FB]'
          }`}
        >
          2. Tự xây cây
        </button>
        <button
          type="button"
          onClick={() => {
            if (isRootSolved) setPhase('phase_c');
          }}
          disabled={!isRootSolved}
          className={`flex-1 py-2 px-3 rounded-[10px] transition-all text-center ${
            phase === 'phase_c'
              ? 'bg-[#5B3FD6] text-white shadow-xs cursor-pointer'
              : isRootSolved
              ? 'text-[#6B6485] hover:bg-[#F6F5FB] cursor-pointer'
              : 'text-[#A69EBF] opacity-50 cursor-not-allowed'
          }`}
        >
          3. Khám phá bí mật
        </button>
      </div>

      {/* ========================================================= */}
      {/* PHẦN A: XEM DỰNG CÂY TỪNG BƯỚC */}
      {/* ========================================================= */}
      {phase === 'phase_a' && (
        <Card className="p-6 sm:p-8 space-y-6">
          <div className="text-center space-y-1">
            <span className="text-xs font-bold text-[#5B3FD6] uppercase tracking-wider">
              hoạt cảnh dựng cây (bước {stepA + 1} / 5)
            </span>
            <h3 className="font-display font-black text-xl sm:text-2xl text-[#2A2340]">
              {stepAInfo.title}
            </h3>
            <p className="text-sm text-[#6B6485] max-w-md mx-auto">
              {stepAInfo.desc}
            </p>
          </div>

          {/* Cây Merkle SVG */}
          <CayMerkle
            treeValues={currentTreeA}
            caption="cây Merkle 4 giao dịch dựng từ đáy lên đỉnh"
          />

          {/* Hộp hiển thị phép tính đã thế số */}
          <div className="p-4 rounded-[14px] bg-[#FAF9FF] border border-[#EDE9FE] text-center">
            <div className="text-xs text-[#6B6485] font-semibold mb-1">
              phép tính tương ứng
            </div>
            <div className="font-display font-bold text-base sm:text-lg text-[#5B3FD6]">
              {stepAInfo.calc}
            </div>
          </div>

          {/* Nút điều khiển bước */}
          <div className="flex items-center justify-between pt-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={stepA === 0}
              onClick={() => setStepA((prev) => Math.max(0, prev - 1))}
            >
              Quay lại
            </Button>

            {stepA < 4 ? (
              <Button
                variant="primary"
                size="md"
                onClick={() => {
                  sound.playClick();
                  setStepA((prev) => prev + 1);
                }}
              >
                Tiếp theo 👉
              </Button>
            ) : (
              <Button
                variant="primary"
                size="md"
                onClick={() => {
                  sound.playClick();
                  setPhase('phase_b');
                }}
              >
                Tự em xây cây 👉
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* ========================================================= */}
      {/* PHẦN B: TỰ XÂY CÂY */}
      {/* ========================================================= */}
      {phase === 'phase_b' && (
        <Card className="p-6 sm:p-8 space-y-6">
          <div className="text-center space-y-1">
            <span className="text-xs font-bold text-[#5B3FD6] uppercase tracking-wider">
              thử thách tự xây cây
            </span>
            <h3 className="font-display font-black text-xl sm:text-2xl text-[#2A2340]">
              nhập kết quả từ các nút con
            </h3>
            <p className="text-sm text-[#6B6485] max-w-md mx-auto">
              chọn ô cần tính rồi nhập kết quả. Ô gốc chỉ mở khi cả T12 và T34 đã đúng!
            </p>
          </div>

          {/* Cây Merkle SVG */}
          <CayMerkle
            treeValues={currentTreeB}
            cellStatuses={cellStatusesB}
            onCellClick={(lvl, idx) => {
              if (lvl === 1 && idx === 0) {
                if (!isT12Solved) setSelectedSlot('t12');
              } else if (lvl === 1 && idx === 1) {
                if (!isT34Solved) setSelectedSlot('t34');
              } else if (lvl === 2 && idx === 0) {
                if (!isChildrenReady) {
                  sound.playWrong();
                  setLockedNotice('cần T12 và T34 trước');
                  setTimeout(() => setLockedNotice(null), 2500);
                } else if (!isRootSolved) {
                  setSelectedSlot('root');
                }
              }
            }}
            caption="chạm vào ô để chọn nhập số"
          />

          {/* Thông báo nếu bấm vào ô gốc bị khóa */}
          {lockedNotice && (
            <div className="p-2.5 rounded-[10px] bg-[#FFF0ED] border border-[#E5484D] text-xs font-bold text-[#E5484D] text-center animate-in fade-in duration-200">
              ⚠️ {lockedNotice}
            </div>
          )}

          {/* Khu vực nhập số cho ô đang chọn */}
          {!isRootSolved ? (
            <div className="p-4 rounded-[16px] bg-[#FAF9FF] border border-[#EDE9FE] flex flex-col items-center gap-3">
              <div className="text-xs font-bold text-[#5B3FD6] uppercase">
                đang nhập cho ô: {selectedSlot === 'root' ? 'GỐC' : selectedSlot?.toUpperCase()}
              </div>

              <div className="flex items-center gap-2">
                <NumberInput
                  value={inputVal}
                  onChange={(val) => {
                    setInputVal(val);
                    if (inputError) setInputError(undefined);
                  }}
                  min={1}
                  max={999999}
                  showButtons={false}
                  placeholder="nhập kết quả"
                  error={inputError}
                  onEnter={handleCheckPartB}
                  autoFocus
                  className="w-36 text-center"
                />
                <Button variant="primary" size="md" onClick={handleCheckPartB}>
                  Xác nhận
                </Button>
              </div>

              {selectedSlot === 'root' && !isChildrenReady && (
                <span className="text-xs text-[#E5484D] font-medium">
                  cần T12 và T34 trước
                </span>
              )}
            </div>
          ) : (
            <div className="p-4 rounded-[16px] bg-[#F0FDF4] border-2 border-[#1FAF5A] text-center space-y-3 animate-in zoom-in-95 duration-200">
              <div className="font-display font-black text-lg text-[#1FAF5A]">
                🎉 Xuất sắc! Em đã hoàn thành cây Merkle 4 giao dịch!
              </div>
              <p className="text-xs text-[#2A2340]">
                Hãy tiếp tục để xem điều kỳ diệu xảy ra khi có ai đó lén sửa 1 giao dịch.
              </p>
              <Button
                variant="primary"
                size="md"
                onClick={() => {
                  sound.playClick();
                  setPhase('phase_c');
                }}
              >
                Khám phá khoảnh khắc "À ra thế" 👉
              </Button>
            </div>
          )}
        </Card>
      )}

      {/* ========================================================= */}
      {/* PHẦN C: KHOẢNH KHẮC "À RA THẾ" */}
      {/* ========================================================= */}
      {phase === 'phase_c' && (
        <Card className="p-6 sm:p-8 space-y-6">
          <div className="text-center space-y-1">
            <span className="text-xs font-bold text-[#E5484D] uppercase tracking-wider">
              khoảnh khắc "à ra thế"
            </span>
            <h3 className="font-display font-black text-xl sm:text-2xl text-[#2A2340]">
              chỉ đổi 1 giao dịch, gốc đổi theo!
            </h3>
          </div>

          {/* Diễn biến câu chuyện với Cáo Tí */}
          <div className="p-4 rounded-[16px] bg-[#FFF0ED] border border-[#E5484D]/30 flex items-center gap-3">
            <Avatar character="ti" size="md" showName={false} />
            <div className="text-xs sm:text-sm text-[#2A2340] leading-snug">
              <span className="font-bold text-[#E5484D]">Cáo Tí tinh nghịch: </span>
              "Tớ vừa lén sửa giao dịch T3 từ <b className="text-[#2A2340]">{partBLeaves[tamperedLeafIndex]}</b> thành <b className="text-[#E5484D]">{tamperedNewValue}</b>. Xem có ai nhận ra không nào!"
            </div>
          </div>

          {/* Cây Merkle đổi màu lan truyền */}
          <CayMerkle
            treeValues={currentTreeC}
            cellStatuses={cellStatusesC}
            highlightPath={tamperStep >= 0 ? tamperPath.slice(0, tamperStep + 1) : []}
            caption="các ô màu đỏ lần lượt đổi giá trị từ lá lên gốc"
          />

          {/* Lời giải thích từ Linh vật Bi */}
          {tamperStep >= 2 && (
            <div className="p-4 rounded-[16px] bg-[#FAF9FF] border border-[#EDE9FE] flex items-center gap-3 animate-in fade-in duration-300">
              <Mascot mood="vui" size="sm" />
              <div className="text-xs sm:text-sm text-[#5B3FD6] leading-snug">
                <span className="font-bold">Linh vật Bi: </span>
                "Chỉ đổi 1 giao dịch mà gốc đổi ngay. Node chỉ cần đối chiếu con số gốc ở đầu trang sổ là phát hiện được ngay kẻ gian!"
              </div>
            </div>
          )}

          {/* Nút hành động */}
          <div className="flex justify-center pt-2">
            {tamperStep < 0 ? (
              <Button
                variant="danger"
                size="lg"
                onClick={startTamperAnimation}
                disabled={isTampering}
              >
                Sửa giao dịch & xem gốc đổi 💥
              </Button>
            ) : tamperStep < 2 ? (
              <Button variant="secondary" size="md" disabled>
                Đang lan truyền đổi giá trị...
              </Button>
            ) : (
              <Button
                variant="primary"
                size="lg"
                onClick={() => {
                  const totalMistakes = mistakesB;
                  const stars = starsFromMistakes(totalMistakes);
                  const timeMs = Date.now() - startTimeRef.current;
                  sound.playLevelComplete();
                  onComplete({
                    stars,
                    timeMs,
                    learned:
                      'Đổi một giao dịch thì mọi ô trên đường lên gốc đều đổi, nên gốc đổi theo.',
                  });
                }}
              >
                Hoàn thành màn học 🎉
              </Button>
            )}
          </div>
        </Card>
      )}

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
  );
};
