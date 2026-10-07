import React from 'react';
import { sound } from '../../lib/sound';

export interface NumberInputProps {
  value: number | null;
  onChange?: (val: number | null) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  label?: string;
  className?: string;
  inputClassName?: string;
  onEnter?: () => void;
  error?: string;
  ref?: React.Ref<HTMLInputElement>;
  autoFocus?: boolean;
  placeholder?: string;
  id?: string;
  showButtons?: boolean;
}

export const NumberInput: React.FC<NumberInputProps> = ({
  value,
  onChange,
  min = 0,
  max = 999999,
  step = 1,
  disabled = false,
  label,
  className = '',
  inputClassName = '',
  onEnter,
  error,
  ref,
  autoFocus = false,
  placeholder,
  id,
  showButtons = true,
}) => {
  const errorId = id ? `${id}-error` : undefined;

  const handleDecrement = () => {
    if (disabled) return;
    sound.playClick();
    const cur = value ?? min;
    const nextVal = Math.max(min, cur - step);
    onChange?.(nextVal);
  };

  const handleIncrement = () => {
    if (disabled) return;
    sound.playClick();
    const cur = value ?? (min - step);
    const nextVal = Math.min(max, cur + step);
    onChange?.(nextVal);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === '') {
      onChange?.(null);
      return;
    }
    // Chỉ nhận chữ số
    if (/^\d+$/.test(raw)) {
      const parsed = parseInt(raw, 10);
      if (!isNaN(parsed)) {
        onChange?.(parsed);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      onEnter?.();
    }
  };

  return (
    <div className={`inline-flex flex-col gap-1 ${className}`}>
      {label && (
        <span className="text-xs font-semibold text-[#6B6485]">
          {label}
        </span>
      )}
      <div className="inline-flex items-center gap-2">
        {showButtons && (
          <button
            type="button"
            disabled={disabled || (value !== null && value <= min)}
            onClick={handleDecrement}
            aria-label="Giảm một đơn vị"
            className="w-10 h-10 sm:w-12 sm:h-12 rounded-[14px] bg-white border-2 border-[#E3E0EE] border-b-4 border-b-[#D0CCE0] active:border-b-2 active:translate-y-[2px] font-display font-extrabold text-xl text-[#2A2340] hover:bg-[#F6F5FB] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-all cursor-pointer focus-visible:outline-3 focus-visible:outline-[#5B3FD6]"
          >
            −
          </button>
        )}

        <input
          ref={ref}
          id={id}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={value === null ? '' : String(value)}
          disabled={disabled}
          autoFocus={autoFocus}
          placeholder={placeholder}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          className={`
            w-20 sm:w-24 h-10 sm:h-12 text-center font-display font-extrabold text-xl sm:text-2xl text-[#5B3FD6]
            bg-white rounded-[12px] sm:rounded-[14px] border-2 transition-colors focus:outline-none
            ${error ? 'border-[#E5484D] ring-1 ring-[#E5484D]' : 'border-[#E3E0EE] focus:border-[#5B3FD6] shadow-sticker-sm'}
            disabled:opacity-50 disabled:bg-gray-100
            ${inputClassName}
          `}
        />

        {showButtons && (
          <button
            type="button"
            disabled={disabled || (value !== null && value >= max)}
            onClick={handleIncrement}
            aria-label="Tăng một đơn vị"
            className="w-10 h-10 sm:w-12 sm:h-12 rounded-[14px] bg-white border-2 border-[#E3E0EE] border-b-4 border-b-[#D0CCE0] active:border-b-2 active:translate-y-[2px] font-display font-extrabold text-xl text-[#2A2340] hover:bg-[#F6F5FB] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-all cursor-pointer focus-visible:outline-3 focus-visible:outline-[#5B3FD6]"
          >
            +
          </button>
        )}
      </div>

      {error && (
        <span
          id={errorId}
          role="alert"
          className="text-xs font-semibold text-[#E5484D] mt-0.5"
        >
          {error}
        </span>
      )}
    </div>
  );
};
