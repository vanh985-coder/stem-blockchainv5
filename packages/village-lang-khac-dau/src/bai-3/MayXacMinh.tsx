import React from 'react';
import { Button, DroppableSlot, fmt } from '@so-chung/core';
import { bai3Texts } from '@so-chung/core/content/lessons/bai-3';

const T = bai3Texts.mayxacminh;

export interface MayXacMinhResult {
  valid: boolean;
  testedKey: number;
  message: string;
  senderName?: string;
  ownerName?: string; // Người sở hữu khóa theo danh bạ (nếu có)
  isAttachedKey?: boolean;
}

export interface MayXacMinhProps {
  mode?: 'easy' | 'medium';
  droppable?: boolean;
  slot1Key?: number | null;
  slot2Tx?: {
    senderName?: string;
    message: string;
    sig: { r: number; s: number };
    attachedKey?: number;
  } | null;
  onClearSlot1?: () => void;
  onClearSlot2?: () => void;
  isVerifying?: boolean;
  onVerify?: () => void;
  result?: MayXacMinhResult | null;
  onHowToUse?: () => void;
  className?: string;
}

export const MayXacMinh: React.FC<MayXacMinhProps> = ({
  mode = 'medium',
  droppable = false,
  slot1Key = null,
  slot2Tx = null,
  onClearSlot1,
  onClearSlot2,
  isVerifying = false,
  onVerify,
  result = null,
  onHowToUse,
  className = '',
}) => {
  // mode có thể dùng để điều chỉnh giao diện nếu cần
  void mode;
  // Trạng thái đèn LED: 'idle' | 'valid' | 'invalid'
  const ledState = isVerifying
    ? 'verifying'
    : result
    ? result.valid
      ? 'valid'
      : 'invalid'
    : 'idle';

  return (
    <div
      className={`bg-chu text-white rounded-[22px] border-3 border-[#1E1B2E] p-4 sm:p-5 relative overflow-hidden ${className}`}
    >
      {/* Nắp máy & Đèn tín hiệu */}
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-white/10 mb-4">
        <div className="flex items-center gap-2.5">
          <span className="text-2xl">⚙️</span>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-display font-extrabold text-base sm:text-lg tracking-wide text-white">{T.t01}</h3>
              {onHowToUse && (
                <button
                  type="button"
                  onClick={onHowToUse}
                  className="px-2.5 py-1 rounded-full text-sm font-semibold text-violet-200 hover:text-white bg-white/10 hover:bg-white/20 border border-white/20 transition-all cursor-pointer min-h-[32px] flex items-center"
                >{T.t02}</button>
              )}
            </div>
            <p className="text-sm text-[#A69EBF]">{T.t03}</p>
          </div>
        </div>

        {/* 3 Đèn LED tín hiệu */}
        <div className="flex items-center gap-1.5 bg-[#1C182B] px-3 py-1.5 rounded-full border border-white/10 shrink-0">
          {/* Đèn vàng/chờ */}
          <div
            className={`w-3.5 h-3.5 rounded-full transition-all duration-300 ${
              ledState === 'idle' || ledState === 'verifying'
                ? 'bg-vang shadow-[0_0_8px_#FFC21A]'
                : 'bg-[#554E6D]'
            }`}
            title={T.t04}
          />
          {/* Đèn xanh/hợp lệ */}
          <div
            className={`w-3.5 h-3.5 rounded-full transition-all duration-300 ${
              ledState === 'valid'
                ? 'bg-xanh-la-dam shadow-[0_0_10px_#1FAF5A]'
                : 'bg-[#1C4D2E]'
            }`}
            title={T.t05}
          />
          {/* Đèn đỏ/không khớp */}
          <div
            className={`w-3.5 h-3.5 rounded-full transition-all duration-300 ${
              ledState === 'invalid'
                ? 'bg-do-son shadow-[0_0_10px_#E5484D]'
                : 'bg-[#521C22]'
            }`}
            title={T.t06}
          />
        </div>
      </div>

      {/* Khu vực Bánh răng quay và các khe nạp */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-4">
        {/* Khe 1: Khóa công khai */}
        {droppable ? (
          <DroppableSlot
            id="slot-key"
            placeholder={T.t07}
            className="!bg-[#1C182B] !border-white/10 rounded-[16px] p-3.5 sm:p-4 flex flex-col justify-between min-h-[115px] !items-stretch"
          >
            <div className="flex items-center justify-between text-sm text-[#A69EBF] font-bold mb-2">
              <span>{T.t08}</span>
              {slot1Key !== null && onClearSlot1 && !isVerifying && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClearSlot1();
                  }}
                  className="text-do-son-dam hover:text-white text-sm px-2 py-0.5 rounded min-h-[32px] flex items-center cursor-pointer font-bold"
                  title={T.t10}
                >{T.t09}</button>
              )}
            </div>

            {slot1Key !== null ? (
              <div className="flex items-center justify-between bg-muc-tim text-white p-2.5 rounded-[12px] border border-[#7B61FF]">
                <span className="font-medium text-sm">{T.t11}</span>
                <span className="font-mono font-extrabold text-xl px-3 py-1 bg-white/20 rounded-[8px]">
                  {slot1Key}
                </span>
              </div>
            ) : (
              <div className="border border-dashed border-white/20 rounded-[12px] p-3 text-center text-sm sm:text-sm text-[#8A82A5] my-auto">{T.t12}</div>
            )}
          </DroppableSlot>
        ) : (
          <div className="bg-[#1C182B] rounded-[16px] p-3.5 sm:p-4 border border-white/10 flex flex-col justify-between min-h-[115px]">
            <div className="flex items-center justify-between text-sm text-[#A69EBF] font-bold mb-2">
              <span>{T.t08}</span>
              {slot1Key !== null && onClearSlot1 && !isVerifying && (
                <button
                  type="button"
                  onClick={onClearSlot1}
                  className="text-do-son-dam hover:text-white text-sm px-2 py-0.5 rounded min-h-[32px] flex items-center cursor-pointer font-bold"
                  title={T.t10}
                >{T.t09}</button>
              )}
            </div>

            {slot1Key !== null ? (
              <div className="flex items-center justify-between bg-muc-tim text-white p-2.5 rounded-[12px] border border-[#7B61FF]">
                <span className="font-medium text-sm">{T.t11}</span>
                <span className="font-mono font-extrabold text-xl px-3 py-1 bg-white/20 rounded-[8px]">
                  {slot1Key}
                </span>
              </div>
            ) : (
              <div className="border border-dashed border-white/20 rounded-[12px] p-3 text-center text-sm sm:text-sm text-[#8A82A5] my-auto">{T.t13}</div>
            )}
          </div>
        )}

        {/* Khe 2: Giao dịch */}
        {droppable ? (
          <DroppableSlot
            id="slot-tx"
            placeholder={T.t14}
            className="!bg-[#1C182B] !border-white/10 rounded-[16px] p-3.5 sm:p-4 flex flex-col justify-between min-h-[115px] !items-stretch"
          >
            <div className="flex items-center justify-between text-sm text-[#A69EBF] font-bold mb-2">
              <span>{T.t15}</span>
              {slot2Tx && onClearSlot2 && !isVerifying && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClearSlot2();
                  }}
                  className="text-do-son-dam hover:text-white text-sm px-2 py-0.5 rounded min-h-[32px] flex items-center cursor-pointer font-bold"
                  title={T.t16}
                >{T.t09}</button>
              )}
            </div>

            {slot2Tx ? (
              <div className="bg-[#2D2644] p-2.5 rounded-[12px] border border-white/15 text-sm sm:text-sm">
                <div className="font-display font-extrabold text-white text-sm sm:text-base truncate">
                  {slot2Tx.senderName || T.t17}
                </div>
                <div className="text-sm sm:text-sm text-violet-200 truncate mt-0.5">
                  "{slot2Tx.message}"
                </div>
              </div>
            ) : (
              <div className="border border-dashed border-white/20 rounded-[12px] p-3 text-center text-sm sm:text-sm text-[#8A82A5] my-auto">{T.t18}</div>
            )}
          </DroppableSlot>
        ) : (
          <div className="bg-[#1C182B] rounded-[16px] p-3.5 sm:p-4 border border-white/10 flex flex-col justify-between min-h-[115px]">
            <div className="flex items-center justify-between text-sm text-[#A69EBF] font-bold mb-2">
              <span>{T.t15}</span>
              {slot2Tx && onClearSlot2 && !isVerifying && (
                <button
                  type="button"
                  onClick={onClearSlot2}
                  className="text-do-son-dam hover:text-white text-sm px-2 py-0.5 rounded min-h-[32px] flex items-center cursor-pointer font-bold"
                  title={T.t16}
                >{T.t09}</button>
              )}
            </div>

            {slot2Tx ? (
              <div className="bg-[#2D2644] p-2.5 rounded-[12px] border border-white/15 text-sm sm:text-sm">
                <div className="font-display font-extrabold text-white text-sm sm:text-base truncate">
                  {slot2Tx.senderName || T.t17}
                </div>
                <div className="text-sm sm:text-sm text-violet-200 truncate mt-0.5">
                  "{slot2Tx.message}"
                </div>
              </div>
            ) : (
              <div className="border border-dashed border-white/20 rounded-[12px] p-3 text-center text-sm sm:text-sm text-[#8A82A5] my-auto">{T.t19}</div>
            )}
          </div>
        )}
      </div>

      {/* Bánh răng quay cơ khí (hoạt ảnh khi đang kiểm tra) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#1A1628] rounded-[16px] p-3.5 sm:p-4 mb-4 border border-white/5">
        <div className="flex items-center gap-3">
          <div className="relative w-8 h-8 shrink-0">
            <svg
              className={`w-6 h-6 text-[#A69EBF] absolute top-0 left-0 ${
                isVerifying ? 'animate-spin' : ''
              }`}
              style={{ animationDuration: '2s' }}
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12 15.5A3.5 3.5 0 0 1 8.5 12A3.5 3.5 0 0 1 12 8.5a3.5 3.5 0 0 1 3.5 3.5a3.5 3.5 0 0 1-3.5 3.5m7.43-2.53c.04-.32.07-.64.07-.97 0-.33-.03-.66-.07-1l2.11-1.63c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.31-.61-.22l-2.49 1c-.52-.39-1.06-.73-1.69-.98l-.37-2.65A.506.506 0 0 0 14 2h-4c-.25 0-.46.18-.5.42l-.37 2.65c-.63.25-1.17.59-1.69.98l-2.49-1c-.22-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64L4.57 11c-.04.34-.07.67-.07 1 0 .33.03.65.07.97l-2.11 1.66c-.19.15-.25.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1.01c.52.4 1.06.74 1.69.99l.37 2.65c.04.24.25.42.5.42h4c.25 0 .46-.18.5-.42l.37-2.65c.63-.26 1.17-.59 1.69-.99l2.49 1.01c.22.08.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.66Z" />
            </svg>
            <svg
              className={`w-4 h-4 text-[#7B61FF] absolute bottom-0 right-0 ${
                isVerifying ? 'animate-spin' : ''
              }`}
              style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12 15.5A3.5 3.5 0 0 1 8.5 12A3.5 3.5 0 0 1 12 8.5a3.5 3.5 0 0 1 3.5 3.5a3.5 3.5 0 0 1-3.5 3.5m7.43-2.53c.04-.32.07-.64.07-.97 0-.33-.03-.66-.07-1l2.11-1.63c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.31-.61-.22l-2.49 1c-.52-.39-1.06-.73-1.69-.98l-.37-2.65A.506.506 0 0 0 14 2h-4c-.25 0-.46.18-.5.42l-.37 2.65c-.63.25-1.17.59-1.69.98l-2.49-1c-.22-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64L4.57 11c-.04.34-.07.67-.07 1 0 .33.03.65.07.97l-2.11 1.66c-.19.15-.25.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1.01c.52.4 1.06.74 1.69.99l.37 2.65c.04.24.25.42.5.42h4c.25 0 .46-.18.5-.42l.37-2.65c.63-.26 1.17-.59 1.69-.99l2.49 1.01c.22.08.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.66Z" />
            </svg>
          </div>
          <div className="text-sm sm:text-sm text-[#A69EBF]">
            {isVerifying
              ? T.t20
              : T.t21}
          </div>
        </div>

        {onVerify && (
          <Button
            variant="primary"
            size="md"
            disabled={!slot1Key || !slot2Tx || isVerifying}
            onClick={onVerify}
            className="w-full sm:w-auto"
          >{T.t22}</Button>
        )}
      </div>

      {/* Khe in phiếu kết quả (Ticket Printer) */}
      {result && (
        <div className="mt-4 pt-3.5 border-t border-dashed border-white/20 animate-fadeIn">
          <div className="text-sm font-mono tracking-wider text-[#A69EBF] mb-2 flex items-center justify-between">
            <span>{T.t23}</span>
            <span>{fmt(T.t24, { testedKey: result.testedKey })}</span>
          </div>

          <div
            className={`
              p-4 rounded-[14px] border font-display text-sm sm:text-base leading-snug
              ${
                result.valid
                  ? 'bg-xanh-la-dam/15 border-xanh-la-dam text-white'
                  : 'bg-do-son/15 border-do-son text-white'
              }
            `}
          >
            <div className="flex items-center gap-2 font-extrabold text-base sm:text-lg mb-2">
              <span>{result.valid ? '✓' : '✗'}</span>
              <span className={result.valid ? 'text-[#4ADE80]' : 'text-[#FF8787]'}>
                {result.valid ? T.t25 : T.t26}
              </span>
            </div>

            <div className="text-sm sm:text-sm text-violet-200 space-y-1.5">
              <div>
                <span className="text-[#A69EBF]">{T.t27}</span>
                <span className="font-mono font-bold text-base text-white">{result.testedKey}</span>
                {result.ownerName && (
                  <span className="text-vang"> ({result.ownerName})</span>
                )}
              </div>
              <div>
                <span className="text-[#A69EBF]">{T.t28}</span>
                {result.valid ? (
                  <span>{T.t29}<strong className="text-[#4ADE80]">{T.t31}</strong>{fmt(T.t30, { testedKey: result.testedKey })}</span>
                ) : (
                  <span>{T.t29}<strong className="text-[#FF8787]">{T.t33}</strong>{fmt(T.t32, { testedKey: result.testedKey })}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
