/** Con trỏ giả của demo: mũi tên chuột, lướt mượt tới mục tiêu, có vòng sóng nhỏ khi bấm. Vẽ bằng nền phẳng và viền (không đổ bóng, không filter). */
import type { DemoController } from './controller';
import { DEMO_TRON } from './config';
import { PACING } from './pacing';
import { cursorDuration, cursorPath, type Pt } from './timing';

let el: HTMLDivElement | null = null;
let ring: HTMLDivElement | null = null;
let arrow: HTMLDivElement | null = null;
let pos: Pt = { x: -100, y: -100 };
let hideTimer: ReturnType<typeof setTimeout> | undefined;

const ARROW_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="30" height="42" viewBox="0 0 30 42"><path d="M2 2 L2 33 L10 26 L16 39 L22 36 L16 24 L27 24 Z" fill="#ffffff" stroke="#111827" stroke-width="3" stroke-linejoin="round"/></svg>';

function ensure(): HTMLDivElement {
  if (el && el.isConnected) return el;
  // Khung đặt ở đúng đầu mũi tên (điểm bấm); mũi tên vẽ xuống bên phải điểm đó, vòng sóng ở chính điểm đó
  el = document.createElement('div');
  el.setAttribute('aria-hidden', 'true');
  el.dataset.demoCursor = 'true';
  Object.assign(el.style, {
    position: 'fixed',
    left: '0',
    top: '0',
    width: '0',
    height: '0',
    pointerEvents: 'none',
    zIndex: '2147483647',
    opacity: '0',
    transition: 'opacity 300ms',
  } as Partial<CSSStyleDeclaration>);
  ring = document.createElement('div');
  Object.assign(ring.style, {
    position: 'absolute',
    left: '-26px',
    top: '-26px',
    width: '52px',
    height: '52px',
    borderRadius: '50%',
    border: '4px solid #facc15',
    boxSizing: 'border-box',
    opacity: '0',
    scale: '0.3',
  } as Partial<CSSStyleDeclaration>);
  arrow = document.createElement('div');
  arrow.innerHTML = ARROW_SVG;
  Object.assign(arrow.style, { position: 'absolute', left: '-2px', top: '-2px', width: '30px', height: '42px', transformOrigin: '2px 2px', transition: 'scale 110ms' } as Partial<CSSStyleDeclaration>);
  el.appendChild(ring);
  el.appendChild(arrow);
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

/** Di con trỏ tới `to` theo đường mượt (chế độ trọn: 0,4 đến 0,6 giây, không phụ thuộc nhịp). */
export async function moveCursor(ctl: DemoController, to: Pt): Promise<void> {
  show();
  if (pos.x < 0) place({ x: Math.max(40, to.x - 200), y: Math.min(window.innerHeight - 40, to.y + 120) });
  const from = pos;
  const dur = DEMO_TRON ? Math.min(600, Math.max(400, cursorDuration(from, to, 1))) : cursorDuration(from, to, ctl.speed * (PACING?.cursorBoost ?? 1));
  const steps = Math.max(2, Math.round(dur / 16));
  for (const p of cursorPath(from, to, steps)) {
    place(p);
    await ctl.sleep((dur / steps) * ctl.speed);
  }
  show();
}

function ripple(): void {
  ensure();
  show();
  if (arrow) arrow.style.scale = '0.82';
  if (ring) {
    ring.style.transition = 'none';
    ring.style.opacity = '0.95';
    ring.style.scale = '0.3';
    void ring.offsetWidth;
    ring.style.transition = 'opacity 420ms, scale 420ms';
    ring.style.opacity = '0';
    ring.style.scale = '1.2';
  }
  setTimeout(() => {
    if (arrow) arrow.style.scale = '1';
  }, 110);
}

/** Hiệu ứng nhấn: mũi tên nhỏ lại một chút, vòng sóng tỏa ra. */
export async function pressEffect(ctl: DemoController): Promise<void> {
  ripple();
  await ctl.sleep(PACING ? 50 : 110);
}

export function removeCursor(): void {
  clearTimeout(hideTimer);
  el?.remove();
  el = null;
  ring = null;
  arrow = null;
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
  ripple();
}
