/** Biểu tượng tua nhanh ở góc trên phải (chế độ video hướng dẫn): hiện khi hệ số thời gian > 1, ẩn khi hết tua. Nền phẳng và viền, không bóng, không filter. */
import { demoUi } from '../content/demo';
import { onTimeScale } from './timeScale';

let el: HTMLDivElement | null = null;
let off: (() => void) | null = null;

function show(on: boolean): void {
  if (!on) {
    el?.remove();
    el = null;
    return;
  }
  if (el?.isConnected) return;
  const d = document.createElement('div');
  d.dataset.demoFf = 'true';
  d.setAttribute('aria-hidden', 'true');
  d.textContent = demoUi.tuaNhanh;
  Object.assign(d.style, {
    position: 'fixed',
    top: '20px',
    right: '24px',
    zIndex: '2147483500',
    background: '#000',
    color: '#fff',
    border: '3px solid #facc15',
    borderRadius: '16px',
    padding: '8px 18px',
    fontSize: '36px',
    fontWeight: '800',
    fontFamily: 'inherit',
    pointerEvents: 'none',
  } as Partial<CSSStyleDeclaration>);
  document.body.appendChild(d);
  el = d;
}

export function installFfBadge(): void {
  off?.();
  off = onTimeScale((s) => show(s > 1));
}

export function removeFfBadge(): void {
  off?.();
  off = null;
  show(false);
}
