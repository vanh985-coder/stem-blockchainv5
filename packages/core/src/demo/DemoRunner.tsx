/** Chạy demo: đếm ngược, rồi đạo diễn chạy các cảnh. Phím: P tạm dừng/tiếp, N bỏ qua cảnh, Esc dừng. Góc màn hình không hiện chữ nào của demo (chỉ đếm ngược). */
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { fmt } from '../content/characters';
import { demoUi } from '../content/demo';
import { useProgress } from '../progress/ProgressProvider';
import { DEMO_HD, DEMO_MEN, DEMO_SPEED, DEMO_START, DEMO_TRON, TRON_FROM, exposeForDemo } from './config';
import { installFfBadge, removeFfBadge } from './ffBadge';
import { DemoController } from './controller';
import { removeCursor } from './cursor';
import { runDirector, type SceneLog } from './director';
import { installFakePointerLock } from './pointerLock';
import { buildScenes } from './scenes';
import { buildListScenes } from './scenes/levels';
import { getMarks, showMarksButton, tronReset } from './tron/marks';
import { buildTronScenes } from './tron/scenes';
import { metaOfCode } from './tron/starts';

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
    // chế độ trọn: nếu game vẫn rơi vào hộp "Tạm dừng" (cửa sổ mất tiêu điểm) thì bot tự bấm "Tiếp tục", người quay không phải làm gì
    const resume = DEMO_TRON
      ? setInterval(() => {
          const b = document.querySelector<HTMLButtonElement>('[data-demo="resume"]:not([disabled])');
          if (b) b.click();
        }, 700)
      : null;
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
      if (DEMO_HD) installFfBadge();
      const all = DEMO_TRON ? buildTronScenes(TRON_FROM) : DEMO_MEN ? buildListScenes(DEMO_MEN) : buildScenes();
      const from = DEMO_START ? all.findIndex((s) => s.id === DEMO_START) : 0;
      if (DEMO_TRON) {
        tronReset();
        const route = TRON_FROM ? metaOfCode(TRON_FROM)?.route : null;
        if (route) nav.current(route);
      }
      void runDirector(all.slice(Math.max(0, from)), { ctl: c, navigate: (to) => nav.current(to) }, (l) => {
        window.__demoLog?.push(l);
        console.info(`[demo] ${l.id} ${l.status} ${l.ms}ms${l.error ? ` ${l.error}` : ''}`);
      }).finally(() => {
        removeCursor();
        removeFfBadge();
        if (DEMO_TRON && getMarks().length > 0) showMarksButton(demoUi.taiMoc);
        window.__demoDone = true;
      });
    }, 1000);
    return () => {
      clearInterval(tick);
      if (resume) clearInterval(resume);
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
