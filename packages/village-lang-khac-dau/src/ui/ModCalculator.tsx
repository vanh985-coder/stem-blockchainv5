import { useEffect, useId, useRef, useState } from 'react';
import { Button, fmt, modCalcUi, plainPower, rich } from '@so-chung/core';
import { publicKey } from '@so-chung/core/lessons/bai-3/logic';
import { parseModInput } from './modInput';

export interface ModCalculatorProps {
  /** Bảng mở; ở kiểu inline là đang focus nhập (màn chơi dùng để dừng đồng hồ tráo). */
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Lớp đặt chỗ cho cả khối (nút và bảng), ví dụ góc trên trái */
  className?: string;
  /** Kiểu chữ theo khung chơi (ví dụ đơn vị cqw của Scene25D) */
  style?: React.CSSProperties;
  /** Luôn hiện bảng, không tự lấy focus hay mở bàn phím điện thoại. */
  inline?: boolean;
}

/**
 * Máy tính mod (spec 07, màn 8 và màn 9): nút ở góc màn hình, bấm thì mở ô nhập x (số nguyên 1 đến 22) và hiện ngay "5^x mod 23 = y", tính bằng `publicKey` của Bài 3.
 * Chỉ tính xuôi, không có chiều ngược. Escape hoặc nút "Đóng" để đóng. Lớp phủ trên cảnh 3D nên chỉ dùng viền và nền phẳng (không bóng, không lọc).
 */
export function ModCalculator({ open, onOpenChange, className = '', style, inline = false }: ModCalculatorProps) {
  const [text, setText] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const id = useId();
  const x = parseModInput(text);

  useEffect(() => {
    if (open && !inline) input.current?.focus();
  }, [open, inline]);

  return (
    <div className={className} style={style}>
      {!inline && (
        <Button size="sm" variant={open ? 'primary' : 'secondary'} className="min-h-11" aria-expanded={open} aria-controls={id} onClick={() => onOpenChange(!open)} data-testid="nut-may-tinh-mod">
          {modCalcUi.nut}
        </Button>
      )}
      {(inline || open) && (
        <div
          id={id}
          role={inline ? 'group' : 'dialog'}
          aria-label={modCalcUi.tieuDe}
          data-testid="may-tinh-mod"
          className={`${inline ? 'w-full space-y-1 p-2' : 'mt-2 w-[min(18rem,100%)] space-y-2 p-3'} rounded-2xl border-[3px] border-nau-go bg-giay`}
          onFocusCapture={() => { if (inline) onOpenChange(true); }}
          onBlurCapture={(e) => { if (inline && !e.currentTarget.contains(e.relatedTarget)) onOpenChange(false); }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.stopPropagation();
              onOpenChange(false);
              if (inline) input.current?.blur();
            }
          }}
        >
          {inline && <p className="font-display font-extrabold">{modCalcUi.nut}</p>}
          <label className={`block ${inline ? 'text-sm' : ''} font-bold`} htmlFor={`${id}-x`}>
            {modCalcUi.nhap}
          </label>
          <input
            ref={input}
            id={`${id}-x`}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            maxLength={2}
            value={text}
            onChange={(e) => setText(e.target.value)}
            className={`w-full rounded-xl border-2 border-nau-go bg-white px-3 ${inline ? 'min-h-11 py-1' : 'py-2'} font-display text-xl font-extrabold`}
            data-testid="o-nhap-x"
          />
          <p role="status" aria-live="polite" className={`min-h-[1.5em] font-display ${inline ? 'text-base leading-5' : 'text-lg'} font-extrabold`} data-testid="ket-qua-mod">
            {x !== null ? (
              <>
                <span className="sr-only">{plainPower(fmt(modCalcUi.ketQua, { x, y: publicKey(x) }))}</span>
                <span aria-hidden="true">{rich(modCalcUi.ketQua, { x, y: publicKey(x) })}</span>
              </>
            ) : text.trim() !== '' ? <span className={`${inline ? 'text-sm' : 'text-base'} font-bold text-do-son-dam`}>{modCalcUi.loi}</span> : null}
          </p>
          {!inline && (
            <Button size="sm" variant="secondary" className="min-h-11" onClick={() => onOpenChange(false)}>
              {modCalcUi.dong}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
