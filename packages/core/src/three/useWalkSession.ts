import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { WalkApi } from './walkApi';

/** Sau khi đóng hộp thoại, Esc vừa đóng không được tính là mở menu (chỉ dùng khi không có khóa chuột). */
const MENU_GUARD_MS = 250;
/** Hết chờ này mà trình duyệt chưa trả lời yêu cầu khóa chuột thì coi như chưa khóa được và hiện lại lời nhắc. */
const LOCK_PENDING_MS = 1500;

/** Trình duyệt có khóa chuột và con trỏ chính là chuột (không phải cảm ứng). */
export function detectLockMode(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return 'requestPointerLock' in Element.prototype && window.matchMedia('(pointer: fine)').matches;
}

export interface WalkSession {
  /** Máy tính có khóa chuột (false: điện thoại hoặc trình duyệt không hỗ trợ) */
  lockMode: boolean;
  locked: boolean;
  /** Đã khóa chuột ít nhất một lần (từ lúc đó nhả khóa mới hiện menu đầy đủ) */
  started: boolean;
  /** Chưa chơi lần nào: chỉ hiện dòng nhắc nhỏ "Bấm để điều khiển", không che cảnh */
  showHint: boolean;
  /** Hiện hộp Menu tạm dừng */
  menuOpen: boolean;
  /** Điều khiển đang tạm dừng (chưa khóa, hộp thoại hoặc menu) */
  paused: boolean;
  /** Số lần nhả khóa (hoặc bấm Esc ở chế độ không khóa) để mở menu */
  menuCount: number;
  /** Xin khóa chuột; phải gọi ngay trong sự kiện bấm */
  lock: () => void;
  /** Gắn vào `WalkControls` */
  onLockChange: (locked: boolean) => void;
  onLockError: () => void;
  /** Esc ở chế độ không khóa chuột: bật tắt menu */
  toggleMenu: () => void;
  closeMenu: () => void;
  /** Gọi ngay trong sự kiện bấm đóng hộp thoại: khóa lại chuột */
  dialogClosed: () => void;
}

/**
 * Trạng thái khóa chuột và menu của cảnh đi lại (máy tính). Chưa chơi: chỉ có dòng nhắc nhỏ. Đã chơi mà nhả khóa (Esc, chuyển cửa
 * sổ) và không có hộp thoại: hiện Menu "Bấm để chơi tiếp". Chrome từ chối khóa lại (vừa nhả bằng Esc chưa tới 1 giây): hiện lại lời
 * nhắc, không báo lỗi. Điện thoại và trình duyệt không có khóa chuột: Esc bật tắt menu như thường.
 * @param dialogOpen đang mở hộp thoại (nơi dùng tự nhả khóa bằng `api.lock.exit()` khi mở)
 */
export function useWalkSession(api: WalkApi, dialogOpen: boolean): WalkSession {
  const lockMode = useMemo(detectLockMode, []);
  const [locked, setLocked] = useState(false);
  const [pending, setPending] = useState(false);
  const [started, setStarted] = useState(false);
  const [menu, setMenu] = useState(false); // menu mở bằng Esc khi không có khóa chuột
  const [menuCount, setMenuCount] = useState(0);

  const live = useRef({ locked, dialogOpen });
  live.current = { locked, dialogOpen };
  const lastDialogClose = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const lock = useCallback(() => {
    if (!lockMode || live.current.locked) return;
    setPending(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setPending(false), LOCK_PENDING_MS);
    api.lock.request();
  }, [api, lockMode]);

  const onLockChange = useCallback((isLocked: boolean) => {
    clearTimeout(timer.current);
    setPending(false);
    setLocked(isLocked);
    if (isLocked) setStarted(true);
    // Nhả khóa (Esc, chuyển cửa sổ) khi không phải để mở hộp thoại: sự kiện mở menu.
    else if (!live.current.dialogOpen) setMenuCount((c) => c + 1);
  }, []);

  const onLockError = useCallback(() => {
    clearTimeout(timer.current);
    setPending(false); // hiện lại lời nhắc, không báo lỗi
  }, []);

  const toggleMenu = useCallback(() => {
    if (lockMode) return; // có khóa chuột: Esc do trình duyệt xử lý (nhả khóa), menu hiện theo trạng thái khóa
    if (live.current.dialogOpen || performance.now() - lastDialogClose.current < MENU_GUARD_MS) return;
    setMenuCount((c) => c + 1);
    setMenu((m) => !m);
  }, [lockMode]);
  const closeMenu = useCallback(() => setMenu(false), []);

  const dialogClosed = useCallback(() => {
    lastDialogClose.current = performance.now();
    lock();
  }, [lock]);

  const menuOpen = lockMode ? started && !locked && !pending && !dialogOpen : menu;
  const paused = dialogOpen || (lockMode ? !locked : menu);
  const showHint = lockMode && !started && !locked;
  return { lockMode, locked, started, showHint, menuOpen, paused, menuCount, lock, onLockChange, onLockError, toggleMenu, closeMenu, dialogClosed };
}
