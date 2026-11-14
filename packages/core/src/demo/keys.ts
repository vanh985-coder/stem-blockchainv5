/** Phím thật của bot: gửi sự kiện bàn phím (keydown/keyup) tới window như người chơi và hiện nhãn phím nhỏ ở góc dưới để người xem biết bot bấm phím nào. */

/** `KeyboardEvent.key` ứng với `code` (các game đọc `key` hay `code` tùy chỗ nên điền cả hai). */
export function keyOf(code: string): string {
  if (code === 'Space') return ' ';
  if (/^Key[A-Z]$/.test(code)) return code.slice(3).toLowerCase();
  if (/^Digit\d$/.test(code)) return code.slice(5);
  if (code === 'ShiftLeft' || code === 'ShiftRight') return 'Shift';
  return code;
}

/** Nhãn hiện cho người xem (ví dụ "D", "Space", "M", "←"). */
export function keyLabel(code: string): string {
  if (code === 'Space') return 'Space';
  if (/^Key[A-Z]$/.test(code)) return code.slice(3);
  if (/^Digit\d$/.test(code)) return code.slice(5);
  if (code === 'ArrowLeft') return '←';
  if (code === 'ArrowRight') return '→';
  if (code === 'ArrowUp') return '↑';
  if (code === 'ArrowDown') return '↓';
  if (code === 'ShiftLeft' || code === 'ShiftRight') return 'Shift';
  if (code === 'Escape') return 'Esc';
  return code;
}

let box: HTMLDivElement | null = null;
let hideTimer: ReturnType<typeof setTimeout> | undefined;
let shownAt = 0;

/** Hiện nhãn phím ở góc dưới bên trái khoảng 0,6 giây (nền phẳng và viền, không bóng, không filter). */
export function showKeyLabel(text: string): void {
  if (typeof document === 'undefined') return;
  if (!box || !box.isConnected) {
    box = document.createElement('div');
    box.setAttribute('aria-hidden', 'true');
    box.dataset.demoKey = 'true';
    Object.assign(box.style, {
      position: 'fixed',
      left: '24px',
      bottom: '24px',
      minWidth: '56px',
      height: '56px',
      padding: '0 16px',
      boxSizing: 'border-box',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      font: '800 26px system-ui, sans-serif',
      color: '#111827',
      background: '#ffffff',
      border: '4px solid #111827',
      borderRadius: '12px',
      pointerEvents: 'none',
      zIndex: '2147483646',
      opacity: '0',
      transition: 'opacity 120ms',
    } as Partial<CSSStyleDeclaration>);
    document.body.appendChild(box);
  }
  box.textContent = text;
  box.style.opacity = '1';
  shownAt = performance.now();
  clearTimeout(hideTimer);
  hideTimer = setTimeout(() => {
    if (box) box.style.opacity = '0';
  }, 600);
}

export function removeKeyLabel(): void {
  clearTimeout(hideTimer);
  box?.remove();
  box = null;
  shownAt = 0;
}

export const keyLabelShownAt = (): number => shownAt;

function fire(type: 'keydown' | 'keyup', code: string, repeat = false): void {
  // như phím thật: sự kiện đi từ phần tử trang (body) lên window (game kite đọc e.target.closest, không chịu được target là window)
  document.body.dispatchEvent(new KeyboardEvent(type, { bubbles: true, cancelable: true, code, key: keyOf(code), repeat }));
}

/** Giữ phím xuống (keydown) ngay lúc này, kèm nhãn. */
export function keyDown(code: string): void {
  showKeyLabel(keyLabel(code));
  fire('keydown', code);
}

/** Nhả phím (keyup) ngay lúc này. */
export function keyUp(code: string): void {
  fire('keyup', code);
}

/** Bấm một phím ngay lúc này (không chặn): keydown, rồi keyup sau `holdMs` mili giây. */
export function keyTap(code: string, holdMs = 70): void {
  keyDown(code);
  setTimeout(() => keyUp(code), holdMs);
}
