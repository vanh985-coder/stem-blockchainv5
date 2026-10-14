import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { Hearts, fmt, gameUi, useSettings, type MiniGameRenderProps } from '@so-chung/core';
import { Scene3D, isQualityChoice, type QualityChoice } from '@so-chung/core/three/index';
import { RUNNER_SPEC as SPEC } from './runnerConfig';
import { SWIPE_MIN_PX, keyToCommand, swipeToCommand } from './runnerCommands';
import { RunnerSession } from './runnerSession';
import { RunnerWorld } from './RunnerWorld';
import { CAMERA } from './runnerView';

/** Ép mức chất lượng bằng ?q=low|medium|high (để kiểm tra hiệu năng); không có thì theo Cài đặt. */
function forcedQuality(): QualityChoice | undefined {
  if (typeof location === 'undefined') return undefined;
  const q = new URLSearchParams(location.search).get('q');
  return isQualityChoice(q) ? q : undefined;
}

/** Hạt giống của ván: khác nhau mỗi lần (ngẫu nhiên chỉ ở đây; mọi luật trong `runnerLogic` đều tất định theo hạt giống). */
const newSeed = (): number => (Math.random() * 2 ** 31) >>> 0;

/**
 * Phần chơi của màn 2 (giai đoạn dựng đường chạy: bước 11): khung 3D, điều khiển (bàn phím, vuốt), thanh tim và quãng đường.
 * Bọc trong `MiniGameLevel` (thẻ bắt đầu, màn kết quả). Chưa có vật nhặt, rơm, câu hỏi (bước 12): chạy tới khi hết tim.
 */
export function RunnerGame({ paused, attempt, onFinish }: MiniGameRenderProps) {
  const { settings } = useSettings();
  void settings;
  const forced = useMemo(forcedQuality, []);
  // mỗi lần chơi (attempt) là một ván mới với hạt giống mới
  const session = useMemo(() => new RunnerSession({ seed: newSeed(), noRounds: true }), [attempt]); // eslint-disable-line react-hooks/exhaustive-deps
  if (import.meta.env.DEV) (window as unknown as { __runner?: RunnerSession }).__runner = session;
  const [ready, setReady] = useState(false);
  const [hud, setHud] = useState<{ hearts: number; meters: number }>({ hearts: SPEC.hearts, meters: 0 });
  const onHud = useCallback((hearts: number, meters: number) => setHud({ hearts, meters }), []);
  const finishRef = useRef(onFinish);
  finishRef.current = onFinish;
  const onOver = useCallback((score: number) => finishRef.current(score), []);

  // Bàn phím: ←/→ hoặc A/D đổi làn; ↑, W, Space nhảy; ↓, S trượt. Mỗi lần bấm là một lệnh (không lặp khi giữ phím).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const c = keyToCommand(e.code);
      if (!c) return;
      e.preventDefault();
      if (!e.repeat) session.command(c);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [session]);

  // Điện thoại: vuốt trái, phải, lên, xuống. Phát lệnh ngay khi ngón tay đã đi đủ xa (không chờ nhấc tay), mỗi lần chạm một lệnh.
  const touch = useRef({ id: -1, x: 0, y: 0, fired: false });
  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    const t = touch.current;
    t.id = e.pointerId;
    t.x = e.clientX;
    t.y = e.clientY;
    t.fired = false;
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const t = touch.current;
    if (t.id !== e.pointerId || t.fired) return;
    const c = swipeToCommand(e.clientX - t.x, e.clientY - t.y, SWIPE_MIN_PX);
    if (c) {
      t.fired = true;
      session.command(c);
    }
  };
  const onPointerEnd = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (touch.current.id === e.pointerId) touch.current.id = -1;
  };

  return (
    <div
      className="fixed inset-0 select-none bg-giay"
      style={{ touchAction: 'none' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
    >
      <Scene3D
        errorCovers
        quality={forced}
        camera={{ position: [0, CAMERA.height, -CAMERA.back], fov: CAMERA.fov }}
        lookAt={[0, CAMERA.lookHeight, CAMERA.lookAhead]}
        fog={[70, 190]}
        sunPosition={[26, 46, 18]}
        shadowFollowPlayer
        onReady={() => setReady(true)}
      >
        <RunnerWorld session={session} paused={paused || !ready} onHud={onHud} onOver={onOver} />
      </Scene3D>
      {ready && (
        <div className="pointer-events-none absolute left-3 top-3 z-20 flex items-center gap-4 rounded-nut border-2 border-nau-go bg-giay/90 px-3 py-1.5 shadow-md">
          <Hearts current={hud.hearts} max={SPEC.hearts} />
          <span className="font-display text-xl font-extrabold" data-testid="quang-duong">
            {fmt(gameUi.quangDuong, { so: hud.meters })}
          </span>
        </div>
      )}
    </div>
  );
}
