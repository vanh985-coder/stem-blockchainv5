import type { ChangeEvent, KeyboardEvent, Ref } from 'react';
import { sound } from '../audio/sound';
import { ui } from '../content/ui';

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
  ref?: Ref<HTMLInputElement>;
  autoFocus?: boolean;
  placeholder?: string;
  id?: string;
  showButtons?: boolean;
  /** Nhãn đọc cho người dùng đọc màn hình khi không có `label` */
  ariaLabel?: string;
}

const STEP_BTN =
  'flex size-11 cursor-pointer items-center justify-center rounded-nut border-2 border-nau-go bg-giay font-display text-xl font-extrabold shadow-[0_3px_0_0_var(--color-nau-go-dam)] active:translate-y-[2px] active:shadow-none disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-muc-tim';

/** Ô nhập số nguyên: chỉ nhận chữ số, bàn phím số trên điện thoại, Enter tương đương "Kiểm tra". */
export function NumberInput({
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
  ariaLabel,
}: NumberInputProps) {
  const errorId = id ? `${id}-error` : undefined;

  const stepBy = (delta: number) => {
    if (disabled) return;
    sound.playClick();
    const cur = value ?? (delta > 0 ? min - step : min);
    onChange?.(Math.min(max, Math.max(min, cur + delta)));
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === '') {
      onChange?.(null);
      return;
    }
    // Chỉ nhận chữ số
    if (/^\d+$/.test(raw)) {
      const parsed = parseInt(raw, 10);
      if (!isNaN(parsed)) onChange?.(parsed);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') onEnter?.();
  };

  return (
    <div className={`inline-flex flex-col gap-1 ${className}`}>
      {label && <span className="text-sm font-semibold text-nau-go-dam">{label}</span>}
      <div className="inline-flex items-center gap-2">
        {showButtons && (
          <button
            type="button"
            disabled={disabled || (value !== null && value <= min)}
            onClick={() => stepBy(-step)}
            aria-label={ui.nhapSo.giam}
            className={STEP_BTN}
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
          aria-label={label ? undefined : ariaLabel}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          className={`
            h-12 w-20 rounded-xl border-2 bg-white/90 text-center font-display text-xl font-extrabold text-muc-tim-dam sm:w-24 sm:text-2xl
            focus-visible:outline-4 focus-visible:outline-offset-1 focus-visible:outline-muc-tim
            ${error ? 'border-do-son ring-1 ring-do-son' : 'border-nau-go'}
            disabled:opacity-50
            ${inputClassName}
          `}
        />

        {showButtons && (
          <button
            type="button"
            disabled={disabled || (value !== null && value >= max)}
            onClick={() => stepBy(step)}
            aria-label={ui.nhapSo.tang}
            className={STEP_BTN}
          >
            +
          </button>
        )}
      </div>

      {error && (
        <span id={errorId} role="alert" className="mt-0.5 flex items-center gap-1 text-sm font-semibold text-do-son-dam">
          <span aria-hidden="true">⚠</span>
          {error}
        </span>
      )}
    </div>
  );
}
