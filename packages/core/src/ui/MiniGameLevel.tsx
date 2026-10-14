import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { fmt } from '../content/characters';
import { GAMES, gameUi } from '../content/games';
import { levelById } from '../content/levels';
import { gameResultOf, summarizeGame, type Medal, type MedalThresholds } from '../games/medals';
import { formatNumber } from '../lib/format';
import { progressManager } from '../progress/singleton';
import { useProgress } from '../progress/ProgressProvider';
import { Button } from './Button';
import { Panel } from './Panel';
import { PortraitFrame } from './PortraitFrame';
import { Stars } from './Stars';

/** Một phần của điểm ở màn kết quả: tên phần (đã qua fmt), số lượng và số điểm của phần đó. */
export interface ScorePart {
  label: string;
  count: number;
  points: number;
}

/** Những gì khung truyền cho phần chơi của từng game. */
export interface MiniGameRenderProps {
  /** true khi tab bị ẩn (hoặc đang dừng chờ em bấm "Tiếp tục"): game phải ngừng chạy và ngừng tính giờ */
  paused: boolean;
  /** Số lần chơi (bắt đầu từ 1, tăng mỗi lần "Chơi lại"): dùng làm key và làm hạt giống ván mới */
  attempt: number;
  /** Game gọi khi chơi xong (thắng hay thua đều gọi một lần) kèm điểm (và, nếu có, từng phần của điểm để hiện ở màn kết quả); khung ghi tiến độ rồi hiện màn kết quả */
  onFinish: (score: number, parts?: readonly ScorePart[]) => void;
}

export interface MiniGameLevelProps {
  /** Số màn (1 đến 12) của game này */
  levelId: number;
  /** Ba mốc điểm Đồng, Bạc, Vàng của game (spec từng game) */
  medals: MedalThresholds;
  /** Vẽ phần chơi (bước 11 đến 12 của màn 2, tương tự cho các game khác) */
  renderGame: (props: MiniGameRenderProps) => ReactNode;
  /** Bấm "Về làng": mặc định chuyển tới `/lang/<làng của màn này>` */
  onLeave?: () => void;
}

type Stage = { kind: 'card' } | { kind: 'play' } | { kind: 'result'; score: number; medal: Medal; newBest: boolean; coins: number; parts: readonly ScorePart[] };

/** Theo dõi tab có đang bị ẩn không (đọc lại khi đổi trạng thái). */
function useTabHidden(): boolean {
  const [hidden, setHidden] = useState(() => typeof document !== 'undefined' && document.visibilityState === 'hidden');
  useEffect(() => {
    const on = () => setHidden(document.visibilityState === 'hidden');
    document.addEventListener('visibilitychange', on);
    return () => document.removeEventListener('visibilitychange', on);
  }, []);
  return hidden;
}

/**
 * Khung dùng chung cho mọi game phụ (spec 03 mục 6): thẻ bắt đầu (tên game, luật, cách điều khiển, điểm cao nhất, "Bắt đầu"), phần chơi do từng game vẽ,
 * rồi màn kết quả (điểm, mốc Đồng/Bạc/Vàng, "Chơi lại" và "Về làng").
 *
 * Chơi xong (thắng hay thua) ghi `played = true`, `best_score` lấy số lớn hơn, `stars {"game": 0 đến 3}` theo mốc, qua lớp tiến độ có sẵn (đăng nhập hay khách):
 * `record` ghi vào máy ngay, đẩy lên máy chủ sau (như các trạm bài học). Tab bị ẩn thì tạm dừng và chờ em bấm "Tiếp tục".
 */
export function MiniGameLevel({ levelId, medals, renderGame, onLeave }: MiniGameLevelProps) {
  const { progress, record, saveNow } = useProgress();
  const navigate = useNavigate();
  const def = levelById(levelId);
  const text = GAMES[levelId];
  const [stage, setStage] = useState<Stage>({ kind: 'card' });
  const [attempt, setAttempt] = useState(0);
  const hidden = useTabHidden();
  // Tab bị ẩn lúc đang chơi thì dừng và giữ dừng cho tới khi em bấm "Tiếp tục" (khỏi chạy tiếp lúc em chưa nhìn).
  const [held, setHeld] = useState(false);
  useEffect(() => {
    if (hidden && stage.kind === 'play') setHeld(true);
  }, [hidden, stage.kind]);
  const paused = stage.kind === 'play' && (hidden || held);

  const finished = useRef(false);
  const onFinish = useCallback(
    (score: number, parts: readonly ScorePart[] = []) => {
      if (finished.current) return; // chỉ nhận một lần cho mỗi ván
      finished.current = true;
      const before = progressManager.getSnapshot().progress.levels[levelId]?.bestScore ?? 0;
      const { coinsEarned } = record(levelId, gameResultOf(score, medals));
      void saveNow();
      const sum = summarizeGame(score, medals, before);
      setStage({ kind: 'result', score: sum.score, medal: sum.medal, newBest: sum.newBest, coins: coinsEarned, parts });
    },
    [levelId, medals, record, saveNow],
  );

  const start = () => {
    finished.current = false;
    setHeld(false);
    setAttempt((a) => a + 1);
    setStage({ kind: 'play' });
  };
  const leave = onLeave ?? (() => navigate(def ? `/lang/${def.lang}` : '/'));

  const title = fmt(text?.ten ?? def?.ten ?? '');
  const best = progress.levels[levelId]?.bestScore ?? 0;
  const moc = fmt(gameUi.cacMoc, { so: medals[0], so2: medals[1], so3: medals[2] });

  if (stage.kind === 'play') {
    return (
      <div className="relative">
        {renderGame({ paused, attempt, onFinish })}
        {paused && (
          <div role="dialog" aria-label={gameUi.tamDung} className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
            <Panel className="w-full max-w-sm space-y-4 text-center">
              <h2 className="text-2xl">{gameUi.tamDung}</h2>
              <p>{gameUi.tamDungLoiNhac}</p>
              <Button size="lg" fullWidth disabled={hidden} onClick={() => setHeld(false)}>
                {gameUi.tiepTuc}
              </Button>
            </Panel>
          </div>
        )}
      </div>
    );
  }

  if (stage.kind === 'result') {
    return (
      <div className="mx-auto w-full max-w-xl px-4 py-8">
        <Panel className="space-y-5 p-6 text-center sm:p-8">
          <div className="flex justify-center">
            <PortraitFrame portrait="bi" size={96} />
          </div>
          <h2 className="text-3xl text-muc-tim-dam">{title}</h2>
          <p className="text-lg font-semibold">{gameUi.ketQua}</p>
          <p className="font-display text-5xl font-extrabold" data-testid="diem">
            {fmt(gameUi.diem, { diem: formatNumber(stage.score) })}
          </p>
          {stage.parts.length > 0 && (
            <section aria-label={gameUi.cacPhanDiem} className="mx-auto w-full max-w-sm rounded-2xl border-2 border-nau-go/50 bg-white/60 p-3 text-left">
              <h3 className="mb-1 text-center text-sm font-bold text-nau-go-dam">{gameUi.cacPhanDiem}</h3>
              <ul className="space-y-0.5" data-testid="phan-diem">
                {stage.parts.map((p) => (
                  <li key={p.label}>{fmt(gameUi.dongDiem, { nhan: p.label, so: formatNumber(p.count), diem: formatNumber(p.points) })}</li>
                ))}
              </ul>
            </section>
          )}
          {stage.newBest && <p className="font-bold text-xanh-la-dam">{gameUi.kyLucMoi}</p>}
          <div className="flex justify-center">
            <Stars earned={stage.medal} max={3} size="lg" />
          </div>
          <p className="text-xl font-bold">{fmt(gameUi.mocDatDuoc, { muc: gameUi.moc[stage.medal] })}</p>
          <p className="text-sm">{moc}</p>
          {stage.coins > 0 && <p className="font-semibold">{fmt(gameUi.xuNhan, { so: stage.coins })}</p>}
          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            <Button size="lg" onClick={start}>
              {gameUi.choiLai}
            </Button>
            <Button size="lg" variant="secondary" onClick={leave}>
              {gameUi.veLang}
            </Button>
          </div>
        </Panel>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-8">
      <Panel className="space-y-5 p-6 sm:p-8">
        <h2 className="text-2xl sm:text-3xl">{title}</h2>
        {text && (
          <>
            <section aria-label={gameUi.luat}>
              <h3 className="mb-2 text-lg text-muc-tim-dam">{gameUi.luat}</h3>
              <ul className="list-disc space-y-1 pl-5">
                {text.luat.map((line) => (
                  <li key={line}>{fmt(line)}</li>
                ))}
              </ul>
            </section>
            <section aria-label={gameUi.dieuKhien}>
              <h3 className="mb-2 text-lg text-muc-tim-dam">{gameUi.dieuKhien}</h3>
              <p>
                <span className="font-bold">{gameUi.mayTinh}: </span>
                {text.dieuKhien.mayTinh}
              </p>
              <p>
                <span className="font-bold">{gameUi.dienThoai}: </span>
                {text.dieuKhien.dienThoai}
              </p>
            </section>
          </>
        )}
        <p className="font-semibold" data-testid="diem-cao">
          {best > 0 ? fmt(gameUi.diemCao, { diem: formatNumber(best) }) : gameUi.chuaChoi}
        </p>
        <p className="text-sm">{moc}</p>
        <div className="flex justify-center sm:justify-end">
          <Button size="lg" fullWidth className="sm:w-auto" onClick={start}>
            {gameUi.batDau}
          </Button>
        </div>
      </Panel>
    </div>
  );
}
