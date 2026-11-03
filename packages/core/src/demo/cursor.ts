/** Con trỏ giả của demo: chấm tròn sáng, di chuyển mượt, có hiệu ứng nhấn. Vẽ bằng nền phẳng và viền (không đổ bóng, không filter). */
import type { DemoController } from './controller';
import { PACING } from './pacing';
import { cursorDuration, cursorPath, type Pt } from './timing';

let el: HTMLDivElement | null = null;
let ring: HTMLDivElement | null = null;
let pos: Pt = { x: -100, y: -100 };
let hideTimer: ReturnType<typeof setTimeout> | undefined;

function ensure(): HTMLDivElement {
  if (el && el.isConnected) return el;
  el = document.createElement('div');
  el.setAttribute('aria-hidden', 'true');
  el.dataset.demoCursor = 'true';
  Object.assign(el.style, {
    position: 'fixed',
    left: '0',
    top: '0',
    width: '30px',
    height: '30px',
    marginLeft: '-15px',
    marginTop: '-15px',
    borderRadius: '50%',
    background: '#facc15',
    border: '4px solid #ffffff',
    boxSizing: 'border-box',
    pointerEvents: 'none',
    zIndex: '2147483647',
    opacity: '0',
    transition: 'opacity 300ms, scale 120ms',
  } as Partial<CSSStyleDeclaration>);
  ring = document.createElement('div');
  Object.assign(ring.style, {
    position: 'absolute',
    inset: '-14px',
    borderRadius: '50%',
    border: '3px solid #facc15',
    boxSizing: 'border-box',
    opacity: '0',
    scale: '0.4',
  } as Partial<CSSStyleDeclaration>);
  el.appendChild(ring);
  document.body.appendChild(el);
  return el;
}

function place(p: Pt): void {
  ensure().style.transform = `translate(${p.x}px, ${p.y}px)`;
  pos = p;
}

function show(): void {
  ensure().style.opacity = '1';
  clearTimeout(hideTimer);
  hideTimer = setTimeout(() => {
    if (el) el.style.opacity = '0';
  }, 3500);
}

export function cursorPosition(): Pt {
  return pos;
}

/** Đặt con trỏ ngay tại `p` (dùng khi kéo, đã có từng bước nhỏ). */
export function placeCursor(p: Pt): void {
  show();
  place(p);
}

/** Di con trỏ tới `to` theo đường mượt. */
export async function moveCursor(ctl: DemoController, to: Pt): Promise<void> {
  show();
  if (pos.x < 0) place({ x: Math.max(40, to.x - 200), y: Math.min(window.innerHeight - 40, to.y + 120) });
  const from = pos;
  const dur = cursorDuration(from, to, ctl.speed * (PACING?.cursorBoost ?? 1));
  const steps = Math.max(2, Math.round(dur / 16));
  for (const p of cursorPath(from, to, steps)) {
    place(p);
    await ctl.sleep((dur / steps) * ctl.speed);
  }
  show();
}

/** Hiệu ứng nhấn: chấm nhỏ lại một chút, vòng sáng tỏa ra. */
export async function pressEffect(ctl: DemoController): Promise<void> {
  const c = ensure();
  show();
  c.style.scale = '0.78';
  if (ring) {
    ring.style.transition = 'none';
    ring.style.opacity = '0.9';
    ring.style.scale = '0.4';
    void ring.offsetWidth;
    ring.style.transition = 'opacity 380ms, scale 380ms';
    ring.style.opacity = '0';
    ring.style.scale = '1.1';
  }
  await ctl.sleep(PACING ? 50 : 110);
  c.style.scale = '1';
}

export function removeCursor(): void {
  clearTimeout(hideTimer);
  el?.remove();
  el = null;
  ring = null;
  pos = { x: -100, y: -100 };
}

let chase: Pt | null = null;
let chasing = false;

/** Con trỏ bám dần tới `to` (không chặn): dùng khi bot quyết định theo từng bước mô phỏng, con trỏ đuổi theo sau. */
export function chaseCursor(to: Pt): void {
  show();
  chase = to;
  if (pos.x < 0) place({ x: to.x, y: to.y + 80 });
  if (chasing) return;
  chasing = true;
  const tick = () => {
    if (!chase || !el) {
      chasing = false;
      return;
    }
    const dx = chase.x - pos.x;
    const dy = chase.y - pos.y;
    if (Math.hypot(dx, dy) < 1) {
      place(chase);
      chase = null;
      chasing = false;
      return;
    }
    place({ x: pos.x + dx * 0.3, y: pos.y + dy * 0.3 });
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

/** Hiệu ứng nhấn không chặn. */
export function tapEffect(): void {
  const c = ensure();
  show();
  c.style.scale = '0.78';
  if (ring) {
    ring.style.transition = 'none';
    ring.style.opacity = '0.9';
    ring.style.scale = '0.4';
    void ring.offsetWidth;
    ring.style.transition = 'opacity 380ms, scale 380ms';
    ring.style.opacity = '0';
    ring.style.scale = '1.1';
  }
  setTimeout(() => {
    c.style.scale = '1';
  }, 110);
}
