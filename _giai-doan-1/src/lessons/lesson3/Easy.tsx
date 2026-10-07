import React, { useState, useRef, useEffect, useMemo } from 'react';
import { LevelProps } from '../../components/game/LessonShell';
import { useProgress } from '../../app/ProgressContext';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { sound } from '../../lib/sound';
import { createMulberry32 } from '../../lib/rng';
import { GAME_CONFIG } from '../../config/gameConfig';
import {
  TapOrDragContainer,
  DraggableCard,
  DroppableSlot,
  useTapOrDrag,
} from '../../components/game/TapOrDrag';
import {
  DIRECTORY_KEYS,
  signUnique,
  Signature,
} from './logic';
import { DanhBa } from './DanhBa';
import { TheGiaoDich } from './TheGiaoDich';

// 5 bạn trong Phần 2
const FRIENDS_PART2 = [
  { id: 'giang', name: 'Giang', letter: 'G', color: '#2E90E8', priv: 3, expectedPub: 10 },
  { id: 'hoa',   name: 'Hoa',   letter: 'H', color: '#EC4899', priv: 5, expectedPub: 20 },
  { id: 'khang', name: 'Khang', letter: 'K', color: '#1FAF5A', priv: 6, expectedPub: 8  },
  { id: 'linh',  name: 'Linh',  letter: 'L', color: '#D9A000', priv: 7, expectedPub: 17 },
  { id: 'minh',  name: 'Minh',  letter: 'M', color: '#5B3FD6', priv: 9, expectedPub: 11 },
];

/** Ô nhận thẻ của Máy xác minh trong Phần 1 */
const MachinePart1Slot: React.FC<{
  step: string;
  onScanMy: () => void;
  onScanTi: () => void;
}> = ({ step, onScanMy, onScanTi }) => {
  const { selectedId } = useTapOrDrag();

  return (
    <DroppableSlot
      id="slot-machine-easy"
      placeholder="Kéo thẻ giao dịch vào đây"
      className="mt-3.5 p-3.5 !bg-[#1C182B] !border-white/20 rounded-[16px] min-h-[76px]"
    >
      <div className="flex flex-col items-center justify-center gap-2 w-full">
        {step === 'signed' && (
          <Button
            variant="primary"
            size="md"
            onClick={(e) => {
              e.stopPropagation();
              onScanMy();
            }}
          >
            ⚙️ Thả vào máy xác minh
          </Button>
        )}
        {step === 'ti_fraud_ready' && (
          <Button
            variant="danger"
            size="md"
            onClick={(e) => {
              e.stopPropagation();
              onScanTi();
            }}
          >
            ⚙️ Cho thẻ của Tí vào máy
          </Button>
        )}
        {(step === 'signed' || step === 'ti_fraud_ready') && (
          <span className="text-xs text-[#A69EBF]">
            {selectedId ? 'Chạm để đặt thẻ vào máy' : 'Hoặc kéo thả thẻ vào máy'}
          </span>
        )}
      </div>
    </DroppableSlot>
  );
};

/** Ô nhận thẻ của từng bạn trong Phần 2 */
const FriendSlotDroppable: React.FC<{
  friend: typeof FRIENDS_PART2[0];
  assigned: number | null;
  isLocked: boolean;
  onRemove: (friendId: string) => void;
}> = ({ friend, assigned, isLocked, onRemove }) => {
  const { selectedId } = useTapOrDrag();

  const handleChildClick = (e: React.MouseEvent) => {
    if (selectedId) {
      // Đang có thẻ được chọn qua chạm -> để sự kiện nổi bọt lên DroppableSlot đặt thẻ
      return;
    }
    if (!isLocked && assigned !== null) {
      e.stopPropagation();
      onRemove(friend.id);
    }
  };

  return (
    <DroppableSlot
      id={`slot-friend-${friend.id}`}
      placeholder="?"
      className={`w-14 h-12 rounded-[14px] border-2 flex items-center justify-center font-mono font-black text-base shrink-0 transition-all ${
        isLocked
          ? '!bg-[#1FAF5A] !text-white !border-[#1FAF5A]'
          : assigned !== null
          ? '!bg-[#5B3FD6] !text-white !border-[#5B3FD6] hover:brightness-110 cursor-pointer shadow-xs'
          : 'border-dashed border-[#D0CCE0] bg-[#FAFAFC] text-[#A69EBF]'
      }`}
    >
      {assigned !== null ? (
        <div
          onClick={handleChildClick}
          className="w-full h-full flex items-center justify-center select-none"
          title={isLocked ? undefined : 'Chạm để gỡ thẻ về khay'}
        >
          {assigned}
        </div>
      ) : null}
    </DroppableSlot>
  );
};

export const Easy: React.FC<LevelProps> = ({ onComplete }) => {
  const { progress } = useProgress();
  const myName = progress?.userName || 'Em';

  // Quản lý thời gian & seed
  const startTimeRef = useRef(Date.now());
  const rngRef = useRef(createMulberry32(Date.now()));
  const scanTimerRef = useRef<number | null>(null);

  // Phân chia giai đoạn: part 1 hay part 2
  const [part, setPart] = useState<1 | 2>(1);

  // ==========================================
  // PHẦN 1: KÝ VÀ XÁC MINH
  // ==========================================
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [selectedTxIdx, setSelectedTxIdx] = useState<number>(0);
  const sampleMessages = useMemo(
    () => [
      `Chuyển 3 xu cho An`,
      `Chuyển 5 xu cho Bình`,
      `Chuyển 7 xu cho Chi`,
    ],
    []
  );

  // Chữ ký của Em
  const [mySig, setMySig] = useState<Signature | null>(null);
  const [showSigModal, setShowSigModal] = useState(false);

  // Bước xác minh trong phần 1:
  // 'initial': chưa ký
  // 'signed': đã ký, chờ thả vào máy
  // 'scanning_my': máy đang quét danh bạ cho giao dịch của Em
  // 'verified_my': máy báo hợp lệ cho Em
  // 'ti_fraud_ready': Tí dán giao dịch giả
  // 'scanning_ti': máy đang quét danh bạ cho giao dịch của Tí
  // 'ti_detected': máy phát hiện Tí mạo danh!
  const [p1Step, setP1Step] = useState<
    | 'initial'
    | 'signed'
    | 'scanning_my'
    | 'verified_my'
    | 'ti_fraud_ready'
    | 'scanning_ti'
    | 'ti_detected'
  >('initial');

  const [scanIndex, setScanIndex] = useState<number | null>(null);
  const [p1Led, setP1Led] = useState<'idle' | 'scanning' | 'green' | 'red'>('idle');

  // Giao dịch giả của Tí
  const [tiSig, setTiSig] = useState<Signature | null>(null);

  // Dọn dẹp timer khi unmount
  useEffect(() => {
    return () => {
      if (scanTimerRef.current !== null) {
        window.clearTimeout(scanTimerRef.current);
      }
    };
  }, []);

  // Lắng nghe phím Escape để đóng hộp thoại giải thích chữ ký
  useEffect(() => {
    if (!showSigModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        sound.playClick();
        setShowSigModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showSigModal]);

  // Xử lý ký tên
  const handleSign = () => {
    sound.playWhoosh();
    const sig = signUnique(12, sampleMessages[selectedTxIdx], DIRECTORY_KEYS, rngRef.current);
    setMySig(sig);
    setP1Step('signed');
  };

  // Quét danh bạ cho Em
  const handleScanMyTx = () => {
    sound.playClick();
    setP1Step('scanning_my');
    setP1Led('scanning');
    setScanIndex(0);

    // Quét dòng 0 (Em - khóa 18) sau GAME_CONFIG.lesson3.verifyScanDelayMs
    scanTimerRef.current = window.setTimeout(() => {
      setScanIndex(0);
      sound.playCorrect();
      setP1Led('green');
      setP1Step('verified_my');
    }, GAME_CONFIG.lesson3.verifyScanDelayMs);
  };

  // Bắt đầu kịch bản Tí gian lận
  const handleStartTiScenario = () => {
    sound.playClick();
    // Tí ký lén bằng khóa riêng 13 của Tí
    const fakeMsg = `Chuyển 50 xu từ ${myName} cho Tí`;
    const sig = signUnique(13, fakeMsg, DIRECTORY_KEYS, rngRef.current);
    setTiSig(sig);
    setP1Step('ti_fraud_ready');
    setP1Led('idle');
    setScanIndex(null);
  };

  // Quét danh bạ cho giao dịch của Tí (quét lần lượt từ 0 đến 5)
  const handleScanTiTx = () => {
    sound.playClick();
    setP1Step('scanning_ti');
    setP1Led('scanning');

    let current = 0;
    setScanIndex(0);

    const stepInterval = () => {
      scanTimerRef.current = window.setTimeout(() => {
        current++;
        if (current < 5) {
          setScanIndex(current);
          sound.playClick();
          stepInterval();
        } else {
          // Dòng 5: Tí (khóa 21)
          setScanIndex(5);
          sound.playWrong();
          setP1Led('red');
          setP1Step('ti_detected');
        }
      }, GAME_CONFIG.lesson3.verifyScanDelayMs);
    };

    stepInterval();
  };

  // Thả thẻ hoặc chạm đặt thẻ trong Phần 1
  const handleDropOrPlacePart1 = (itemId: string, slotId: string) => {
    if (slotId === 'slot-machine-easy') {
      if (itemId === 'tx-my-signed' && p1Step === 'signed') {
        handleScanMyTx();
      } else if (itemId === 'tx-ti-fraud' && p1Step === 'ti_fraud_ready') {
        handleScanTiTx();
      }
    }
  };

  // ==========================================
  // PHẦN 2: TÍNH KHÓA CÔNG KHAI CHO 5 BẠN
  // ==========================================
  // 7 thẻ khóa: 10, 20, 8, 17, 11 (đúng) + 16, 9 (bẫy)
  const [cardsPool, setCardsPool] = useState<number[]>(() => {
    const list = [10, 20, 8, 17, 11, 16, 9];
    // Xáo trộn
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
  });

  const [matches, setMatches] = useState<Record<string, number | null>>({
    giang: null,
    hoa: null,
    khang: null,
    linh: null,
    minh: null,
  });
  const [lockedMatches, setLockedMatches] = useState<Record<string, boolean>>({
    giang: false,
    hoa: false,
    khang: false,
    linh: false,
    minh: false,
  });
  const [mistakes, setMistakes] = useState(0);
  const [hintMessage, setHintMessage] = useState<string | null>(null);

  // Mini calculator state: a * b mod 23
  const [calcA, setCalcA] = useState<number>(5);
  const [calcB, setCalcB] = useState<number>(5);

  // Chế độ nhân dồn 5: 5^n mod 23
  const [accumN, setAccumN] = useState<number>(0);
  const [accumK, setAccumK] = useState<number>(1);
  const [accumHistory, setAccumHistory] = useState<string[]>([]);

  const handleAccumMultiply = () => {
    sound.playClick();
    const nextN = accumN + 1;
    const nextK = (accumK * 5) % 23;
    setAccumN(nextN);
    setAccumK(nextK);
    setAccumHistory((prev) => [
      ...prev,
      `bấm ${nextN} lần → khóa riêng ${nextN} ra khóa công khai ${nextK}`,
    ]);
  };

  const handleAccumReset = () => {
    sound.playClick();
    setAccumN(0);
    setAccumK(1);
    setAccumHistory([]);
  };

  // Thả thẻ hoặc chạm đặt thẻ vào ô của bạn trong Phần 2
  const handleDropOrPlacePart2 = (itemId: string, slotId: string) => {
    if (!slotId.startsWith('slot-friend-')) return;
    const friendId = slotId.replace('slot-friend-', '');
    if (lockedMatches[friendId]) return;

    let keyVal: number | null = null;
    if (itemId.startsWith('card-pub-')) {
      keyVal = parseInt(itemId.replace('card-pub-', ''), 10);
    }
    if (keyVal === null || isNaN(keyVal)) return;

    sound.playClick();
    const oldCard = matches[friendId];
    setMatches((prev) => ({ ...prev, [friendId]: keyVal }));
    setCardsPool((prev) => {
      const idx = prev.indexOf(keyVal!);
      const withoutSelected = idx !== -1 ? prev.filter((_, i) => i !== idx) : prev;
      return oldCard !== null ? [...withoutSelected, oldCard] : withoutSelected;
    });
  };

  // Gỡ thẻ khỏi ô bạn về lại khay
  const handleRemoveFriendCard = (friendId: string) => {
    if (lockedMatches[friendId]) return;
    const oldCard = matches[friendId];
    if (oldCard === null) return;
    sound.playClick();
    setMatches((prev) => ({ ...prev, [friendId]: null }));
    setCardsPool((prev) => [...prev, oldCard]);
  };

  // Kiểm tra kết quả Phần 2
  const handleCheckPart2 = () => {
    let hasMistake = false;
    const newLocked = { ...lockedMatches };
    let returnedCards: number[] = [];

    FRIENDS_PART2.forEach((f) => {
      if (newLocked[f.id]) return;
      const assigned = matches[f.id];
      if (assigned === null) return;

      if (assigned === f.expectedPub) {
        newLocked[f.id] = true;
      } else {
        hasMistake = true;
        // Trả thẻ sai về pool
        returnedCards.push(assigned);
        matches[f.id] = null;
      }
    });

    if (hasMistake) {
      sound.playWrong();
      setMistakes((m) => m + 1);
      setHintMessage('Gợi ý: 5^x: nhân 5 đủ x lần, mỗi lần lấy dư cho 23 (có thể dùng Máy tính nhanh bên dưới).');
      setCardsPool((pool) => [...pool, ...returnedCards]);
      setMatches({ ...matches });
    } else {
      sound.playCorrect();
      setHintMessage(null);
    }

    setLockedMatches(newLocked);

    // Kiểm tra đã hoàn thành hết cả 5 bạn chưa
    const allDone = FRIENDS_PART2.every((f) => newLocked[f.id]);
    if (allDone) {
      sound.playLevelComplete();
      const earnedStars = mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1;
      const timeMs = Date.now() - startTimeRef.current;
      onComplete({
        stars: earnedStars,
        timeMs,
        learned:
          'Khóa riêng tạo ra chữ ký, khóa công khai để bất kỳ ai cũng đối chiếu được. Kẻ mạo danh không thể giả mạo chữ ký vì không có khóa riêng!',
      });
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-8">
      {/* Thanh chuyển đổi bước */}
      <div className="flex items-center justify-between bg-white px-4 py-2.5 rounded-[16px] border-2 border-[#E3E0EE] shadow-sticker-sm">
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-full bg-[#5B3FD6] text-white flex items-center justify-center font-black text-xs">
            {part}
          </span>
          <span className="font-display font-black text-sm sm:text-base text-[#2A2340]">
            {part === 1 ? 'Phần 1: Ký giao dịch & Thử máy xác minh' : 'Phần 2: Ghép cặp khóa công khai cho 5 bạn'}
          </span>
        </div>
        <span className="text-xs font-bold text-[#5B3FD6] bg-[#EDE9FE] px-2.5 py-1 rounded-full">
          Màn 3.1: Dễ
        </span>
      </div>

      {/* ======================================================================= */}
      {/* GIAI ĐOẠN 1 */}
      {/* ======================================================================= */}
      {part === 1 && (
        <TapOrDragContainer onDropOrPlace={handleDropOrPlacePart1}>
          <div className="space-y-6">
            {/* Khối công thức tổng quát 3 tầng */}
            <Card variant="paper" className="p-4 sm:p-5 border-2 border-[#DDD6FE] bg-white space-y-3.5">
              {/* Tầng a: Công thức tổng quát, chữ to, nổi bật */}
              <div className="text-center p-3.5 bg-[#FAF9FF] rounded-[14px] border-2 border-[#5B3FD6]/30 shadow-sticker-sm">
                <div className="font-display font-black text-lg sm:text-2xl text-[#5B3FD6] tracking-wide">
                  khóa công khai = g<sup>khóa riêng</sup> mod p
                </div>
              </div>

              {/* Tầng b: Giải thích từng tham số, mỗi dòng một ý */}
              <div className="p-3 bg-[#FAF9FF] rounded-[12px] border border-[#DDD6FE] text-xs sm:text-sm text-[#2A2340] space-y-1.5">
                <ul className="space-y-1">
                  <li className="flex items-start gap-2">
                    <span className="text-[#5B3FD6] font-bold">•</span>
                    <span>g = 5: số gốc, cả lớp dùng chung, ai cũng biết.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#5B3FD6] font-bold">•</span>
                    <span>p = 23: số chia lấy dư, cũng dùng chung, ai cũng biết.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#5B3FD6] font-bold">•</span>
                    <span>khóa riêng: số bí mật của riêng em.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#5B3FD6] font-bold">•</span>
                    <span>mod 23: lấy phần dư khi chia cho 23. Ví dụ 25 mod 23 = 2.</span>
                  </li>
                </ul>
              </div>

              {/* Tầng c: Ví dụ cụ thể thay số, viết rõ từng bước */}
              <div className="p-3 bg-[#FFFBEB] rounded-[12px] border border-[#FDE68A] text-xs sm:text-sm text-[#92400E] space-y-1">
                <p className="leading-relaxed">
                  Bạn nào có khóa riêng 3 thì: 5<sup>3</sup> = 5 × 5 × 5 = 125. Rồi 125 mod 23 = 10 (vì 125 = 5 × 23 + 10). Vậy khóa công khai của bạn ấy là 10.
                </p>
              </div>

              {/* Cuối khối */}
              <p className="text-xs sm:text-sm text-[#6B6485] italic leading-relaxed pt-1 border-t border-[#F0EEF8]">
                Khóa riêng của em là số nào thì két sắt bên dưới giữ. Thẻ tên công khai là kết quả sau khi thay vào công thức trên.
              </p>
            </Card>

            {/* Cặp khóa của Em: Két sắt & Thẻ tên */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
              {/* Két sắt bí mật */}
              <Card variant="default" className="p-5 bg-[#FFFBEB] border-2 border-[#FDE68A] rounded-[18px]">
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl">🔐</span>
                    <div className="font-display font-black text-base text-[#92400E]">
                      Két sắt bí mật của {myName}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPrivateKey(!showPrivateKey)}
                    className="text-xs font-bold text-[#92400E] bg-white px-3 py-1.5 rounded-full border border-[#FDE68A] hover:bg-[#FEF3C7] transition-colors cursor-pointer min-h-[32px] flex items-center"
                  >
                    {showPrivateKey ? '👁️ Ẩn khóa' : '👁️ Mở xem'}
                  </button>
                </div>
                <p className="text-xs sm:text-sm text-[#B45309] mb-3.5 leading-relaxed">
                  Chỉ một mình em giữ, dùng để <strong>ký tên</strong>. Tuyệt đối không để lộ!
                </p>
                <div className="flex items-center justify-between bg-white p-3 rounded-[14px] border border-[#FDE68A]">
                  <span className="text-xs sm:text-sm font-bold text-[#6B6485]">Khóa riêng:</span>
                  <span className="font-mono font-black text-xl text-[#D9A000]">
                    {showPrivateKey ? '12' : '••••'}
                  </span>
                </div>
              </Card>

              {/* Thẻ tên công khai */}
              <Card variant="default" className="p-5 bg-[#F5F3FF] border-2 border-[#DDD6FE] rounded-[18px]">
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl">🏷️</span>
                    <div className="font-display font-black text-base text-[#5B3FD6]">
                      Thẻ tên công khai của {myName}
                    </div>
                  </div>
                  <span className="text-xs font-bold text-[#5B3FD6] bg-white px-2.5 py-1 rounded-full border border-[#DDD6FE]">
                    5¹² mod 23
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-[#5B3FD6] mb-3.5 leading-relaxed">
                  Ai cũng biết khóa này để <strong>đối chiếu chữ ký</strong> của em.
                </p>
                <div className="flex items-center justify-between bg-white p-3 rounded-[14px] border border-[#DDD6FE]">
                  <span className="text-xs sm:text-sm font-bold text-[#6B6485]">Khóa công khai:</span>
                  <span className="font-mono font-black text-xl text-[#5B3FD6]">18</span>
                </div>
              </Card>
            </div>

            {/* BƯỚC 1: Em ký giao dịch */}
            {p1Step === 'initial' && (
              <Card variant="paper" className="p-5 sm:p-6 rounded-[18px]">
                <h4 className="font-display font-black text-base sm:text-lg text-[#2A2340] mb-2 flex items-center gap-2">
                  <span>📝</span> Bước 1: Chọn giao dịch và đóng chữ ký của em
                </h4>
                <p className="text-xs sm:text-sm text-[#6B6485] mb-4 leading-relaxed">
                  Chọn một giao dịch mẫu bên dưới rồi bấm <strong>Ký bằng khóa riêng của em</strong>.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                  {sampleMessages.map((msg, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        sound.playClick();
                        setSelectedTxIdx(idx);
                      }}
                      className={`
                        p-3.5 sm:p-4 rounded-[14px] border-2 text-left font-display font-bold text-sm sm:text-base transition-all cursor-pointer min-h-[52px]
                        ${
                          selectedTxIdx === idx
                            ? 'border-[#5B3FD6] bg-[#EDE9FE]/60 text-[#5B3FD6] shadow-sticker-sm'
                            : 'border-[#E3E0EE] bg-white hover:border-[#D0CCE0] text-[#2A2340]'
                        }
                      `}
                    >
                      {msg}
                    </button>
                  ))}
                </div>

                <Button variant="purple" size="md" onClick={handleSign}>
                  ✍️ Ký bằng khóa riêng của em
                </Button>
              </Card>
            )}

            {/* BƯỚC 2: Thả vào máy xác minh (Giao dịch của Em) */}
            {(p1Step === 'signed' || p1Step === 'scanning_my' || p1Step === 'verified_my') && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Thẻ giao dịch của Em */}
                  {mySig && (
                    <div>
                      <div className="text-xs font-bold text-[#5B3FD6] mb-2">
                        Thẻ giao dịch đã ký của {myName} (kéo hoặc chạm để đưa vào máy):
                      </div>
                      <DraggableCard id="tx-my-signed" disabled={p1Step !== 'signed'}>
                        <TheGiaoDich
                          senderId="em"
                          senderName={`${myName} ⭐`}
                          message={sampleMessages[selectedTxIdx]}
                          sig={mySig}
                          onExplainSig={() => setShowSigModal(true)}
                        />
                      </DraggableCard>
                      <p className="text-xs text-[#6B6485] mt-2 italic text-center sm:text-left">
                        Đổi một chữ trong nội dung là cả hai số đổi theo.
                      </p>
                    </div>
                  )}

                  {/* Máy xác minh cơ học */}
                  <div className="bg-[#2A2340] text-white rounded-[20px] p-5 border-2 border-[#1E1B2E] shadow-sticker-md flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3.5">
                        <span className="font-display font-black text-base">Máy xác minh</span>
                        <div className="flex items-center gap-1.5 bg-[#1C182B] px-3 py-1.5 rounded-full">
                          <div
                            className={`w-3 h-3 rounded-full ${
                              p1Led === 'scanning'
                                ? 'bg-[#FFC21A] animate-ping'
                                : p1Led === 'green'
                                ? 'bg-[#1FAF5A] shadow-[0_0_8px_#1FAF5A]'
                                : 'bg-white/20'
                            }`}
                          />
                          <span className="text-xs text-[#DDD6FE]">
                            {p1Led === 'scanning' ? 'Đang quét...' : p1Led === 'green' ? 'Khớp!' : 'Sẵn sàng'}
                          </span>
                        </div>
                      </div>

                      <p className="text-xs sm:text-sm text-[#A69EBF] mb-3.5 leading-relaxed">
                        Máy sẽ tra Danh bạ công khai xem chữ ký trên thẻ này có khớp với khóa nào không.
                      </p>

                      {p1Step === 'signed' && (
                        <MachinePart1Slot
                          step={p1Step}
                          onScanMy={handleScanMyTx}
                          onScanTi={handleScanTiTx}
                        />
                      )}

                      {p1Step === 'verified_my' && (
                        <div className="p-3.5 bg-[#1FAF5A]/20 border border-[#1FAF5A] rounded-[14px] text-xs sm:text-sm space-y-1">
                          <div className="font-bold text-[#4ADE80] text-sm sm:text-base">
                            ✓ Chữ ký chính chủ!
                          </div>
                          <div>Khớp hoàn hảo với khóa công khai 18 của {myName}.</div>
                        </div>
                      )}
                    </div>

                    {p1Step === 'verified_my' && (
                      <div className="mt-4 pt-3 border-t border-white/10">
                        <Button variant="danger" size="md" onClick={handleStartTiScenario}>
                          Tiếp theo: Xem Tí gian lận 🦊 ➔
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Danh bạ quét */}
                <DanhBa highlightIndex={scanIndex} userName={myName} />
              </div>
            )}

            {/* BƯỚC 3: Tí gian lận */}
            {(p1Step === 'ti_fraud_ready' || p1Step === 'scanning_ti' || p1Step === 'ti_detected') && (
              <div className="space-y-6">
                <Card variant="paper" className="p-4 sm:p-5 bg-[#FFF0ED] border-2 border-[#FCA5A5] rounded-[18px]">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">🦊</span>
                    <div className="font-display font-black text-base sm:text-lg text-[#E5484D]">
                      Tí định mạo danh {myName}!
                    </div>
                  </div>
                  <p className="text-xs sm:text-sm text-[#7F1D1D] leading-relaxed">
                    Tí lén viết giao dịch: <em>"Chuyển 50 xu từ {myName} cho Tí"</em>. Nhưng vì Tí <strong>không có khóa riêng của em</strong>, Tí đành liều ký bằng khóa riêng 13 của Tí!
                  </p>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Thẻ gian lận */}
                  {tiSig && (
                    <div>
                      <div className="text-xs font-bold text-[#E5484D] mb-2">
                        Thẻ gian lận do Tí tạo (kéo hoặc chạm để đưa vào máy):
                      </div>
                      <DraggableCard id="tx-ti-fraud" disabled={p1Step !== 'ti_fraud_ready'}>
                        <TheGiaoDich
                          senderId="em"
                          senderName={`${myName} (bị Tí mạo danh)`}
                          message={`Chuyển 50 xu từ ${myName} cho Tí`}
                          sig={tiSig}
                          onExplainSig={() => setShowSigModal(true)}
                        />
                      </DraggableCard>
                    </div>
                  )}

                  {/* Máy kiểm tra thẻ giả */}
                  <div className="bg-[#2A2340] text-white rounded-[20px] p-5 border-2 border-[#1E1B2E] shadow-sticker-md flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3.5">
                        <span className="font-display font-black text-base">Máy xác minh</span>
                        <div className="flex items-center gap-1.5 bg-[#1C182B] px-3 py-1.5 rounded-full">
                          <div
                            className={`w-3 h-3 rounded-full ${
                              p1Led === 'scanning'
                                ? 'bg-[#FFC21A] animate-ping'
                                : p1Led === 'red'
                                ? 'bg-[#E5484D] shadow-[0_0_8px_#E5484D]'
                                : 'bg-white/20'
                            }`}
                          />
                          <span className="text-xs text-[#DDD6FE]">
                            {p1Led === 'scanning' ? 'Đang quét...' : p1Led === 'red' ? 'Báo động!' : 'Sẵn sàng'}
                          </span>
                        </div>
                      </div>

                      {p1Step === 'ti_fraud_ready' && (
                        <MachinePart1Slot
                          step={p1Step}
                          onScanMy={handleScanMyTx}
                          onScanTi={handleScanTiTx}
                        />
                      )}

                      {p1Step === 'ti_detected' && (
                        <div className="p-3.5 bg-[#E5484D]/20 border border-[#E5484D] rounded-[14px] text-xs sm:text-sm space-y-1">
                          <div className="font-bold text-[#FF8787] text-sm sm:text-base">
                            ✗ Phát hiện gian lận!
                          </div>
                          <div className="text-[#DDD6FE]">
                            Chữ ký trên thẻ <strong className="text-white">không khớp</strong> với khóa 18 của {myName}, mà lại khớp với khóa 21 của <strong className="text-[#FFC21A]">Tí 🦊</strong>!
                          </div>
                        </div>
                      )}
                    </div>

                    {p1Step === 'ti_detected' && (
                      <div className="mt-4 pt-3 border-t border-white/10 flex justify-end">
                        <Button
                          variant="purple"
                          size="md"
                          onClick={() => {
                            sound.playClick();
                            setPart(2);
                          }}
                        >
                          Sang phần 2: Ghép cặp khóa ➔
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Danh bạ */}
                <DanhBa highlightIndex={scanIndex} userName={myName} />
              </div>
            )}
          </div>
        </TapOrDragContainer>
      )}

      {/* ======================================================================= */}
      {/* GIAI ĐOẠN 2: GHÉP CẶP 5 BẠN */}
      {/* ======================================================================= */}
      {part === 2 && (
        <TapOrDragContainer onDropOrPlace={handleDropOrPlacePart2}>
          <div className="space-y-8">
            <Card variant="paper" className="p-5 rounded-[18px]">
              <h4 className="font-display font-black text-base sm:text-lg text-[#2A2340] mb-2 flex items-center gap-2">
                <span>🎯</span> Nhiệm vụ: Tìm khóa công khai cho 5 bạn
              </h4>
              <p className="text-xs sm:text-sm text-[#6B6485] leading-relaxed">
                Mỗi bạn có một <strong>Khóa riêng x</strong>. Công thức tính khóa công khai là:{' '}
                <span className="font-mono font-bold text-[#5B3FD6] bg-[#EDE9FE] px-2.5 py-1 rounded-[8px]">
                  5^x mod 23
                </span>
                . Kéo hoặc chạm chọn một thẻ khóa bên dưới rồi gắn vào ô của bạn tương ứng (chạm ô có thẻ để gỡ về khay)!
              </p>
            </Card>

            {hintMessage && (
              <div className="p-3.5 bg-[#FFFBEB] rounded-[14px] border border-[#FDE68A] text-xs sm:text-sm text-[#B45309] font-medium animate-fadeIn">
                💡 {hintMessage}
              </div>
            )}

            {/* Danh sách 5 bạn */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {FRIENDS_PART2.map((friend) => {
                const assigned = matches[friend.id];
                const isLocked = lockedMatches[friend.id];

                return (
                  <div
                    key={friend.id}
                    className={`
                      p-4 rounded-[16px] border-2 transition-all flex items-center justify-between gap-3
                      ${
                        isLocked
                          ? 'border-[#1FAF5A] bg-[#F0FDF4]'
                          : assigned !== null
                          ? 'border-[#5B3FD6] bg-[#F5F3FF]'
                          : 'border-[#E3E0EE] bg-white hover:border-[#D0CCE0]'
                      }
                    `}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        style={{ backgroundColor: friend.color }}
                        className="w-10 h-10 rounded-full text-white font-black flex items-center justify-center font-display text-base shrink-0 shadow-sm"
                      >
                        {friend.letter}
                      </div>
                      <div className="min-w-0">
                        <div className="font-display font-black text-base text-[#2A2340]">
                          {friend.name}
                        </div>
                        <div className="text-xs text-[#6B6485]">
                          Khóa riêng: <span className="font-mono font-bold text-sm text-[#2A2340]">{friend.priv}</span>
                          <span className="text-[#A69EBF] text-xs"> (5^{friend.priv} mod 23)</span>
                        </div>
                      </div>
                    </div>

                    {/* Ô chứa thẻ khóa */}
                    <FriendSlotDroppable
                      friend={friend}
                      assigned={assigned}
                      isLocked={isLocked}
                      onRemove={handleRemoveFriendCard}
                    />
                  </div>
                );
              })}
            </div>

            {/* Kho thẻ khóa công khai bên dưới */}
            <div className="p-5 bg-white rounded-[18px] border-2 border-[#E3E0EE] shadow-sticker-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3.5 pb-2.5 border-b border-[#F0EEF8]">
                <span className="text-xs sm:text-sm font-bold text-[#6B6485]">
                  Kho thẻ khóa công khai (7 thẻ gồm 2 thẻ bẫy):
                </span>
                <span className="text-xs sm:text-sm text-[#5B3FD6] font-medium">
                  Kéo thẻ hoặc chạm chọn để gắn vào ô
                </span>
              </div>

              <div className="flex flex-wrap gap-3 mb-5">
                {cardsPool.map((keyVal, idx) => (
                  <DraggableCard
                    key={`${keyVal}-${idx}`}
                    id={`card-pub-${keyVal}`}
                    className="w-14 h-14 rounded-[14px] border-2 font-mono font-black text-xl transition-all duration-150 flex items-center justify-center border-[#E3E0EE] bg-[#FAF9FF] hover:border-[#5B3FD6] text-[#2A2340] shadow-xs cursor-grab active:cursor-grabbing"
                  >
                    {keyVal}
                  </DraggableCard>
                ))}
                {cardsPool.length === 0 && (
                  <div className="text-xs sm:text-sm text-[#6B6485] italic py-2">
                    Đã gắn hết các thẻ lên các bạn. Hãy bấm "Kiểm tra kết quả"!
                  </div>
                )}
              </div>

              <div className="flex justify-end">
                <Button variant="primary" size="md" onClick={handleCheckPart2}>
                  Kiểm tra kết quả ➔
                </Button>
              </div>
            </div>

            {/* Khu vực máy tính hỗ trợ: Máy tính nhanh a × b mod 23 & Nhân dồn 5 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Ô 1: Máy tính nhanh mod 23 */}
              <div className="p-4 sm:p-5 bg-[#FAF9FF] rounded-[16px] border border-[#DDD6FE] flex flex-col justify-between gap-3 text-xs sm:text-sm">
                <div>
                  <div className="flex items-center gap-2 text-[#5B3FD6] font-bold text-sm sm:text-base">
                    <span className="text-lg">🧮</span>
                    <span>Máy tính nhanh mod 23:</span>
                  </div>
                  <p className="text-xs text-[#6B6485] mt-1.5 leading-relaxed">
                    Nhập hai số để nhân, máy trả về phần dư khi chia cho 23. Dùng khi em muốn tự kiểm tra một phép nhân.
                  </p>
                </div>

                <div className="flex items-center gap-2 font-mono flex-wrap">
                  <input
                    type="number"
                    value={calcA}
                    onChange={(e) => setCalcA(parseInt(e.target.value) || 0)}
                    className="w-16 px-2.5 py-1.5 rounded-[10px] border border-[#DDD6FE] text-center font-bold text-base text-[#2A2340]"
                  />
                  <span className="font-bold text-[#5B3FD6] text-base">×</span>
                  <input
                    type="number"
                    value={calcB}
                    onChange={(e) => setCalcB(parseInt(e.target.value) || 0)}
                    className="w-16 px-2.5 py-1.5 rounded-[10px] border border-[#DDD6FE] text-center font-bold text-base text-[#2A2340]"
                  />
                  <span className="font-bold text-[#5B3FD6] text-base">mod 23 =</span>
                  <span className="px-3.5 py-1.5 bg-[#5B3FD6] text-white rounded-[10px] font-black text-base">
                    {((calcA * calcB) % 23 + 23) % 23}
                  </span>
                </div>
              </div>

              {/* Ô 2: Chế độ nhân dồn 5 */}
              <div className="p-4 sm:p-5 bg-[#FAF9FF] rounded-[16px] border border-[#DDD6FE] flex flex-col justify-between gap-3 text-xs sm:text-sm">
                <div>
                  <div className="flex items-center gap-2 text-[#5B3FD6] font-bold mb-1 text-sm sm:text-base">
                    <span className="text-lg">⚡</span>
                    <span>Nhân dồn 5:</span>
                  </div>
                  <p className="text-xs text-[#6B6485] leading-relaxed">
                    Mỗi lần bấm × 5 là nhân thêm một lần 5 rồi lấy dư cho 23 luôn. Bấm x lần thì được 5^x mod 23, chính là khóa công khai của khóa riêng x.
                  </p>
                </div>

                <div className="font-mono text-xs sm:text-sm text-[#2A2340] bg-white p-2.5 rounded-[10px] border border-[#EDE9FE]">
                  {accumN === 0 ? (
                    <span className="text-[#6B6485]">Đã bấm 0 lần (bắt đầu từ 1)</span>
                  ) : (
                    <span>
                      Đã bấm <strong className="text-[#5B3FD6]">{accumN}</strong> lần → khóa công khai của khóa riêng <strong className="text-[#5B3FD6]">{accumN}</strong> là <strong className="text-[#5B3FD6]">{accumK}</strong>
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Button variant="primary" size="sm" onClick={handleAccumMultiply}>
                      × 5
                    </Button>
                    <Button variant="secondary" size="sm" onClick={handleAccumReset}>
                      Về đầu
                    </Button>
                  </div>
                  <p className="text-xs text-[#6B6485] italic">
                    Muốn tìm khóa công khai của Giang (khóa riêng 3)? Bấm Về đầu rồi bấm × 5 ba lần.
                  </p>
                </div>

                {accumHistory.length > 0 && (
                  <div className="pt-2.5 border-t border-[#EDE9FE]">
                    <div className="text-xs text-[#6B6485] font-semibold mb-1.5">
                      Lịch sử (tối đa 6 dòng gần nhất):
                    </div>
                    <div className="max-h-24 overflow-y-auto space-y-1 font-mono text-xs text-[#5B3FD6] pr-1">
                      {accumHistory.slice(-6).map((item, idx) => (
                        <div key={idx} className="bg-white px-2.5 py-1 rounded-[8px] border border-[#EDE9FE]">
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </TapOrDragContainer>
      )}

      {/* Hộp giải thích chữ ký (r, s) */}
      {showSigModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Chữ ký gồm hai con số"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2A2340]/60 backdrop-blur-sm animate-fadeIn"
          onClick={() => {
            sound.playClick();
            setShowSigModal(false);
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md md:max-w-[760px] bg-white rounded-[24px] border-2 border-[#E3E0EE] shadow-sticker-lg p-6 sm:p-8 md:p-9 overflow-hidden z-10 animate-modal-pop max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-[#E9E4FF]">
              <h3 className="font-display font-bold text-xl text-[#2A2340]">
                Chữ ký gồm hai con số
              </h3>
              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  setShowSigModal(false);
                }}
                className="w-10 h-10 rounded-full bg-[#F6F5FB] border border-[#E3E0EE] text-[#6B6485] hover:text-[#2A2340] hover:bg-[#E9E4FF] flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Đóng hộp thoại"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="mt-5 space-y-4 text-[18px] leading-[1.7] text-[#2A2340]">
              <p>
                Chữ ký của em không phải chữ viết tay. Nó là hai con số, <span className="font-mono font-bold text-[#5B3FD6]">r</span> và <span className="font-mono font-bold text-[#5B3FD6]">s</span>, do máy tính ra.
              </p>

              {/* Khối ví dụ (nền nhạt, chữ mono cho các số) */}
              <div className="p-4 sm:p-5 bg-[#FAF9FF] rounded-[16px] border border-[#DDD6FE] space-y-2.5">
                <div className="font-bold text-[#2A2340]">
                  Ví dụ em ký câu 'Chuyển 3 xu cho An':
                </div>
                <div className="space-y-1.5 text-[18px] leading-[1.7]">
                  <p>
                    1. Máy bốc một số ngẫu nhiên chỉ dùng cho lần ký này, giả sử là <span className="font-mono font-bold text-[#5B3FD6]">5</span>.
                  </p>
                  <p>
                    2. Từ số <span className="font-mono font-bold text-[#5B3FD6]">5</span> đó, máy tính ra <span className="font-mono font-bold text-[#5B3FD6]">r = 20</span>. Đây là dấu niêm phong của riêng lần ký này.
                  </p>
                  <p>
                    3. Máy trộn khóa riêng <span className="font-mono font-bold text-[#D9A000]">12</span> của em với nội dung câu trên, ra <span className="font-mono font-bold text-[#5B3FD6]">s = 1</span>.
                  </p>
                  <p>
                    4. Chữ ký là <span className="font-mono font-bold text-[#5B3FD6]">(r: 20, s: 1)</span>. Em gửi cả câu và hai số này đi.
                  </p>
                </div>
              </div>

              {/* Khối "Vì sao không ai giả được" */}
              <div className="space-y-2">
                <div className="font-bold text-[#2A2340]">
                  Vì sao không ai giả được:
                </div>
                <p>
                  Người nhận lấy khóa công khai <span className="font-mono font-bold text-[#5B3FD6]">18</span> của em, ghép với <span className="font-mono font-bold text-[#5B3FD6]">r</span> và <span className="font-mono font-bold text-[#5B3FD6]">s</span> rồi tính lại. Khớp thì đúng là em ký.
                </p>
                <p>
                  Kẻ mạo danh không có khóa riêng <span className="font-mono font-bold text-[#D9A000]">12</span>, nên không tính được số <span className="font-mono font-bold text-[#5B3FD6]">s</span> đúng. Nó ký thì ra hai số khác, ghép với khóa công khai <span className="font-mono font-bold text-[#5B3FD6]">18</span> là lệch ngay.
                </p>
                <p>
                  Đổi một chữ trong nội dung cũng lệch: cùng một chữ ký mà nội dung khác đi là không khớp nữa.
                </p>
              </div>

              {/* Dòng cuối, chữ nghiêng */}
              <p className="italic text-[#6B6485]">
                Em không phải tự tính r và s. Máy làm việc đó.
              </p>

              {/* Nút đóng "Đã hiểu" */}
              <div className="mt-6 flex justify-end">
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => {
                    sound.playClick();
                    setShowSigModal(false);
                  }}
                >
                  Đã hiểu
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
