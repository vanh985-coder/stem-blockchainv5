import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Avatar,
  Button,
  Card,
  DraggableCard,
  DroppableSlot,
  TapOrDragContainer,
  fmt,
  sound,
  useAuth,
  useTapOrDrag,
  type StationResult,
} from '@so-chung/core';
import { bai3Texts } from '@so-chung/core/content/lessons/bai-3';
import { GAME_CONFIG } from '@so-chung/core/config/gameConfig';
import { createMulberry32 } from '@so-chung/core/lib/rng';
import { DIRECTORY_KEYS, signUnique, type Signature } from '@so-chung/core/lessons/bai-3/logic';
import { DanhBa } from './DanhBa';
import { TheGiaoDich } from './TheGiaoDich';
import { portraitOf, tenNhan, type PersonId } from './nguoi';

const T = bai3Texts.easy;

// 5 bạn trong Phần 2
const FRIENDS_PART2: { id: PersonId; priv: number; expectedPub: number }[] = [
  { id: 'giang', priv: 3, expectedPub: 10 },
  { id: 'hoa', priv: 5, expectedPub: 20 },
  { id: 'khang', priv: 6, expectedPub: 8 },
  { id: 'lan', priv: 7, expectedPub: 17 },
  { id: 'minh', priv: 9, expectedPub: 11 },
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
      placeholder={T.t01}
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
          >{T.t02}</Button>
        )}
        {step === 'ti_fraud_ready' && (
          <Button
            variant="danger"
            size="md"
            onClick={(e) => {
              e.stopPropagation();
              onScanTi();
            }}
          >{fmt(T.t03)}</Button>
        )}
        {(step === 'signed' || step === 'ti_fraud_ready') && (
          <span className="text-sm text-[#A69EBF]">
            {selectedId ? T.t04 : T.t05}
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
      className={`w-14 h-12 rounded-[14px] border-2 flex items-center justify-center font-mono font-extrabold text-base shrink-0 transition-all ${
        isLocked
          ? '!bg-xanh-la-dam !text-white !border-xanh-la-dam'
          : assigned !== null
          ? '!bg-muc-tim !text-white !border-muc-tim hover:brightness-110 cursor-pointer shadow-xs'
          : 'border-dashed border-nau-go/40 bg-white/60 text-[#A69EBF]'
      }`}
    >
      {assigned !== null ? (
        <div
          onClick={handleChildClick}
          className="w-full h-full flex items-center justify-center select-none"
          title={isLocked ? undefined : T.t06}
        >
          {assigned}
        </div>
      ) : null}
    </DroppableSlot>
  );
};

export function Easy({ onComplete }: { onComplete: (r: StationResult) => void; onFail?: (tip: string) => void }) {
  const { profile } = useAuth();
  const myName = fmt('{Ten}', { ten: profile?.display_name });

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
      T.t07,
      T.t08,
      T.t09,
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
    const fakeMsg = fmt(T.t10, { myName });
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
    lan: null,
    minh: null,
  });
  const [lockedMatches, setLockedMatches] = useState<Record<string, boolean>>({
    giang: false,
    hoa: false,
    khang: false,
    lan: false,
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
      fmt(T.t11, { nextN, nextK }),
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
      setHintMessage(T.t12);
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
          T.t13,
      });
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-8">
      {/* Thanh chuyển đổi bước */}
      <div className="flex items-center justify-between bg-white/70 px-4 py-2.5 rounded-[16px] border-2 border-nau-go/30">
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-full bg-muc-tim text-white flex items-center justify-center font-extrabold text-sm">
            {part}
          </span>
          <span className="font-display font-extrabold text-sm sm:text-base text-chu">
            {part === 1 ? T.t14 : T.t15}
          </span>
        </div>
        <span className="text-sm font-bold text-muc-tim-dam bg-muc-tim/10 px-2.5 py-1 rounded-full">{T.t16}</span>
      </div>

      {/* ======================================================================= */}
      {/* GIAI ĐOẠN 1 */}
      {/* ======================================================================= */}
      {part === 1 && (
        <TapOrDragContainer onDropOrPlace={handleDropOrPlacePart1}>
          <div className="space-y-6">
            {/* Khối công thức tổng quát 3 tầng */}
            <Card variant="paper" className="p-4 sm:p-5 border-2 border-muc-tim/30 bg-white/70 space-y-3.5">
              {/* Tầng a: Công thức tổng quát, chữ to, nổi bật */}
              <div className="text-center p-3.5 bg-white/60 rounded-[14px] border-2 border-muc-tim/30">
                <div className="font-display font-extrabold text-lg sm:text-2xl text-muc-tim-dam tracking-wide">{T.t17}<sup>{T.t18}</sup> mod p
                </div>
              </div>

              {/* Tầng b: Giải thích từng tham số, mỗi dòng một ý */}
              <div className="p-3 bg-white/60 rounded-[12px] border border-muc-tim/30 text-sm sm:text-sm text-chu space-y-1.5">
                <ul className="space-y-1">
                  <li className="flex items-start gap-2">
                    <span className="text-muc-tim-dam font-bold">•</span>
                    <span>{T.t19}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-muc-tim-dam font-bold">•</span>
                    <span>{T.t20}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-muc-tim-dam font-bold">•</span>
                    <span>{T.t21}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-muc-tim-dam font-bold">•</span>
                    <span>{T.t22}</span>
                  </li>
                </ul>
              </div>

              {/* Tầng c: Ví dụ cụ thể thay số, viết rõ từng bước */}
              <div className="p-3 bg-vang/15 rounded-[12px] border border-vang/60 text-sm sm:text-sm text-nau-go-dam space-y-1">
                <p className="leading-relaxed">{T.t23}<sup>3</sup>{T.t24}</p>
              </div>

              {/* Cuối khối */}
              <p className="text-sm sm:text-sm text-nau-go-dam italic leading-relaxed pt-1 border-t border-giay">{T.t25}</p>
            </Card>

            {/* Cặp khóa của Em: Két sắt & Thẻ tên */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
              {/* Két sắt bí mật */}
              <Card variant="default" className="p-5 bg-vang/15 border-2 border-vang/60 rounded-[18px]">
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl">🔐</span>
                    <div className="font-display font-extrabold text-base text-nau-go-dam">{fmt(T.t26, { myName })}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPrivateKey(!showPrivateKey)}
                    className="text-sm font-bold text-nau-go-dam bg-white/70 px-3 py-1.5 rounded-full border border-vang/60 hover:bg-vang/25 transition-colors cursor-pointer min-h-[32px] flex items-center"
                  >
                    {showPrivateKey ? T.t27 : T.t28}
                  </button>
                </div>
                <p className="text-sm sm:text-sm text-nau-go-dam mb-3.5 leading-relaxed">{T.t29}<strong>{T.t31}</strong>{T.t30}</p>
                <div className="flex items-center justify-between bg-white/70 p-3 rounded-[14px] border border-vang/60">
                  <span className="text-sm sm:text-sm font-bold text-nau-go-dam">{T.t32}</span>
                  <span className="font-mono font-extrabold text-xl text-vang-dam">
                    {showPrivateKey ? '12' : '••••'}
                  </span>
                </div>
              </Card>

              {/* Thẻ tên công khai */}
              <Card variant="default" className="p-5 bg-muc-tim/5 border-2 border-muc-tim/30 rounded-[18px]">
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl">🏷️</span>
                    <div className="font-display font-extrabold text-base text-muc-tim-dam">{fmt(T.t33, { myName })}</div>
                  </div>
                  <span className="text-sm font-bold text-muc-tim-dam bg-white/70 px-2.5 py-1 rounded-full border border-muc-tim/30">
                    5¹² mod 23
                  </span>
                </div>
                <p className="text-sm sm:text-sm text-muc-tim-dam mb-3.5 leading-relaxed">{T.t34}<strong>{T.t36}</strong>{T.t35}</p>
                <div className="flex items-center justify-between bg-white/70 p-3 rounded-[14px] border border-muc-tim/30">
                  <span className="text-sm sm:text-sm font-bold text-nau-go-dam">{T.t37}</span>
                  <span className="font-mono font-extrabold text-xl text-muc-tim-dam">18</span>
                </div>
              </Card>
            </div>

            {/* BƯỚC 1: Em ký giao dịch */}
            {p1Step === 'initial' && (
              <Card variant="paper" className="p-5 sm:p-6 rounded-[18px]">
                <h4 className="font-display font-extrabold text-base sm:text-lg text-chu mb-2 flex items-center gap-2">
                  <span>📝</span>{T.t38}</h4>
                <p className="text-sm sm:text-sm text-nau-go-dam mb-4 leading-relaxed">{T.t39}<strong>{T.t40}</strong>.
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
                            ? 'border-muc-tim bg-muc-tim/60 text-muc-tim-dam'
                            : 'border-nau-go/30 bg-white/70 hover:border-nau-go/40 text-chu'
                        }
                      `}
                    >
                      {msg}
                    </button>
                  ))}
                </div>

                <Button variant="primary" size="md" onClick={handleSign}>{T.t41}</Button>
              </Card>
            )}

            {/* BƯỚC 2: Thả vào máy xác minh (Giao dịch của Em) */}
            {(p1Step === 'signed' || p1Step === 'scanning_my' || p1Step === 'verified_my') && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Thẻ giao dịch của Em */}
                  {mySig && (
                    <div>
                      <div className="text-sm font-bold text-muc-tim-dam mb-2">{fmt(T.t42, { myName })}</div>
                      <DraggableCard id="tx-my-signed" disabled={p1Step !== 'signed'}>
                        <TheGiaoDich
                          senderId="em"
                          senderName={myName}
                          message={sampleMessages[selectedTxIdx]}
                          sig={mySig}
                          onExplainSig={() => setShowSigModal(true)}
                        />
                      </DraggableCard>
                      <p className="text-sm text-nau-go-dam mt-2 italic text-center sm:text-left">{T.t43}</p>
                    </div>
                  )}

                  {/* Máy xác minh cơ học */}
                  <div className="bg-chu text-white rounded-[20px] p-5 border-2 border-[#1E1B2E] flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3.5">
                        <span className="font-display font-extrabold text-base">{T.t44}</span>
                        <div className="flex items-center gap-1.5 bg-[#1C182B] px-3 py-1.5 rounded-full">
                          <div
                            className={`w-3 h-3 rounded-full ${
                              p1Led === 'scanning'
                                ? 'bg-vang animate-ping'
                                : p1Led === 'green'
                                ? 'bg-xanh-la-dam shadow-[0_0_8px_#1FAF5A]'
                                : 'bg-white/20'
                            }`}
                          />
                          <span className="text-sm text-violet-200">
                            {p1Led === 'scanning' ? T.t45 : p1Led === 'green' ? T.t46 : T.t47}
                          </span>
                        </div>
                      </div>

                      <p className="text-sm sm:text-sm text-[#A69EBF] mb-3.5 leading-relaxed">{T.t48}</p>

                      {p1Step === 'signed' && (
                        <MachinePart1Slot
                          step={p1Step}
                          onScanMy={handleScanMyTx}
                          onScanTi={handleScanTiTx}
                        />
                      )}

                      {p1Step === 'verified_my' && (
                        <div className="p-3.5 bg-xanh-la-dam/20 border border-xanh-la-dam rounded-[14px] text-sm sm:text-sm space-y-1">
                          <div className="font-bold text-[#4ADE80] text-sm sm:text-base">{T.t49}</div>
                          <div>{fmt(T.t50, { myName })}</div>
                        </div>
                      )}
                    </div>

                    {p1Step === 'verified_my' && (
                      <div className="mt-4 pt-3 border-t border-white/10">
                        <Button variant="danger" size="md" onClick={handleStartTiScenario}>{fmt(T.t51)}</Button>
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
                <Card variant="paper" className="p-4 sm:p-5 bg-do-son/10 border-2 border-[#FCA5A5] rounded-[18px]">
                  <div className="flex items-center gap-2 mb-2">
                    <Avatar portrait={portraitOf("ti")} size="sm" />
                    <div className="font-display font-extrabold text-base sm:text-lg text-do-son-dam">{fmt(T.t52, { myName })}</div>
                  </div>
                  <p className="text-sm sm:text-sm text-[#7F1D1D] leading-relaxed">{fmt(T.t53)}<em>{fmt(T.t56, { myName })}</em>{fmt(T.t54)}<strong>{T.t57}</strong>{fmt(T.t55)}</p>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Thẻ gian lận */}
                  {tiSig && (
                    <div>
                      <div className="text-sm font-bold text-do-son-dam mb-2">{fmt(T.t58)}</div>
                      <DraggableCard id="tx-ti-fraud" disabled={p1Step !== 'ti_fraud_ready'}>
                        <TheGiaoDich
                          senderId="em"
                          senderName={fmt(T.t59, { myName })}
                          message={fmt(T.t10, { myName })}
                          sig={tiSig}
                          onExplainSig={() => setShowSigModal(true)}
                        />
                      </DraggableCard>
                    </div>
                  )}

                  {/* Máy kiểm tra thẻ giả */}
                  <div className="bg-chu text-white rounded-[20px] p-5 border-2 border-[#1E1B2E] flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3.5">
                        <span className="font-display font-extrabold text-base">{T.t44}</span>
                        <div className="flex items-center gap-1.5 bg-[#1C182B] px-3 py-1.5 rounded-full">
                          <div
                            className={`w-3 h-3 rounded-full ${
                              p1Led === 'scanning'
                                ? 'bg-vang animate-ping'
                                : p1Led === 'red'
                                ? 'bg-do-son shadow-[0_0_8px_#E5484D]'
                                : 'bg-white/20'
                            }`}
                          />
                          <span className="text-sm text-violet-200">
                            {p1Led === 'scanning' ? T.t45 : p1Led === 'red' ? T.t60 : T.t47}
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
                        <div className="p-3.5 bg-do-son/20 border border-do-son rounded-[14px] text-sm sm:text-sm space-y-1">
                          <div className="font-bold text-[#FF8787] text-sm sm:text-base">{T.t61}</div>
                          <div className="text-violet-200">{T.t62}<strong className="text-white">{T.t64}</strong>{fmt(T.t63, { myName })}<strong className="text-vang">{fmt(T.t65)}</strong>!
                          </div>
                        </div>
                      )}
                    </div>

                    {p1Step === 'ti_detected' && (
                      <div className="mt-4 pt-3 border-t border-white/10 flex justify-end">
                        <Button
                          variant="primary"
                          size="md"
                          onClick={() => {
                            sound.playClick();
                            setPart(2);
                          }}
                        >{T.t66}</Button>
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
              <h4 className="font-display font-extrabold text-base sm:text-lg text-chu mb-2 flex items-center gap-2">
                <span>🎯</span>{T.t67}</h4>
              <p className="text-sm sm:text-sm text-nau-go-dam leading-relaxed">{T.t68}<strong>{T.t71}</strong>{T.t69}<span className="font-mono font-bold text-muc-tim-dam bg-muc-tim/10 px-2.5 py-1 rounded-[8px]">
                  5^x mod 23
                </span>{T.t70}</p>
            </Card>

            {hintMessage && (
              <div className="p-3.5 bg-vang/15 rounded-[14px] border border-vang/60 text-sm sm:text-sm text-nau-go-dam font-medium animate-fadeIn">
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
                          ? 'border-xanh-la-dam bg-xanh-la/10'
                          : assigned !== null
                          ? 'border-muc-tim bg-muc-tim/5'
                          : 'border-nau-go/30 bg-white/70 hover:border-nau-go/40'
                      }
                    `}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar portrait={portraitOf(friend.id)} size="sm" />
                      <div className="min-w-0">
                        <div className="font-display font-extrabold text-base text-chu">
                          {tenNhan(friend.id)}
                        </div>
                        <div className="text-sm text-nau-go-dam">{T.t72}<span className="font-mono font-bold text-sm text-chu">{friend.priv}</span>
                          <span className="text-[#A69EBF] text-sm"> (5^{friend.priv} mod 23)</span>
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
            <div className="p-5 bg-white/70 rounded-[18px] border-2 border-nau-go/30">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3.5 pb-2.5 border-b border-giay">
                <span className="text-sm sm:text-sm font-bold text-nau-go-dam">{T.t73}</span>
                <span className="text-sm sm:text-sm text-muc-tim-dam font-medium">{T.t74}</span>
              </div>

              <div className="flex flex-wrap gap-3 mb-5">
                {cardsPool.map((keyVal, idx) => (
                  <DraggableCard
                    key={`${keyVal}-${idx}`}
                    id={`card-pub-${keyVal}`}
                    className="w-14 h-14 rounded-[14px] border-2 font-mono font-extrabold text-xl transition-all duration-150 flex items-center justify-center border-nau-go/30 bg-white/60 hover:border-muc-tim text-chu shadow-xs cursor-grab active:cursor-grabbing"
                  >
                    {keyVal}
                  </DraggableCard>
                ))}
                {cardsPool.length === 0 && (
                  <div className="text-sm sm:text-sm text-nau-go-dam italic py-2">{T.t75}</div>
                )}
              </div>

              <div className="flex justify-end">
                <Button variant="primary" size="md" onClick={handleCheckPart2}>{T.t76}</Button>
              </div>
            </div>

            {/* Khu vực máy tính hỗ trợ: Máy tính nhanh a × b mod 23 & Nhân dồn 5 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Ô 1: Máy tính nhanh mod 23 */}
              <div className="p-4 sm:p-5 bg-white/60 rounded-[16px] border border-muc-tim/30 flex flex-col justify-between gap-3 text-sm sm:text-sm">
                <div>
                  <div className="flex items-center gap-2 text-muc-tim-dam font-bold text-sm sm:text-base">
                    <span className="text-lg">🧮</span>
                    <span>{T.t77}</span>
                  </div>
                  <p className="text-sm text-nau-go-dam mt-1.5 leading-relaxed">{T.t78}</p>
                </div>

                <div className="flex items-center gap-2 font-mono flex-wrap">
                  <input
                    type="number"
                    value={calcA}
                    onChange={(e) => setCalcA(parseInt(e.target.value) || 0)}
                    className="w-16 px-2.5 py-1.5 rounded-[10px] border border-muc-tim/30 text-center font-bold text-base text-chu"
                  />
                  <span className="font-bold text-muc-tim-dam text-base">×</span>
                  <input
                    type="number"
                    value={calcB}
                    onChange={(e) => setCalcB(parseInt(e.target.value) || 0)}
                    className="w-16 px-2.5 py-1.5 rounded-[10px] border border-muc-tim/30 text-center font-bold text-base text-chu"
                  />
                  <span className="font-bold text-muc-tim-dam text-base">mod 23 =</span>
                  <span className="px-3.5 py-1.5 bg-muc-tim text-white rounded-[10px] font-extrabold text-base">
                    {((calcA * calcB) % 23 + 23) % 23}
                  </span>
                </div>
              </div>

              {/* Ô 2: Chế độ nhân dồn 5 */}
              <div className="p-4 sm:p-5 bg-white/60 rounded-[16px] border border-muc-tim/30 flex flex-col justify-between gap-3 text-sm sm:text-sm">
                <div>
                  <div className="flex items-center gap-2 text-muc-tim-dam font-bold mb-1 text-sm sm:text-base">
                    <span className="text-lg">⚡</span>
                    <span>{T.t79}</span>
                  </div>
                  <p className="text-sm text-nau-go-dam leading-relaxed">{T.t80}</p>
                </div>

                <div className="font-mono text-sm sm:text-sm text-chu bg-white/70 p-2.5 rounded-[10px] border border-muc-tim/10">
                  {accumN === 0 ? (
                    <span className="text-nau-go-dam">{T.t81}</span>
                  ) : (
                    <span>{T.t82}<strong className="text-muc-tim-dam">{accumN}</strong>{T.t83}<strong className="text-muc-tim-dam">{accumN}</strong>{T.t84}<strong className="text-muc-tim-dam">{accumK}</strong>
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Button variant="primary" size="sm" onClick={handleAccumMultiply}>
                      × 5
                    </Button>
                    <Button variant="secondary" size="sm" onClick={handleAccumReset}>{T.t85}</Button>
                  </div>
                  <p className="text-sm text-nau-go-dam italic">{T.t86}</p>
                </div>

                {accumHistory.length > 0 && (
                  <div className="pt-2.5 border-t border-muc-tim/10">
                    <div className="text-sm text-nau-go-dam font-semibold mb-1.5">{T.t87}</div>
                    <div className="max-h-24 overflow-y-auto space-y-1 font-mono text-sm text-muc-tim-dam pr-1">
                      {accumHistory.slice(-6).map((item, idx) => (
                        <div key={idx} className="bg-white/70 px-2.5 py-1 rounded-[8px] border border-muc-tim/10">
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
          aria-label={T.t88}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-chu/60 backdrop-blur-sm animate-fadeIn"
          onClick={() => {
            sound.playClick();
            setShowSigModal(false);
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md md:max-w-[760px] bg-white/70 rounded-[24px] border-2 border-nau-go/30 p-6 sm:p-8 md:p-9 overflow-hidden z-10 animate-modal-pop max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-muc-tim/15">
              <h3 className="font-display font-bold text-xl text-chu">{T.t88}</h3>
              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  setShowSigModal(false);
                }}
                className="w-10 h-10 rounded-full bg-giay border border-nau-go/30 text-nau-go-dam hover:text-chu hover:bg-muc-tim/15 flex items-center justify-center transition-colors cursor-pointer"
                aria-label={T.t89}
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="mt-5 space-y-4 text-[18px] leading-[1.7] text-chu">
              <p>{T.t90}<span className="font-mono font-bold text-muc-tim-dam">r</span>{T.t91}<span className="font-mono font-bold text-muc-tim-dam">s</span>{T.t92}</p>

              {/* Khối ví dụ (nền nhạt, chữ mono cho các số) */}
              <div className="p-4 sm:p-5 bg-white/60 rounded-[16px] border border-muc-tim/30 space-y-2.5">
                <div className="font-bold text-chu">{T.t93}</div>
                <div className="space-y-1.5 text-[18px] leading-[1.7]">
                  <p>{T.t94}<span className="font-mono font-bold text-muc-tim-dam">5</span>.
                  </p>
                  <p>{T.t95}<span className="font-mono font-bold text-muc-tim-dam">5</span>{T.t96}<span className="font-mono font-bold text-muc-tim-dam">r = 20</span>{T.t97}</p>
                  <p>{T.t98}<span className="font-mono font-bold text-vang-dam">12</span>{T.t99}<span className="font-mono font-bold text-muc-tim-dam">s = 1</span>.
                  </p>
                  <p>{T.t100}<span className="font-mono font-bold text-muc-tim-dam">(r: 20, s: 1)</span>{T.t101}</p>
                </div>
              </div>

              {/* Khối "Vì sao không ai giả được" */}
              <div className="space-y-2">
                <div className="font-bold text-chu">{T.t102}</div>
                <p>{T.t103}<span className="font-mono font-bold text-muc-tim-dam">18</span>{T.t104}<span className="font-mono font-bold text-muc-tim-dam">r</span>{T.t91}<span className="font-mono font-bold text-muc-tim-dam">s</span>{T.t105}</p>
                <p>{T.t106}<span className="font-mono font-bold text-vang-dam">12</span>{T.t107}<span className="font-mono font-bold text-muc-tim-dam">s</span>{T.t108}<span className="font-mono font-bold text-muc-tim-dam">18</span>{T.t109}</p>
                <p>{T.t110}</p>
              </div>

              {/* Dòng cuối, chữ nghiêng */}
              <p className="italic text-nau-go-dam">{T.t111}</p>

              {/* Nút đóng "Đã hiểu" */}
              <div className="mt-6 flex justify-end">
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => {
                    sound.playClick();
                    setShowSigModal(false);
                  }}
                >{T.t112}</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
