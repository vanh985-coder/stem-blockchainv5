/** Chạy demo: đếm ngược, rồi đạo diễn chạy các cảnh. Phím: P tạm dừng/tiếp, N bỏ qua cảnh, Esc dừng. Góc màn hình không hiện chữ nào của demo (chỉ đếm ngược). */
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { fmt } from '../content/characters';
import { demoUi } from '../content/demo';
import { useProgress } from '../progress/ProgressProvider';
import { DEMO_SPEED, DEMO_START, exposeForDemo } from './config';
import { DemoController } from './controller';
import { removeCursor } from './cursor';
import { runDirector, type SceneLog } from './director';
import { installFakePointerLock } from './pointerLock';
import { buildScenes } from './scenes';

const COUNTDOWN_S = 5;

declare global {
  interface Window {
    __demoLog?: SceneLog[];
    __demoDone?: boolean;
  }
}

export default function DemoRunner() {
  const navigate = useNavigate();
  const [left, setLeft] = useState<number | null>(COUNTDOWN_S);
  const started = useRef(false);
  const ctl = useRef(new DemoController(DEMO_SPEED));
  const nav = useRef(navigate);
  nav.current = navigate;
  exposeForDemo({ __progress: useProgress() });

  useEffect(() => {
    installFakePointerLock();
    const c = ctl.current;
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.code === 'KeyP') c.togglePause();
      else if (e.code === 'KeyN') c.requestSkip();
      else if (e.code === 'Escape') c.stop();
    };
    window.addEventListener('keydown', onKey, true);
    let n = COUNTDOWN_S;
    setLeft(COUNTDOWN_S);
    const tick = setInterval(() => {
      n -= 1;
      if (n > 0) {
        setLeft(n);
        return;
      }
      clearInterval(tick);
      setLeft(null);
      if (started.current) return;
      started.current = true;
      window.__demoLog = [];
      window.__demoDone = false;
      const all = buildScenes();
      const from = DEMO_START ? all.findIndex((s) => s.id === DEMO_START) : 0;
      void runDirector(all.slice(Math.max(0, from)), { ctl: c, navigate: (to) => nav.current(to) }, (l) => {
        window.__demoLog?.push(l);
        console.info(`[demo] ${l.id} ${l.status} ${l.ms}ms${l.error ? ` ${l.error}` : ''}`);
      }).finally(() => {
        removeCursor();
        window.__demoDone = true;
      });
    }, 1000);
    return () => {
      clearInterval(tick);
      window.removeEventListener('keydown', onKey, true);
    };
  }, []);

  if (left === null) return null;
  return (
    <div aria-hidden="true" data-testid="demo-dem-nguoc" className="pointer-events-none fixed inset-0 z-[2147483000] grid place-items-center">
      <span className="rounded-3xl border-4 border-white bg-black/70 px-10 py-6 font-display text-5xl font-extrabold text-white">{fmt(demoUi.demNguoc, { giay: left })}</span>
    </div>
  );
}
