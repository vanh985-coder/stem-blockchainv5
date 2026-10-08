import { useState, useRef, useMemo } from 'react';
import { Button, FeedbackSheet, Modal, TapOrDragContainer, fmt, sound, useAuth, type StationResult, rich } from '@so-chung/core';
import { bai3Texts } from '@so-chung/core/content/lessons/bai-3';
import { createMulberry32 } from '@so-chung/core/lib/rng';
import { generateMedium, verify, PEOPLE, STRANGER, type MediumTx } from '@so-chung/core/lessons/bai-3/logic';
import { DanhBa } from './DanhBa';
import { TheGiaoDich } from './TheGiaoDich';
import { MayXacMinh, type MayXacMinhResult } from './MayXacMinh';
import { tenNhan } from './nguoi';

const T = bai3Texts.tramTb;

export function Medium({ onComplete }: { onComplete: (r: StationResult) => void; onFail?: (tip: string) => void }) {
  const { profile } = useAuth();
  const myName = fmt('{Ten}', { ten: profile?.display_name });

  const startTimeRef = useRef(Date.now());
  const seedCounterRef = useRef(Date.now());

  // Modal hướng dẫn cách dùng máy
  const [showHowToUseModal, setShowHowToUseModal] = useState(false);

  // Số lần thử nộp bài (bắt đầu từ 1)
  const [attempts, setAttempts] = useState(1);

  // Tạo 4 giao dịch
  const [txList, setTxList] = useState<MediumTx[]>(() => {
    const rng = createMulberry32(seedCounterRef.current);
    return generateMedium(rng, myName);
  });

  // Lựa chọn Thật / Giả của học sinh cho từng giao dịch: { [txId]: 'real' | 'fake' | null }
  const [decisions, setDecisions] = useState<Record<string, 'real' | 'fake' | null>>({});

  // Trạng thái của Máy xác minh
  const [slot1Key, setSlot1Key] = useState<number | null>(null);
  const [selectedTxId, setSelectedTxId] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<MayXacMinhResult | null>(null);

  // Cảnh báo lần đầu tiên chọn khóa đính kèm
  const [hasSeenAttachedKeyWarning, setHasSeenAttachedKeyWarning] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);

  // Sheet giải thích khi nộp kết quả
  const [feedback, setFeedback] = useState<{
    isOpen: boolean;
    isCorrect: boolean;
    whatHappened: string;
    whyHappened?: string;
    howToFix?: string;
  }>({
    isOpen: false,
    isCorrect: false,
    whatHappened: '',
  });

  // Giao dịch đang trong Slot 2
  const currentSlotTx = useMemo(() => {
    if (!selectedTxId) return null;
    return txList.find((t) => t.id === selectedTxId) || null;
  }, [selectedTxId, txList]);

  // Chọn khóa cho Slot 1
  const handleSelectKey = (key: number, isAttached: boolean = false) => {
    sound.playClick();
    if (isAttached && !hasSeenAttachedKeyWarning) {
      setHasSeenAttachedKeyWarning(true);
      setShowWarningModal(true);
    }
    setSlot1Key(key);
    setVerifyResult(null);
  };

  // Chọn giao dịch cho Slot 2
  const handleSelectTx = (txId: string) => {
    sound.playClick();
    setSelectedTxId(txId);
    setVerifyResult(null);
  };

  // Xử lý kéo thả / chạm đặt vào 2 khe của Máy xác minh
  const handleDropOrPlace = (itemId: string, slotId: string) => {
    if (slotId === 'slot-key') {
      if (itemId.startsWith('key-')) {
        const key = parseInt(itemId.replace('key-', ''), 10);
        if (!isNaN(key)) handleSelectKey(key, false);
      } else if (itemId.startsWith('attached-key-')) {
        const key = parseInt(itemId.replace('attached-key-', ''), 10);
        if (!isNaN(key)) handleSelectKey(key, true);
      }
    } else if (slotId === 'slot-tx') {
      if (itemId.startsWith('tx-')) {
        const txId = itemId.replace('tx-', '');
        handleSelectTx(txId);
      }
    }
  };

  // Bấm nút kiểm tra trong Máy xác minh
  const handleVerify = () => {
    if (slot1Key === null || !currentSlotTx) return;

    sound.playClick();
    setIsVerifying(true);

    setTimeout(() => {
      setIsVerifying(false);
      const isValid = verify(slot1Key, currentSlotTx.message, currentSlotTx.sig);

      // Tìm tên người sở hữu khóa theo danh bạ
      const person = PEOPLE.find((p) => p.publicKey === slot1Key);
      let ownerName: string | undefined;
      if (person) {
        ownerName = tenNhan(person.id, myName);
      } else if (slot1Key === STRANGER.publicKey) {
        ownerName = T.khoaLaKhongCoTrong;
      }

      if (isValid) {
        sound.playCorrect();
      } else {
        sound.playWrong();
      }

      setVerifyResult({
        valid: isValid,
        testedKey: slot1Key,
        message: currentSlotTx.message,
        senderName: tenNhan(currentSlotTx.senderId, myName),
        ownerName,
        isAttachedKey: slot1Key === currentSlotTx.attachedKey,
      });
    }, 350);
  };

  // Kiểm tra xem đã chọn đủ 4 thẻ chưa
  const isReadyToSubmit = useMemo(() => {
    return (
      txList.length === 4 &&
      txList.every((tx) => decisions[tx.id] === 'real' || decisions[tx.id] === 'fake')
    );
  }, [txList, decisions]);

  // Nộp kết quả thẩm định
  const handleSubmit = () => {
    sound.playClick();

    // Kiểm tra từng giao dịch
    const wrongTxs: MediumTx[] = [];
    txList.forEach((tx) => {
      const isActuallyFake = tx.isFake;
      const studentSaidFake = decisions[tx.id] === 'fake';
      if (isActuallyFake !== studentSaidFake) {
        wrongTxs.push(tx);
      }
    });

    if (wrongTxs.length === 0) {
      // Đúng hết cả 4
      sound.playLevelComplete();
      const stars = attempts === 1 ? 3 : attempts === 2 ? 2 : 1;
      const timeMs = Date.now() - startTimeRef.current;

      setFeedback({
        isOpen: true,
        isCorrect: true,
        whatHappened: T.xuatSacEmDaTham,
        whyHappened:
          T.emDaBietDoiChieu,
        howToFix: T.dayChinhLaNguyenLy,
      });

      setTimeout(() => {
        onComplete({
          stars,
          timeMs,
          learned:
            T.khongBaoGioTinKhoa,
        });
      }, 1200);
    } else {
      // Có giao dịch sai
      sound.playWrong();
      const wrongNames = wrongTxs
        .map((t) => tenNhan(t.senderId, myName))
        .join(', ');

      setFeedback({
        isOpen: true,
        isCorrect: false,
        whatHappened: fmt(T.coGiaoDichThamDinh, { so: wrongTxs.length, wrongNames }),
        whyHappened:
          T.keMaoDanhCoThe,
        howToFix:
          T.hayBamThuLaiThu,
      });
    }
  };

  // Thử lại khi sai
  const handleRetry = () => {
    seedCounterRef.current += 1;
    const rng = createMulberry32(seedCounterRef.current);
    const newTxs = generateMedium(rng, myName);
    setTxList(newTxs);
    setDecisions({});
    setSelectedTxId(null);
    setSlot1Key(null);
    setVerifyResult(null);
    setAttempts((a) => a + 1);
    setFeedback((f) => ({ ...f, isOpen: false }));
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* Header hướng dẫn */}
      <div className="bg-white/70 rounded-[18px] border-2 border-nau-go/30 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-sm font-bold bg-muc-tim/10 text-muc-tim-dam">{T.tramTrungBinh}</span>
            <span className="text-sm text-nau-go-dam">{fmt(T.lanThu, { attempts })}</span>
          </div>
          <h3 className="font-display font-extrabold text-lg sm:text-xl text-chu">{T.thamDinh4GiaoDich}</h3>
          <p className="text-sm text-nau-go-dam mt-0.5">{T.dungMayXacMinhDe}</p>
        </div>

        <Button
          variant="primary"
          size="md"
          disabled={!isReadyToSubmit}
          onClick={handleSubmit}
          className="shrink-0 w-full sm:w-auto"
        >{T.nopKetQuaThamDinh}</Button>
      </div>

      {/* Cảnh báo popup lần đầu bấm khóa đính kèm */}
      {showWarningModal && (
        <div className="p-4 bg-vang/15 rounded-[16px] border-2 border-vang/60 text-sm sm:text-sm text-nau-go-dam space-y-1.5 animate-fadeIn">
          <div className="flex items-center justify-between">
            <div className="font-bold flex items-center gap-1.5 text-sm sm:text-base text-nau-go-dam">
              <span>⚠️</span>{' '}{T.luuYQuanTrongVe}</div>
            <button
              type="button"
              onClick={() => setShowWarningModal(false)}
              className="text-nau-go-dam font-bold hover:text-black px-2 py-0.5 cursor-pointer"
            >{T.daHieu}</button>
          </div>
          <p className="leading-relaxed">{rich(T.khoaDinhKemLaDo)}</p>
        </div>
      )}

      <TapOrDragContainer onDropOrPlace={handleDropOrPlace}>
        {/* Khu vực thao tác chính: Danh bạ & Máy xác minh */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Cột trái: Danh bạ (interactive) */}
          <DanhBa
            interactive
            enableDrag
            selectedKey={slot1Key}
            onSelectKey={(key) => handleSelectKey(key, false)}
            userName={myName}
          />

          {/* Cột phải: Máy xác minh */}
          <div className="space-y-3">
            <MayXacMinh
              mode="medium"
              droppable
              slot1Key={slot1Key}
              slot2Tx={
                currentSlotTx
                  ? {
                      senderName: tenNhan(currentSlotTx.senderId, myName),
                      message: currentSlotTx.message,
                      sig: currentSlotTx.sig,
                      attachedKey: currentSlotTx.attachedKey,
                    }
                  : null
              }
              onClearSlot1={() => {
                setSlot1Key(null);
                setVerifyResult(null);
              }}
              onClearSlot2={() => {
                setSelectedTxId(null);
                setVerifyResult(null);
              }}
              isVerifying={isVerifying}
              onVerify={handleVerify}
              result={verifyResult}
              onHowToUse={() => {
                sound.playClick();
                setShowHowToUseModal(true);
              }}
            />
            <p className="text-sm text-nau-go-dam text-center font-medium">{T.keoHoacChamChon1}</p>
          </div>
        </div>

        {/* Danh sách 4 giao dịch cần thẩm định */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-display font-extrabold text-base sm:text-lg text-chu flex items-center gap-2">
              <span>📋</span>{' '}{T.so4TheGiaoDichCan}</h4>
            <span className="text-sm sm:text-sm text-nau-go-dam">{fmt(T.daChon4, { so: Object.values(decisions).filter(Boolean).length })}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {txList.map((tx) => {
              const isSelected = selectedTxId === tx.id;
              const currentDecision = decisions[tx.id] || null;

              return (
                <TheGiaoDich
                  key={tx.id}
                  id={tx.id}
                  senderId={tx.senderId}
                  message={tx.message}
                  sig={tx.sig}
                  attachedKey={tx.attachedKey}
                  isSelected={isSelected}
                  enableDrag
                  onSelect={() => handleSelectTx(tx.id)}
                  onSelectAttachedKey={(k) => handleSelectKey(k, true)}
                  showDecisionButtons
                  decision={currentDecision}
                  onDecisionChange={(dec) => {
                    sound.playClick();
                    setDecisions((prev) => ({ ...prev, [tx.id]: dec }));
                  }}
                />
              );
            })}
          </div>
        </div>
      </TapOrDragContainer>

      {/* Modal hướng dẫn cách dùng máy */}
      <Modal
        isOpen={showHowToUseModal}
        onClose={() => setShowHowToUseModal(false)}
        title={T.mayXacMinhChuKy}
        maxWidth="md"
      >
        <div className="space-y-4 text-sm text-chu">
          <div className="bg-giay p-4 rounded-[16px] border border-nau-go/30 space-y-2.5">
            <div className="flex items-start gap-2.5">
              <span className="text-base shrink-0">1️⃣</span>
              <p className="leading-relaxed">{rich(T.dua1KhoaVa1)}</p>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="text-base shrink-0">🟢</span>
              <p className="leading-relaxed">{rich(T.denXanhChuKyTren)}</p>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="text-base shrink-0">🔴</span>
              <p className="leading-relaxed">{rich(T.denDoChuKyKhong)}</p>
            </div>
          </div>

          <div className="p-3.5 bg-vang/15 rounded-[16px] border-2 border-vang/60 text-nau-go-dam space-y-1.5">
            <div className="font-bold flex items-center gap-1.5 text-sm text-nau-go-dam">
              <span>⚠️</span>{' '}{T.quanTrong}</div>
            <p className="leading-relaxed text-sm sm:text-sm">{rich(T.mayKhongPhanBietThe)}</p>
            <p className="leading-relaxed text-sm sm:text-sm font-semibold">{T.viecChonKhoaNaoDe}</p>
          </div>

          <Button
            variant="primary"
            size="md"
            fullWidth
            onClick={() => setShowHowToUseModal(false)}
          >{T.daHieu2}</Button>
        </div>
      </Modal>

      {/* Sheet phản hồi khi nộp kết quả */}
      <FeedbackSheet
        isOpen={feedback.isOpen}
        isCorrect={feedback.isCorrect}
        whatHappened={feedback.whatHappened}
        whyHappened={feedback.whyHappened}
        howToFix={feedback.howToFix}
        continueLabel={feedback.isCorrect ? T.tuyetVoi : T.thuLaiVongMoi}
        onContinue={() => {
          if (feedback.isCorrect) {
            setFeedback((f) => ({ ...f, isOpen: false }));
          } else {
            handleRetry();
          }
        }}
      />
    </div>
  );
}
