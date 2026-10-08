import React from 'react';
import { Avatar, DraggableCard } from '@so-chung/core';
import { bai3Texts } from '@so-chung/core/content/lessons/bai-3';
import type { Signature } from '@so-chung/core/lessons/bai-3/logic';
import { portraitOf, tenNhan } from './nguoi';

const T = bai3Texts.thegiaodich;

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
  const getSenderDisplay = () => senderName || tenNhan(senderId);

  return (
    <div
      className={`
        bg-white/70 rounded-[18px] border-2 p-4 sm:p-5 transition-all duration-200 relative
        ${
          isSelected
            ? 'border-muc-tim ring-2 ring-muc-tim/30 bg-white/60'
            : 'border-nau-go/30 hover:border-nau-go/40'
        }
        ${
          resultState === 'correct'
            ? 'border-xanh-la-dam bg-xanh-la/10'
            : resultState === 'wrong'
            ? 'border-do-son bg-do-son/10'
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
            <div className="flex items-center justify-between gap-2 mb-3 pb-2.5 border-b border-giay">
              <div className="flex items-center gap-2.5">
                <Avatar portrait={portraitOf(senderId)} size="sm" />
                <div>
                  <div className="text-sm text-nau-go-dam font-medium">{T.t04}</div>
                  <div className="font-display font-extrabold text-base text-chu">
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
                    min-h-[40px] px-3.5 py-1.5 rounded-[12px] font-display font-bold text-sm sm:text-sm transition-all cursor-pointer flex items-center justify-center
                    ${
                      isSelected
                        ? 'bg-muc-tim text-white shadow-xs'
                        : 'bg-muc-tim/10 text-muc-tim-dam hover:bg-muc-tim/30'
                    }
                  `}
                >
                  {isSelected ? T.t05 : T.t06}
                </button>
              )}
            </div>

            {/* Nội dung giao dịch */}
            <div className="p-3.5 bg-white/60 rounded-[14px] border border-muc-tim/10 mb-3.5">
              <div className="text-sm text-nau-go-dam font-semibold mb-1">{T.t07}</div>
              <div className="font-display font-extrabold text-lg text-chu leading-snug">
                {message}
              </div>
            </div>

            {/* Con dấu chữ ký số màu mực tím */}
            <div className="p-3 bg-muc-tim/5 rounded-[14px] border border-muc-tim/30 mb-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full border border-muc-tim text-muc-tim-dam flex items-center justify-center text-sm font-bold shrink-0">
                    ✍️
                  </span>
                  <span className="text-sm sm:text-sm font-bold text-muc-tim-dam">{T.t08}</span>
                </div>
                <div className="font-mono font-bold text-base text-muc-tim-dam">
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
                    className="inline-flex items-center gap-1.5 text-sm font-bold text-muc-tim-dam hover:text-muc-tim-dam underline underline-offset-2 decoration-muc-tim-dam/60 hover:decoration-muc-tim-dam px-2.5 py-1 rounded-[8px] border border-muc-tim/30 bg-white/70 hover:bg-white/60 transition-all cursor-pointer shadow-xs min-h-[36px]"
                  >
                    <span>💡</span>
                    <span>{T.t09}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </DraggableCard>
      ) : (
        <>
          {/* Header: Người gửi */}
          <div className="flex items-center justify-between gap-2 mb-3 pb-2.5 border-b border-giay">
            <div className="flex items-center gap-2.5">
              <Avatar portrait={portraitOf(senderId)} size="sm" />
              <div>
                <div className="text-sm text-nau-go-dam font-medium">{T.t04}</div>
                <div className="font-display font-extrabold text-base text-chu">
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
                  min-h-[40px] px-3.5 py-1.5 rounded-[12px] font-display font-bold text-sm sm:text-sm transition-all cursor-pointer flex items-center justify-center
                  ${
                    isSelected
                      ? 'bg-muc-tim text-white shadow-xs'
                      : 'bg-muc-tim/10 text-muc-tim-dam hover:bg-muc-tim/30'
                  }
                `}
              >
                {isSelected ? T.t05 : T.t06}
              </button>
            )}
          </div>

          {/* Nội dung giao dịch */}
          <div className="p-3.5 bg-white/60 rounded-[14px] border border-muc-tim/10 mb-3.5">
            <div className="text-sm text-nau-go-dam font-semibold mb-1">{T.t07}</div>
            <div className="font-display font-extrabold text-lg text-chu leading-snug">
              {message}
            </div>
          </div>

          {/* Con dấu chữ ký số màu mực tím */}
          <div className="p-3 bg-muc-tim/5 rounded-[14px] border border-muc-tim/30 mb-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full border border-muc-tim text-muc-tim-dam flex items-center justify-center text-sm font-bold shrink-0">
                  ✍️
                </span>
                <span className="text-sm sm:text-sm font-bold text-muc-tim-dam">{T.t08}</span>
              </div>
              <div className="font-mono font-bold text-base text-muc-tim-dam">
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
                  className="inline-flex items-center gap-1.5 text-sm font-bold text-muc-tim-dam hover:text-muc-tim-dam underline underline-offset-2 decoration-muc-tim-dam/60 hover:decoration-muc-tim-dam px-2.5 py-1 rounded-[8px] border border-muc-tim/30 bg-white/70 hover:bg-white/60 transition-all cursor-pointer shadow-xs min-h-[36px]"
                >
                  <span>💡</span>
                  <span>{T.t09}</span>
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* Thẻ đính kèm (nếu có) */}
      {attachedKey !== undefined && (
        <div className="p-3 bg-vang/15 rounded-[14px] border border-vang/60 flex flex-wrap items-center justify-between gap-2.5 mb-3.5 mt-2.5">
          <div className="flex items-center gap-2 text-sm text-nau-go-dam">
            <span className="text-base">📎</span>
            <span className="font-medium">{T.t10}</span>
            {enableDrag ? (
              <DraggableCard id={`attached-key-${attachedKey}`} className="inline-block">
                <span
                  className="inline-flex items-center justify-center min-h-[40px] px-3 font-mono font-extrabold text-xl text-nau-go-dam bg-white/70 rounded-[10px] border-2 border-vang/60 cursor-grab active:cursor-grabbing hover:border-vang-dam shadow-xs"
                  title={T.t11}
                >
                  {attachedKey}
                </span>
              </DraggableCard>
            ) : (
              <span className="inline-flex items-center justify-center min-h-[40px] px-3 font-mono font-extrabold text-xl text-nau-go-dam bg-white/70 rounded-[10px] border-2 border-vang/60 shadow-xs">
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
              className="min-h-[40px] px-3.5 text-sm font-bold bg-vang-dam text-white rounded-[10px] hover:bg-vang-dam transition-colors flex items-center justify-center cursor-pointer shadow-xs"
            >{T.t12}</button>
          )}
        </div>
      )}

      {/* Nút lựa chọn Thật / Giả (Màn Trung bình) */}
      {showDecisionButtons && onDecisionChange && (
        <div className="pt-3 border-t border-giay flex items-center gap-3">
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => onDecisionChange('real')}
            className={`
              flex-1 min-h-[44px] py-2 px-3 rounded-[12px] border-2 font-display font-bold text-base flex items-center justify-center gap-2 transition-all cursor-pointer
              ${
                decision === 'real'
                  ? 'bg-xanh-la-dam text-white border-xanh-la-dam'
                  : 'bg-white/70 text-xanh-la-dam border-xanh-la-dam/40 hover:bg-xanh-la/10'
              }
            `}
          >
            <span className="text-lg">✅</span>{T.t13}</button>
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => onDecisionChange('fake')}
            className={`
              flex-1 min-h-[44px] py-2 px-3 rounded-[12px] border-2 font-display font-bold text-base flex items-center justify-center gap-2 transition-all cursor-pointer
              ${
                decision === 'fake'
                  ? 'bg-do-son text-white border-do-son'
                  : 'bg-white/70 text-do-son-dam border-do-son/40 hover:bg-do-son/10'
              }
            `}
          >
            <span className="text-lg">❌</span>{T.t14}</button>
        </div>
      )}
    </div>
  );
};
