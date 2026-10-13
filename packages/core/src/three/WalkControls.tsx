import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ui } from '../content/ui';
import { fmt } from '../content/characters';
import { dragCamera, lookCamera } from './cameraRig';
import { resetWalkInput, type WalkApi } from './walkApi';
import { MIN_TOUCH_TARGET, STICK_RADIUS, actionForKey, applyKey, isLeftHalf, keyAxis, knobOffset, stickFromDrag } from './walkInput';

export interface WalkControlsProps {
  /** Cầu nối với cảnh 3D (đọc mỗi khung hình) */
  api: WalkApi;
  /** Đang mở hộp thoại hoặc menu: bỏ phím, cần điều khiển, kéo camera (trừ Esc) */
  paused: boolean;
  /** Tên vật tương tác gần nhất (nếu có): hiện trên nút ✋ ở điện thoại */
  interactLabel: string | null;
  /**
   * Máy tính: bấm vào khung thì khóa chuột (pointer lock); khi đã khóa, rê chuột xoay camera kiểu PUBG và giữ chuột trái
   * không còn kéo camera. Tắt (false) thì giữ cách kéo chuột cũ (trình duyệt không hỗ trợ khóa chuột, hoặc điện thoại).
   */
  lockMode: boolean;
  /** Độ nhạy chuột (hệ số, 1 là mặc định), xem Cài đặt */
  mouseSensitivity: number;
  /** Báo mỗi khi trạng thái khóa đổi (cả khi người chơi nhả bằng Esc hoặc chuyển cửa sổ) */
  onLockChange: (locked: boolean) => void;
  /** Trình duyệt từ chối khóa (ví dụ vừa nhả bằng Esc chưa tới 1 giây): nơi gọi hiện lại lời nhắc, không báo lỗi */
  onLockError: () => void;
  /** E hoặc nút ✋ */
  onInteract: () => void;
  /** Esc: nơi gọi tự quyết định mở hay đóng menu */
  onMenu: () => void;
  className?: string;
  /** Khung 3D và các lớp giao diện (HUD...). Phần tử có thuộc tính `data-walk-ui` không bắt đầu kéo camera hay cần điều khiển. */
  children?: ReactNode;
}

const JUMP_SIZE = 76;
const HAND_SIZE = 64;
const EDGE = 20;
const STICK_DIAMETER = STICK_RADIUS * 2;
const KNOB_SIZE = 52;

function isTyping(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest('input, textarea, select, [contenteditable="true"]') !== null;
}

/**
 * Điều khiển ở cảnh đi lại (spec 03 mục 3.7), phần DOM: ghi phím, chuột và chạm vào `api` để cảnh 3D đọc.
 * - Máy tính: WASD/mũi tên đi theo hướng camera, Shift chạy, Space nhảy, E tương tác, Esc báo mở menu, kéo chuột xoay camera.
 * - Điện thoại: chạm nửa trái màn hình hiện cần điều khiển động (đẩy quá 80% là chạy), vuốt nửa phải xoay camera, nút nhảy và
 *   nút ✋ ở góc phải (vùng bấm ≥ 44px). Chặn cuộn và phóng to trang khi chạm vào khung chơi.
 * Tạm dừng thì thả hết phím và cần điều khiển.
 */
export function WalkControls({ api, paused, lockMode, mouseSensitivity, onLockChange, onLockError, interactLabel, onInteract, onMenu, className = '', children }: WalkControlsProps) {
  const root = useRef<HTMLDivElement>(null);
  const base = useRef<HTMLDivElement>(null);
  const knob = useRef<HTMLDivElement>(null);
  const [touchMode, setTouchMode] = useState(() => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches);
  const live = useRef({ paused, lockMode, mouseSensitivity, onLockChange, onLockError, onInteract, onMenu });
  live.current = { paused, lockMode, mouseSensitivity, onLockChange, onLockError, onInteract, onMenu };

  // Tạm dừng: thả hết.
  useEffect(() => {
    if (!paused) return;
    resetWalkInput(api);
    if (base.current) base.current.dataset.active = 'false';
    if (knob.current) knob.current.style.transform = 'translate(0px, 0px)';
  }, [paused, api]);

  useEffect(() => {
    const el = root.current;
    if (!el) return;

    // --- Bàn phím
    const onKey = (e: KeyboardEvent, down: boolean) => {
      if (isTyping(e.target)) return;
      const action = actionForKey(e.code);
      if (!action) return;
      if (action === 'menu') {
        if (down && !e.repeat) live.current.onMenu();
        e.preventDefault();
        return;
      }
      if (live.current.paused) return;
      e.preventDefault(); // không cuộn trang bằng Space và mũi tên
      const acted = applyKey(api.keys, api.held, e.code, down);
      if (!acted) return;
      keyAxis(api.keys, api.input.keyAxis);
      api.input.keyRun = api.keys.run > 0;
      if (down && acted === 'jump') api.input.jump = true;
      if (down && acted === 'interact') live.current.onInteract();
    };
    const keyDown = (e: KeyboardEvent) => onKey(e, true);
    const keyUp = (e: KeyboardEvent) => onKey(e, false);
    const blur = () => resetWalkInput(api);
    window.addEventListener('keydown', keyDown);
    window.addEventListener('keyup', keyUp);
    window.addEventListener('blur', blur);

    // --- Chuột và chạm
    const stick = { id: -1, ox: 0, oy: 0 };
    const cam = { id: -1, x: 0, y: 0 };
    const axis = { x: 0, y: 0 };
    const knobPos = { x: 0, y: 0 };

    const showStick = (active: boolean, x?: number, y?: number) => {
      const b = base.current;
      if (!b) return;
      b.dataset.active = active ? 'true' : 'false';
      if (active && x !== undefined && y !== undefined) {
        b.style.setProperty('--sx', `${x - STICK_RADIUS}px`);
        b.style.setProperty('--sy', `${y - STICK_RADIUS}px`);
        b.style.setProperty('--sb', 'auto');
      } else if (!active) {
        b.style.removeProperty('--sx');
        b.style.removeProperty('--sy');
        b.style.removeProperty('--sb');
      }
      if (knob.current) knob.current.style.transform = 'translate(0px, 0px)';
    };

    // --- Khóa chuột
    const requestLock = () => {
      if (!live.current.lockMode || document.pointerLockElement === el) return;
      const fail = () => live.current.onLockError();
      const plain = () => {
        try {
          const r = el.requestPointerLock() as Promise<void> | undefined;
          if (r && typeof r.catch === 'function') r.catch(fail);
        } catch {
          fail();
        }
      };
      // Thử chuột "thô" (không qua gia tốc của hệ điều hành, như game bắn súng); trình duyệt không hỗ trợ thì dùng cách thường.
      try {
        const r = el.requestPointerLock({ unadjustedMovement: true }) as Promise<void> | undefined;
        if (r && typeof r.catch === 'function') {
          r.catch((e: unknown) => {
            if (e instanceof DOMException && e.name === 'NotSupportedError') plain();
            else fail();
          });
        }
      } catch {
        plain();
      }
    };
    const exitLock = () => {
      if (document.pointerLockElement === el) document.exitPointerLock();
    };
    api.lock.request = requestLock;
    api.lock.exit = exitLock;
    const lockChange = () => live.current.onLockChange(document.pointerLockElement === el);
    const lockError = () => live.current.onLockError();
    const look = (e: MouseEvent) => {
      if (document.pointerLockElement !== el || live.current.paused) return;
      lookCamera(api.camera, e.movementX, e.movementY, live.current.mouseSensitivity);
    };
    document.addEventListener('pointerlockchange', lockChange);
    document.addEventListener('pointerlockerror', lockError);
    document.addEventListener('mousemove', look);

    const down = (e: PointerEvent) => {
      if (e.target instanceof Element && e.target.closest('[data-walk-ui]')) return;
      if (e.pointerType === 'touch') setTouchMode(true);
      if (e.pointerType === 'mouse' && live.current.lockMode) {
        // Máy tính: bấm vào khung thì khóa chuột (trong chính sự kiện bấm), kể cả lúc chưa khóa (đang tạm dừng); đã khóa thì không làm gì thêm.
        if (document.pointerLockElement !== el) requestLock();
        return;
      }
      if (live.current.paused) return;
      const rect = el.getBoundingClientRect();
      if (e.pointerType === 'touch' && isLeftHalf(e.clientX - rect.left, rect.width)) {
        if (stick.id !== -1) return;
        stick.id = e.pointerId;
        stick.ox = e.clientX;
        stick.oy = e.clientY;
        showStick(true, e.clientX - rect.left, e.clientY - rect.top);
      } else {
        if (cam.id !== -1) return;
        cam.id = e.pointerId;
        cam.x = e.clientX;
        cam.y = e.clientY;
      }
      try {
        el.setPointerCapture(e.pointerId);
      } catch {
        // đã thả
      }
    };
    const move = (e: PointerEvent) => {
      if (e.pointerId === stick.id) {
        const dx = e.clientX - stick.ox;
        const dy = e.clientY - stick.oy;
        api.input.stickMag = stickFromDrag(dx, dy, STICK_RADIUS, axis);
        api.input.stick.x = axis.x;
        api.input.stick.y = axis.y;
        knobOffset(dx, dy, STICK_RADIUS, knobPos);
        if (knob.current) knob.current.style.transform = `translate(${knobPos.x}px, ${knobPos.y}px)`;
      } else if (e.pointerId === cam.id) {
        dragCamera(api.camera, e.clientX - cam.x, e.clientY - cam.y);
        cam.x = e.clientX;
        cam.y = e.clientY;
      }
    };
    const up = (e: PointerEvent) => {
      if (e.pointerId === stick.id) {
        stick.id = -1;
        api.input.stickMag = 0;
        api.input.stick.x = 0;
        api.input.stick.y = 0;
        showStick(false);
      } else if (e.pointerId === cam.id) {
        cam.id = -1;
      }
      try {
        el.releasePointerCapture(e.pointerId);
      } catch {
        // chưa bắt
      }
    };
    // Chặn cuộn, kéo thả và phóng to khi chạm vào khung chơi.
    const stop = (e: Event) => {
      if (e.cancelable) e.preventDefault();
    };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('touchmove', stop, { passive: false });
    el.addEventListener('contextmenu', stop);
    document.addEventListener('gesturestart', stop as EventListener);
    document.addEventListener('gesturechange', stop as EventListener);

    // Trang không cuộn được trong lúc chơi.
    const html = document.documentElement;
    const body = document.body;
    const before = { ho: html.style.overflow, hb: html.style.overscrollBehavior, bo: body.style.overflow };
    html.style.overflow = 'hidden';
    html.style.overscrollBehavior = 'none';
    body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', keyDown);
      window.removeEventListener('keyup', keyUp);
      window.removeEventListener('blur', blur);
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
      el.removeEventListener('touchmove', stop);
      el.removeEventListener('contextmenu', stop);
      document.removeEventListener('gesturestart', stop as EventListener);
      document.removeEventListener('gesturechange', stop as EventListener);
      document.removeEventListener('pointerlockchange', lockChange);
      document.removeEventListener('pointerlockerror', lockError);
      document.removeEventListener('mousemove', look);
      api.lock.request = () => undefined;
      api.lock.exit = () => undefined;
      exitLock();
      html.style.overflow = before.ho;
      html.style.overscrollBehavior = before.hb;
      body.style.overflow = before.bo;
      resetWalkInput(api);
    };
  }, [api]);

  const ready = interactLabel !== null;
  const bottom = `calc(env(safe-area-inset-bottom, 0px) + ${EDGE}px)`;
  const right = `calc(env(safe-area-inset-right, 0px) + ${EDGE}px)`;

  return (
    <div ref={root} className={`relative select-none overflow-hidden ${className}`} style={{ touchAction: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none', overscrollBehavior: 'none' }}>
      {children}
      {touchMode && (
        <>
          <div
            ref={base}
            aria-hidden="true"
            data-active="false"
            title={ui.dungDi.canDieuKhien}
            className="pointer-events-none absolute rounded-full border-2 border-white/70 bg-black/20 opacity-40 transition-opacity data-[active=true]:opacity-90"
            style={{ width: STICK_DIAMETER, height: STICK_DIAMETER, left: `var(--sx, calc(env(safe-area-inset-left, 0px) + ${EDGE}px))`, top: 'var(--sy, auto)', bottom: `var(--sb, ${bottom})` }}
          >
            <div ref={knob} className="absolute rounded-full bg-white/80 shadow-md" style={{ width: KNOB_SIZE, height: KNOB_SIZE, left: STICK_RADIUS - KNOB_SIZE / 2, top: STICK_RADIUS - KNOB_SIZE / 2 }} />
          </div>

          <button
            type="button"
            data-walk-ui
            aria-label={ui.dungDi.nutNhay}
            onPointerDown={(e) => {
              e.preventDefault();
              if (!live.current.paused) api.input.jump = true;
            }}
            className="absolute grid cursor-pointer place-items-center rounded-full border-2 border-white/80 bg-muc-tim/80 text-3xl font-extrabold text-white shadow-lg active:scale-95"
            style={{ width: Math.max(MIN_TOUCH_TARGET, JUMP_SIZE), height: Math.max(MIN_TOUCH_TARGET, JUMP_SIZE), right, bottom, touchAction: 'none' }}
          >
            <span aria-hidden="true">{ui.dungDi.bieuTuongNhay}</span>
          </button>

          <div className="pointer-events-none absolute flex flex-col items-center gap-1" style={{ right: `calc(${right} + ${JUMP_SIZE + 12}px)`, bottom }}>
            {ready && (
              <span className="max-w-40 rounded-nut bg-black/60 px-2 py-1 text-center text-sm font-bold leading-tight text-white" role="status">
                {interactLabel}
              </span>
            )}
            <button
              type="button"
              data-walk-ui
              disabled={!ready}
              aria-label={ready ? fmt(ui.dungDi.nutTuongTac, { vat: interactLabel }) : ui.dungDi.nutTuongTacTrong}
              onPointerDown={(e) => {
                e.preventDefault();
                if (ready && !live.current.paused) live.current.onInteract();
              }}
              className={`pointer-events-auto grid cursor-pointer place-items-center rounded-full border-2 text-3xl shadow-lg transition-all active:scale-95 ${ready ? 'border-white bg-xanh-la/90 opacity-100 ring-4 ring-white/60' : 'border-white/60 bg-black/30 opacity-50'}`}
              style={{ width: Math.max(MIN_TOUCH_TARGET, HAND_SIZE), height: Math.max(MIN_TOUCH_TARGET, HAND_SIZE), touchAction: 'none' }}
            >
              <span aria-hidden="true">{ui.dungDi.bieuTuongTuongTac}</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
