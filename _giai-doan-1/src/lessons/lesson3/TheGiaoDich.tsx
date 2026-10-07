import React from 'react';
import { Avatar, CharacterType } from '../../components/ui/Avatar';
import { Signature } from './logic';
import { DraggableCard } from '../../components/game/TapOrDrag';

export interface TheGiaoDichProps {
  id?: string;
  senderId: 'an' | 'binh' | 'chi' | 'dung' | 'ti' | 'em';
  senderName?: string;
  message: string;
  sig: Signature;
  attachedKey?: number;
  isSelected?: boolean;
  onSelect?: () => void;
  onSelectAttachedKey?: (key: number) => void;
  decision?: 'real' | 'fake' | null;
  onDecisionChange?: (decision: 'real' | 'fake') => void;
  resultState?: 'correct' | 'wrong' | null;
  showDecisionButtons?: boolean;
  enableDrag?: boolean;
  className?: string;
  onExplainSig?: () => void;
}

export const TheGiaoDich: React.FC<TheGiaoDichProps> = ({
  id,
  senderId,
  senderName,
  message,
  sig,
  attachedKey,
  isSelected = false,
  onSelect,
  onSelectAttachedKey,
  decision = null,
  onDecisionChange,
  resultState = null,
  showDecisionButtons = false,
  enableDrag = false,
  className = '',
  onExplainSig,
}) => {
  const getSenderDisplay = () => {
    if (senderName) return senderName;
    switch (senderId) {
      case 'an': return 'An 🎒';
      case 'binh': return 'Bình 🐢';
      case 'chi': return 'Chi 🐇';
      case 'dung': return 'Dũng ⚽';
      case 'ti': return 'Tí 🦊';
      case 'em': return 'Em ⭐';
      default: return senderId;
    }
  };

  return (
    <div
      className={`
        bg-white rounded-[18px] border-2 p-4 sm:p-5 transition-all duration-200 relative
        ${
          isSelected
            ? 'border-[#5B3FD6] ring-2 ring-[#5B3FD6]/30 shadow-sticker-md bg-[#FAF9FF]'
            : 'border-[#E3E0EE] hover:border-[#D0CCE0] shadow-sticker-sm'
        }
        ${
          resultState === 'correct'
            ? 'border-[#1FAF5A] bg-[#F0FDF4]'
            : resultState === 'wrong'
            ? 'border-[#E5484D] bg-[#FFF0ED]'
            : ''
        }
        ${className}
      `}
    >
      {/* Nội dung chính của Thẻ (Header + Message + Signature) */}
      {enableDrag && id ? (
        <DraggableCard id={`tx-${id}`} className="rounded-[14px] -m-1 p-1">
          <div className="cursor-grab active:cursor-grabbing">
            {/* Header: Người gửi */}
            <div className="flex items-center justify-between gap-2 mb-3 pb-2.5 border-b border-[#F0EEF8]">
              <div className="flex items-center gap-2.5">
                <Avatar character={senderId as CharacterType} size="sm" showName={false} />
                <div>
                  <div className="text-xs text-[#6B6485] font-medium">Người gửi</div>
                  <div className="font-display font-black text-base text-[#2A2340]">
                    {getSenderDisplay()}
                  </div>
                </div>
              </div>

              {onSelect && (
                <button
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect();
                  }}
                  className={`
                    min-h-[40px] px-3.5 py-1.5 rounded-[12px] font-display font-bold text-xs sm:text-sm transition-all cursor-pointer flex items-center justify-center
                    ${
                      isSelected
                        ? 'bg-[#5B3FD6] text-white shadow-xs'
                        : 'bg-[#EDE9FE] text-[#5B3FD6] hover:bg-[#DDD6FE]'
                    }
                  `}
                >
                  {isSelected ? '✓ Đang trong máy' : 'Đưa vào máy'}
                </button>
              )}
            </div>

            {/* Nội dung giao dịch */}
            <div className="p-3.5 bg-[#FAF9FF] rounded-[14px] border border-[#EDE9FE] mb-3.5">
              <div className="text-xs text-[#6B6485] font-semibold mb-1">
                Nội dung
              </div>
              <div className="font-display font-black text-lg text-[#2A2340] leading-snug">
                {message}
              </div>
            </div>

            {/* Con dấu chữ ký số màu mực tím */}
            <div className="p-3 bg-[#F5F3FF] rounded-[14px] border border-[#DDD6FE] mb-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full border border-[#5B3FD6] text-[#5B3FD6] flex items-center justify-center text-xs font-bold shrink-0">
                    ✍️
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-[#5B3FD6]">Chữ ký số:</span>
                </div>
                <div className="font-mono font-bold text-base text-[#5B3FD6]">
                  (r: {sig.r}, s: {sig.s})
                </div>
              </div>

              {onExplainSig && (
                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      onExplainSig();
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#5B3FD6] hover:text-[#4329B8] underline underline-offset-2 decoration-[#5B3FD6]/60 hover:decoration-[#5B3FD6] px-2.5 py-1 rounded-[8px] border border-[#DDD6FE] bg-white hover:bg-[#FAF9FF] transition-all cursor-pointer shadow-xs min-h-[36px]"
                  >
                    <span>💡</span>
                    <span>r và s là gì?</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </DraggableCard>
      ) : (
        <>
          {/* Header: Người gửi */}
          <div className="flex items-center justify-between gap-2 mb-3 pb-2.5 border-b border-[#F0EEF8]">
            <div className="flex items-center gap-2.5">
              <Avatar character={senderId as CharacterType} size="sm" showName={false} />
              <div>
                <div className="text-xs text-[#6B6485] font-medium">Người gửi</div>
                <div className="font-display font-black text-base text-[#2A2340]">
                  {getSenderDisplay()}
                </div>
              </div>
            </div>

            {onSelect && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect();
                }}
                className={`
                  min-h-[40px] px-3.5 py-1.5 rounded-[12px] font-display font-bold text-xs sm:text-sm transition-all cursor-pointer flex items-center justify-center
                  ${
                    isSelected
                      ? 'bg-[#5B3FD6] text-white shadow-xs'
                      : 'bg-[#EDE9FE] text-[#5B3FD6] hover:bg-[#DDD6FE]'
                  }
                `}
              >
                {isSelected ? '✓ Đang trong máy' : 'Đưa vào máy'}
              </button>
            )}
          </div>

          {/* Nội dung giao dịch */}
          <div className="p-3.5 bg-[#FAF9FF] rounded-[14px] border border-[#EDE9FE] mb-3.5">
            <div className="text-xs text-[#6B6485] font-semibold mb-1">
              Nội dung
            </div>
            <div className="font-display font-black text-lg text-[#2A2340] leading-snug">
              {message}
            </div>
          </div>

          {/* Con dấu chữ ký số màu mực tím */}
          <div className="p-3 bg-[#F5F3FF] rounded-[14px] border border-[#DDD6FE] mb-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full border border-[#5B3FD6] text-[#5B3FD6] flex items-center justify-center text-xs font-bold shrink-0">
                  ✍️
                </span>
                <span className="text-xs sm:text-sm font-bold text-[#5B3FD6]">Chữ ký số:</span>
              </div>
              <div className="font-mono font-bold text-base text-[#5B3FD6]">
                (r: {sig.r}, s: {sig.s})
              </div>
            </div>

            {onExplainSig && (
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    onExplainSig();
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#5B3FD6] hover:text-[#4329B8] underline underline-offset-2 decoration-[#5B3FD6]/60 hover:decoration-[#5B3FD6] px-2.5 py-1 rounded-[8px] border border-[#DDD6FE] bg-white hover:bg-[#FAF9FF] transition-all cursor-pointer shadow-xs min-h-[36px]"
                >
                  <span>💡</span>
                  <span>r và s là gì?</span>
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* Thẻ đính kèm (nếu có) */}
      {attachedKey !== undefined && (
        <div className="p-3 bg-[#FFFBEB] rounded-[14px] border border-[#FDE68A] flex flex-wrap items-center justify-between gap-2.5 mb-3.5 mt-2.5">
          <div className="flex items-center gap-2 text-xs text-[#92400E]">
            <span className="text-base">📎</span>
            <span className="font-medium">Khóa đính kèm:</span>
            {enableDrag ? (
              <DraggableCard id={`attached-key-${attachedKey}`} className="inline-block">
                <span
                  className="inline-flex items-center justify-center min-h-[40px] px-3 font-mono font-black text-xl text-[#92400E] bg-white rounded-[10px] border-2 border-[#FDE68A] cursor-grab active:cursor-grabbing hover:border-[#D9A000] shadow-xs"
                  title="Kéo hoặc chạm để đưa vào Khe Khóa"
                >
                  {attachedKey}
                </span>
              </DraggableCard>
            ) : (
              <span className="inline-flex items-center justify-center min-h-[40px] px-3 font-mono font-black text-xl text-[#92400E] bg-white rounded-[10px] border-2 border-[#FDE68A] shadow-xs">
                {attachedKey}
              </span>
            )}
          </div>

          {onSelectAttachedKey && (
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onSelectAttachedKey(attachedKey);
              }}
              className="min-h-[40px] px-3.5 text-xs font-bold bg-[#D9A000] text-white rounded-[10px] hover:bg-[#B45309] transition-colors flex items-center justify-center cursor-pointer shadow-xs"
            >
              Thử khóa này
            </button>
          )}
        </div>
      )}

      {/* Nút lựa chọn Thật / Giả (Màn Trung bình) */}
      {showDecisionButtons && onDecisionChange && (
        <div className="pt-3 border-t border-[#F0EEF8] flex items-center gap-3">
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => onDecisionChange('real')}
            className={`
              flex-1 min-h-[44px] py-2 px-3 rounded-[12px] border-2 font-display font-bold text-base flex items-center justify-center gap-2 transition-all cursor-pointer
              ${
                decision === 'real'
                  ? 'bg-[#1FAF5A] text-white border-[#1FAF5A] shadow-sticker-sm'
                  : 'bg-white text-[#1FAF5A] border-[#1FAF5A]/40 hover:bg-[#F0FDF4]'
              }
            `}
          >
            <span className="text-lg">✅</span> Thật
          </button>
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => onDecisionChange('fake')}
            className={`
              flex-1 min-h-[44px] py-2 px-3 rounded-[12px] border-2 font-display font-bold text-base flex items-center justify-center gap-2 transition-all cursor-pointer
              ${
                decision === 'fake'
                  ? 'bg-[#E5484D] text-white border-[#E5484D] shadow-sticker-sm'
                  : 'bg-white text-[#E5484D] border-[#E5484D]/40 hover:bg-[#FFF0ED]'
              }
            `}
          >
            <span className="text-lg">❌</span> Giả
          </button>
        </div>
      )}
    </div>
  );
};
