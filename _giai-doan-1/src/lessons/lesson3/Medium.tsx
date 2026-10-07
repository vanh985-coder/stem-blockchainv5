import React, { useState, useRef, useMemo } from 'react';
import { LevelProps } from '../../components/game/LessonShell';
import { useProgress } from '../../app/ProgressContext';
import { Button } from '../../components/ui/Button';
import { sound } from '../../lib/sound';
import { createMulberry32 } from '../../lib/rng';
import { TapOrDragContainer } from '../../components/game/TapOrDrag';
import {
  generateMedium,
  MediumTx,
  verify,
  PEOPLE,
  STRANGER,
} from './logic';
import { DanhBa } from './DanhBa';
import { TheGiaoDich } from './TheGiaoDich';
import { MayXacMinh, MayXacMinhResult } from './MayXacMinh';
import { FeedbackSheet } from '../../components/game/FeedbackSheet';
import { LevelIntro } from '../../components/game/LevelIntro';
import { Modal } from '../../components/ui/Modal';

export const Medium: React.FC<LevelProps> = ({ onComplete }) => {
  const { progress } = useProgress();
  const myName = progress?.userName || 'Em';

  const startTimeRef = useRef(Date.now());
  const seedCounterRef = useRef(Date.now());

  // Hướng dẫn máy xác minh khi mới vào mức (mỗi lượt chơi)
  const [showIntro, setShowIntro] = useState(true);

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
        ownerName =
          person.id === 'em'
            ? myName
            : person.id === 'an'
            ? 'An'
            : person.id === 'binh'
            ? 'Bình'
            : person.id === 'chi'
            ? 'Chi'
            : person.id === 'dung'
            ? 'Dũng'
            : 'Tí';
      } else if (slot1Key === STRANGER.publicKey) {
        ownerName = 'Khóa lạ (không có trong danh bạ)';
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
        senderName: currentSlotTx.senderId.toUpperCase(),
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
        whatHappened: 'Xuất sắc! Em đã thẩm định chính xác cả 4 giao dịch!',
        whyHappened:
          'Em đã biết đối chiếu chữ ký với Danh bạ công khai thay vì vội tin vào khóa đính kèm của kẻ mạo danh.',
        howToFix: 'Đây chính là nguyên lý bảo mật căn bản của ví blockchain!',
      });

      setTimeout(() => {
        onComplete({
          stars,
          timeMs,
          learned:
            'Không bao giờ tin khóa công khai tự đính kèm trên giao dịch. Luôn đối chiếu chữ ký với Danh bạ công khai chính thức!',
        });
      }, 1200);
    } else {
      // Có giao dịch sai
      sound.playWrong();
      const wrongNames = wrongTxs
        .map((t) => t.senderId.toUpperCase())
        .join(', ');

      setFeedback({
        isOpen: true,
        isCorrect: false,
        whatHappened: `Có ${wrongTxs.length} giao dịch thẩm định chưa đúng (${wrongNames}).`,
        whyHappened:
          'Kẻ mạo danh có thể đính kèm khóa riêng của hắn để chữ ký hợp lệ với khóa đó, nhưng khóa đó KHÔNG thuộc về người gửi trong Danh bạ chính thức!',
        howToFix:
          'Hãy bấm "Thử lại": thử từng giao dịch với đúng khóa của người gửi trong Danh bạ xem có khớp không nhé.',
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

  if (showIntro) {
    return (
      <LevelIntro
        lessonName="Bài 3: Khóa riêng & Khóa công khai"
        difficultyLabel="Trung bình"
        title="Thẩm định 4 giao dịch"
        objective={`Ví của em vừa nhận 4 giao dịch. Nhiệm vụ của em là xác định từng giao dịch là thật hay giả.\n\nCó 2 giao dịch là giả, do kẻ mạo danh ký.`}
        tip="Lấy khóa ở đâu mới đúng? Đó chính là câu hỏi của mức này."
        startLabel="Bắt đầu thẩm định"
        onStart={() => {
          sound.playClick();
          setShowIntro(false);
        }}
      />
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* Header hướng dẫn */}
      <div className="bg-white rounded-[18px] border-2 border-[#E3E0EE] p-5 shadow-sticker-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#EDE9FE] text-[#5B3FD6]">
              Màn 3.2: Trung bình
            </span>
            <span className="text-xs text-[#6B6485]">Lần thử: #{attempts}</span>
          </div>
          <h3 className="font-display font-black text-lg sm:text-xl text-[#2A2340]">
            Thẩm định 4 giao dịch: Tìm ra 2 giao dịch mạo danh
          </h3>
          <p className="text-sm text-[#6B6485] mt-0.5">
            Dùng Máy xác minh để đối chiếu chữ ký. Khóa nào đáng tin thì em tự cân nhắc.
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          disabled={!isReadyToSubmit}
          onClick={handleSubmit}
          className="shrink-0 w-full sm:w-auto"
        >
          Nộp kết quả thẩm định ➔
        </Button>
      </div>

      {/* Cảnh báo popup lần đầu bấm khóa đính kèm */}
      {showWarningModal && (
        <div className="p-4 bg-[#FFFBEB] rounded-[16px] border-2 border-[#FDE68A] text-xs sm:text-sm text-[#92400E] space-y-1.5 animate-fadeIn shadow-sticker-sm">
          <div className="flex items-center justify-between">
            <div className="font-bold flex items-center gap-1.5 text-sm sm:text-base text-[#B45309]">
              <span>⚠️</span> Lưu ý quan trọng về Khóa đính kèm!
            </div>
            <button
              type="button"
              onClick={() => setShowWarningModal(false)}
              className="text-[#92400E] font-bold hover:text-black px-2 py-0.5 cursor-pointer"
            >
              ✕ Đã hiểu
            </button>
          </div>
          <p className="leading-relaxed">
            Khóa đính kèm là do <strong>người tạo thẻ tự dán vào</strong>. Kẻ mạo danh có thể đính kèm khóa của chính hắn — chữ ký sẽ khớp với khóa này, nhưng khóa này <strong>KHÔNG CÓ trong Danh bạ</strong> của người bị mạo danh!
          </p>
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
                      senderName: currentSlotTx.senderId.toUpperCase(),
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
            <p className="text-sm text-[#6B6485] text-center font-medium">
              kéo hoặc chạm chọn: 1 khóa + 1 giao dịch
            </p>
          </div>
        </div>

        {/* Danh sách 4 giao dịch cần thẩm định */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-display font-black text-base sm:text-lg text-[#2A2340] flex items-center gap-2">
              <span>📋</span> 4 Thẻ giao dịch cần thẩm định
            </h4>
            <span className="text-xs sm:text-sm text-[#6B6485]">
              Đã chọn: {Object.values(decisions).filter(Boolean).length}/4
            </span>
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
        title="Máy xác minh chữ ký dùng thế nào?"
        maxWidth="md"
      >
        <div className="space-y-4 text-sm text-[#2A2340]">
          <div className="bg-[#F8F7FC] p-4 rounded-[16px] border border-[#E3E0EE] space-y-2.5">
            <div className="flex items-start gap-2.5">
              <span className="text-base shrink-0">1️⃣</span>
              <p className="leading-relaxed">
                Đưa <strong>1 khóa</strong> và <strong>1 giao dịch</strong> vào máy, rồi bấm <strong>"Kiểm tra chữ ký"</strong>.
              </p>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="text-base shrink-0">🟢</span>
              <p className="leading-relaxed">
                <strong>Đèn xanh:</strong> Chữ ký trên thẻ khớp với khóa em đưa vào.
              </p>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="text-base shrink-0">🔴</span>
              <p className="leading-relaxed">
                <strong>Đèn đỏ:</strong> Chữ ký không khớp với khóa em đưa vào.
              </p>
            </div>
          </div>

          <div className="p-3.5 bg-[#FFFBEB] rounded-[16px] border-2 border-[#FDE68A] text-[#92400E] space-y-1.5">
            <div className="font-bold flex items-center gap-1.5 text-sm text-[#B45309]">
              <span>⚠️</span> Quan trọng:
            </div>
            <p className="leading-relaxed text-xs sm:text-sm">
              Máy <strong>KHÔNG</strong> phân biệt thẻ thật hay thẻ giả. Máy chỉ kiểm tra chữ ký có khớp với khóa được đưa vào hay không.
            </p>
            <p className="leading-relaxed text-xs sm:text-sm font-semibold">
              Việc chọn khóa nào để đưa vào máy (khóa trong danh bạ hay khóa đính kèm) là do em quyết định.
            </p>
          </div>

          <Button
            variant="primary"
            size="md"
            fullWidth
            onClick={() => setShowHowToUseModal(false)}
          >
            Đã hiểu
          </Button>
        </div>
      </Modal>

      {/* Sheet phản hồi khi nộp kết quả */}
      <FeedbackSheet
        isOpen={feedback.isOpen}
        isCorrect={feedback.isCorrect}
        whatHappened={feedback.whatHappened}
        whyHappened={feedback.whyHappened}
        howToFix={feedback.howToFix}
        continueLabel={feedback.isCorrect ? 'Tuyệt vời!' : 'Thử lại vòng mới'}
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
};
