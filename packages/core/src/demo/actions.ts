/** Thao tác như người chơi: bấm, gõ số từng ký tự, nhấn phím, kéo thả. Mọi thao tác di con trỏ giả tới trước rồi gửi sự kiện pointer/mouse/click/keyboard thật. */
import type { DemoController } from './controller';
import { moveCursor, placeCursor, pressEffect } from './cursor';
import { PACING } from './pacing';
import { typingDelays } from './timing';

export interface Ctx {
  ctl: DemoController;
}

function centerOf(el: Element): { x: number; y: number } {
  const r = el.getBoundingClientRect();
  return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
}

export function fire(target: EventTarget, type: string, x: number, y: number, extra: PointerEventInit = {}): void {
  const init: PointerEventInit = { bubbles: true, cancelable: true, composed: true, clientX: x, clientY: y, pointerId: 1, pointerType: 'mouse', isPrimary: true, button: 0, ...extra };
  target.dispatchEvent(type.startsWith('pointer') ? new PointerEvent(type, init) : new MouseEvent(type, init));
}

/** Bấm vào phần tử bằng con trỏ giả. */
export async function clickEl(ctx: Ctx, el: Element, opts: { settle?: number } = {}): Promise<void> {
  const { ctl } = ctx;
  (el as HTMLElement).scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  const p = centerOf(el);
  await moveCursor(ctl, p);
  await ctl.sleep(PACING ? 40 : 120);
  const hit = document.elementFromPoint(p.x, p.y);
  const target = hit && (el === hit || el.contains(hit)) ? hit : el;
  await pressEffect(ctl);
  fire(target, 'pointerover', p.x, p.y);
  fire(target, 'pointerdown', p.x, p.y, { buttons: 1 });
  fire(target, 'mousedown', p.x, p.y, { buttons: 1 });
  (el as HTMLElement).focus?.({ preventScroll: true });
  fire(target, 'pointerup', p.x, p.y);
  fire(target, 'mouseup', p.x, p.y);
  fire(target, 'click', p.x, p.y);
  const settle = opts.settle ?? 250;
  await ctl.sleep(PACING ? Math.min(settle, 150) : settle);
}

const nativeValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;

function setInputValue(input: HTMLInputElement, value: string): void {
  nativeValue?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

export function keyEvent(target: EventTarget, type: 'keydown' | 'keyup', code: string, key = code): void {
  target.dispatchEvent(new KeyboardEvent(type, { bubbles: true, cancelable: true, code, key }));
}

/** Gõ từng ký tự vào ô nhập (120–200 ms mỗi ký tự). */
export async function typeInto(ctx: Ctx, input: HTMLInputElement, text: string, opts: { seed?: number; noClick?: boolean; range?: readonly [number, number] } = {}): Promise<void> {
  const { ctl } = ctx;
  if (opts.noClick) input.focus({ preventScroll: true });
  else await clickEl(ctx, input, { settle: 150 });
  if (input.value !== '') setInputValue(input, '');
  const delays = typingDelays(text.length, opts.seed ?? text.length + 7, opts.range ?? PACING?.typeMs);
  let acc = '';
  for (let i = 0; i < text.length; i++) {
    await ctl.sleep(delays[i]);
    const ch = text[i];
    const code = /\d/.test(ch) ? `Digit${ch}` : `Key${ch.toUpperCase()}`;
    keyEvent(input, 'keydown', code, ch);
    acc += ch;
    setInputValue(input, acc);
    keyEvent(input, 'keyup', code, ch);
  }
  await ctl.sleep(250);
}

/** Nhấn một phím như người (keydown rồi keyup sau `holdMs`). */
export async function pressKey(ctx: Ctx, code: string, holdMs = 90, target: EventTarget = window): Promise<void> {
  keyEvent(target, 'keydown', code);
  await ctx.ctl.sleep(holdMs);
  keyEvent(target, 'keyup', code);
}

/** Kéo thả bằng con trỏ giả: pointerdown ở `from`, đi qua nhiều điểm (pointermove), pointerup ở `to`. */
export async function dragEl(ctx: Ctx, from: Element, to: { x: number; y: number } | Element): Promise<void> {
  const { ctl } = ctx;
  (from as HTMLElement).scrollIntoView?.({ block: 'nearest' });
  const a = centerOf(from);
  const b = 'getBoundingClientRect' in to ? centerOf(to) : to;
  await moveCursor(ctl, a);
  await ctl.sleep(150);
  const src = document.elementFromPoint(a.x, a.y) ?? from;
  fire(src, 'pointerover', a.x, a.y);
  fire(src, 'pointerdown', a.x, a.y, { buttons: 1 });
  fire(src, 'mousedown', a.x, a.y, { buttons: 1 });
  await ctl.sleep(120);
  const steps = 24;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const x = Math.round(a.x + (b.x - a.x) * t);
    const y = Math.round(a.y + (b.y - a.y) * t - Math.sin(Math.PI * t) * 24);
    placeCursor({ x, y });
    await ctl.sleep(PACING ? 14 : 26);
    // như khi chuột được "bắt" (pointer capture): sự kiện đi tới phần tử đang kéo
    fire(src, 'pointermove', x, y, { buttons: 1 });
    fire(src, 'mousemove', x, y, { buttons: 1 });
  }
  await ctl.sleep(160);
  fire(src, 'pointerup', b.x, b.y);
  fire(src, 'mouseup', b.x, b.y);
  await pressEffect(ctl);
  await ctl.sleep(PACING ? 150 : 350);
}

export function q<T extends Element = HTMLElement>(sel: string): T | null {
  return document.querySelector<T>(sel);
}
export function qa<T extends Element = HTMLElement>(sel: string): T[] {
  return [...document.querySelectorAll<T>(sel)];
}
