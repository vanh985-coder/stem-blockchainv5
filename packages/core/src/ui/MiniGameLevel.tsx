import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { MERGED, URLS, villageWorldUrl } from '../config/urls';
import { fmt } from '../content/characters';
import { GAMES, gameUi } from '../content/games';
import { gameHints } from '../content/gameHints';
import { guideSectionOfLevel, huongDan } from '../content/huongDan';
import { levelById, nextReadyLevel } from '../content/levels';
import { gameResultOf, summarizeGame, type Medal, type MedalThresholds } from '../games/medals';
import { formatNumber } from '../lib/format';
import { progressManager } from '../progress/singleton';
import { useProgress } from '../progress/ProgressProvider';
import { Button } from './Button';
import { GuideDialog } from './GuideDialog';
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
  /** Game đăng ký hàm trả câu nhắc "Việc của em lúc này" cho nút "?" (gọi `useGameHint`); khung chỉ gọi hàm đó lúc em bấm "?", khi `paused` đã true */
  setHint: (fn: (() => string) | null) => void;
}

/**
 * Cảnh cuối của một game phụ (màn 12: cảnh cao trào), chạy giữa lúc ván kết thúc và màn kết quả. Kết quả đã được ghi vào tiến độ TRƯỚC cảnh (đóng tab giữa chừng vẫn giữ kết quả và Trang Sổ Vàng).
 */
export interface MiniGameFinale {
  /** Có tự chiếu ngay sau ván này không (lần đầu: cờ chưa ghi). Xét đúng lúc ván kết thúc. */
  auto: boolean;
  /** Vẽ cảnh. Xong hay "Bỏ qua" đều gọi `onDone` (sang màn kết quả); `replay` true khi em bấm xem lại ở màn kết quả. */
  render: (p: { replay: boolean; onDone: () => void }) => ReactNode;
  /** Chữ nút xem lại ở màn kết quả ("Xem lại cảnh cuối") */
  replayLabel: string;
}

export interface MiniGameLevelProps {
  /** Số màn (1 đến 12) của game này */
  levelId: number;
  /** Ba mốc điểm Đồng, Bạc, Vàng của game (spec từng game) */
  medals: MedalThresholds;
  /** Vẽ phần chơi (bước 11 đến 12 của màn 2, tương tự cho các game khác) */
  renderGame: (props: MiniGameRenderProps) => ReactNode;
  /** Bấm "Về làng": mặc định về làng của màn này trong thế giới mở ở hub (`/cho?tu=<làng>`) */
  onLeave?: () => void;
  /** Cảnh cuối sau ván (tùy game) */
  finale?: MiniGameFinale;
}

type ResultStage = { kind: 'result'; score: number; medal: Medal; newBest: boolean; coins: number; parts: readonly ScorePart[] };
type Stage = { kind: 'card' } | { kind: 'play' } | ResultStage | { kind: 'finale'; result: ResultStage; replay: boolean };

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
export function MiniGameLevel({ levelId, medals, renderGame, onLeave, finale }: MiniGameLevelProps) {
  const { progress, record, saveNow } = useProgress();
  const navigate = useNavigate();
  const def = levelById(levelId);
  const text = GAMES[levelId];
  const [stage, setStage] = useState<Stage>({ kind: 'card' });
  const [attempt, setAttempt] = useState(0);
  // "Hướng dẫn chơi" ở thẻ bắt đầu: mở thẳng phần của game này
  const [guideOpen, setGuideOpen] = useState(false);
  // Nút "?" (phím H) trong lúc chơi: hộp nhắc việc (chữ đã dựng lúc mở; null là đang đóng) và hướng dẫn đầy đủ mở từ hộp đó
  const hintFn = useRef<(() => string) | null>(null);
  const setHint = useCallback((fn: (() => string) | null) => {
    hintFn.current = fn;
  }, []);
  const [hint, setHintText] = useState<string | null>(null);
  const [playGuide, setPlayGuide] = useState(false);
  const playGuideRef = useRef(false);
  playGuideRef.current = playGuide;
  const hidden = useTabHidden();
  // Tab bị ẩn lúc đang chơi thì dừng và giữ dừng cho tới khi em bấm "Tiếp tục" (khỏi chạy tiếp lúc em chưa nhìn).
  const [held, setHeld] = useState(false);
  useEffect(() => {
    if (hidden && stage.kind === 'play') setHeld(true);
  }, [hidden, stage.kind]);
  const tabPaused = hidden || held;
  // Game dừng thật (mọi đồng hồ đứng) khi tab ẩn, khi em chưa bấm "Tiếp tục", và suốt lúc hộp "?" mở
  const paused = stage.kind === 'play' && (tabPaused || hint !== null);

  const openHint = useCallback(() => {
    setHintText(fmt(gameHints.viecCuaEm, { nd: fmt(hintFn.current?.() ?? gameHints.macDinh) }));
  }, []);
  const closeHint = useCallback(() => {
    setHintText(null);
    setPlayGuide(false);
  }, []);
  // Phím H mở/đóng hộp, Esc đóng (khi đang xem hướng dẫn đầy đủ thì Esc chỉ đóng hướng dẫn)
  useEffect(() => {
    if (stage.kind !== 'play') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
      const t = e.target;
      if (t instanceof Element && t.closest('input, textarea, select, [contenteditable="true"]')) return;
      if (e.key === 'h' || e.key === 'H') {
        e.preventDefault();
        if (playGuideRef.current) return;
        setHintText((cur) => (cur === null ? fmt(gameHints.viecCuaEm, { nd: fmt(hintFn.current?.() ?? gameHints.macDinh) }) : null));
      } else if (e.key === 'Escape' && !playGuideRef.current) {
        setHintText(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [stage.kind]);

  const finished = useRef(false);
  const onFinish = useCallback(
    (score: number, parts: readonly ScorePart[] = []) => {
      if (finished.current) return; // chỉ nhận một lần cho mỗi ván
      finished.current = true;
      const before = progressManager.getSnapshot().progress.levels[levelId]?.bestScore ?? 0;
      const { coinsEarned } = record(levelId, gameResultOf(score, medals));
      void saveNow();
      const sum = summarizeGame(score, medals, before);
      const result: ResultStage = { kind: 'result', score: sum.score, medal: sum.medal, newBest: sum.newBest, coins: coinsEarned, parts };
      setStage(finale?.auto ? { kind: 'finale', result, replay: false } : result);
    },
    [levelId, medals, record, saveNow, finale?.auto],
  );

  const start = () => {
    finished.current = false;
    setHeld(false);
    closeHint();
    setAttempt((a) => a + 1);
    setStage({ kind: 'play' });
  };
  const leave =
    onLeave ??
    (() => {
      if (!def) return navigate('/');
      const url = villageWorldUrl(URLS, def.lang, MERGED);
      if (MERGED) navigate(url);
      else window.location.assign(url);
    });

  const next = nextReadyLevel(levelId);
  const title = fmt(text?.ten ?? def?.ten ?? '');
  const best = progress.levels[levelId]?.bestScore ?? 0;
  const moc = fmt(gameUi.cacMoc, { so: medals[0], so2: medals[1], so3: medals[2] });

  if (stage.kind === 'play') {
    return (
      <div className="relative">
        {renderGame({ paused, attempt, onFinish, setHint })}
        {!tabPaused && (
          <button
            type="button"
            onClick={hint === null ? openHint : closeHint}
            aria-label={gameHints.nut}
            aria-haspopup="dialog"
            data-testid="nut-goi-y"
            className="fixed right-2 top-2 z-30 grid size-11 min-h-11 min-w-11 cursor-pointer place-items-center rounded-full border-[3px] border-nau-go bg-giay font-display text-xl font-extrabold text-chu focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-muc-tim"
          >
            {gameHints.kyHieu}
          </button>
        )}
        {hint !== null && !tabPaused && (
          <div role="dialog" aria-modal="true" aria-label={gameHints.tieuDe} data-testid="hop-goi-y" className="fixed inset-0 z-40 grid place-items-center bg-black/50 p-4">
            <Panel className="w-full max-w-md space-y-4 text-center [@media(max-height:500px)]:space-y-2 [@media(max-height:500px)]:p-3">
              <p className="text-lg font-semibold leading-relaxed [@media(max-height:500px)]:text-base" data-testid="viec-cua-em">
                {hint}
              </p>
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
                <Button size="md" variant="secondary" className="min-h-11 whitespace-nowrap" onClick={() => setPlayGuide(true)}>
                  {gameHints.xemDayDu}
                </Button>
                <Button size="md" autoFocus className="min-h-11 whitespace-nowrap" onClick={closeHint}>
                  {gameHints.tiepTuc}
                </Button>
              </div>
            </Panel>
          </div>
        )}
        {playGuide && <GuideDialog section={guideSectionOfLevel(levelId) ?? undefined} onClose={() => setPlayGuide(false)} />}
        {tabPaused && (
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

  if (stage.kind === 'finale' && finale) {
    const result = stage.result;
    return <div data-testid="man-cuoi">{finale.render({ replay: stage.replay, onDone: () => setStage(result) })}</div>;
  }

  if (stage.kind === 'result') {
    // Điện thoại ngang (thấp dưới 500 điểm ảnh): hai cột trong đúng một màn hình, không cuộn (xem .mg-result trong theme.css). Màn khác: một cột như cũ.
    return (
      <div className="mg-result mx-auto w-full max-w-xl px-4 py-8">
        <Panel className="mg-result-panel space-y-5 p-6 text-center sm:p-8">
          <div className="mg-result-main space-y-5">
            <div className="mg-result-portrait flex justify-center">
              <PortraitFrame portrait="bi" size={96} />
            </div>
            <h2 className="text-3xl text-muc-tim-dam">{title}</h2>
            <p className="text-lg font-semibold">{gameUi.ketQua}</p>
            <p className="font-display text-5xl font-extrabold" data-testid="diem">
              {fmt(gameUi.diem, { diem: formatNumber(stage.score) })}
            </p>
            {stage.newBest && <p className="font-bold text-xanh-la-dam">{gameUi.kyLucMoi}</p>}
            <div className="mg-result-stars flex justify-center">
              <Stars earned={stage.medal} max={3} size="lg" />
            </div>
            <p className="text-xl font-bold">{fmt(gameUi.mocDatDuoc, { muc: gameUi.moc[stage.medal] })}</p>
          </div>
          <div className="mg-result-side space-y-5">
            {stage.parts.length > 0 && (
              <section aria-label={gameUi.cacPhanDiem} className="mg-result-parts mx-auto w-full max-w-sm rounded-2xl border-2 border-nau-go/50 bg-white/60 p-3 text-left">
                <h3 className="mb-1 text-center text-sm font-bold text-nau-go-dam">{gameUi.cacPhanDiem}</h3>
                <ul className="space-y-0.5" data-testid="phan-diem">
                  {stage.parts.map((p) => (
                    <li key={p.label}>{fmt(gameUi.dongDiem, { nhan: p.label, so: formatNumber(p.count), diem: formatNumber(p.points) })}</li>
                  ))}
                </ul>
              </section>
            )}
            <p className="text-sm">{moc}</p>
            {stage.coins > 0 && <p className="font-semibold">{fmt(gameUi.xuNhan, { so: stage.coins })}</p>}
            <div className="mg-result-buttons flex flex-col justify-center gap-3 sm:flex-row">
              <Button size="lg" variant={next ? 'secondary' : 'primary'} onClick={start}>
                {gameUi.choiLai}
              </Button>
              {next && (
                <Button size="lg" aria-label={fmt(gameUi.choiTiepNhan, { man: fmt(next.ten) })} data-testid="choi-tiep" onClick={() => navigate(`/lang/${next.lang}/man/${next.id}`)}>
                  {gameUi.choiTiep}
                </Button>
              )}
              <Button size="lg" variant="secondary" onClick={leave}>
                {gameUi.veLang}
              </Button>
              {finale && (
                <Button size="lg" variant="secondary" data-testid="xem-lai-canh-cuoi" onClick={() => setStage({ kind: 'finale', result: stage, replay: true })}>
                  {finale.replayLabel}
                </Button>
              )}
            </div>
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
        <div className="flex flex-col justify-center gap-3 sm:flex-row sm:justify-end">
          <Button size="lg" variant="secondary" fullWidth className="sm:w-auto" onClick={() => setGuideOpen(true)}>
            {huongDan.nut}
          </Button>
          <Button size="lg" fullWidth className="sm:w-auto" onClick={start}>
            {gameUi.batDau}
          </Button>
        </div>
      </Panel>
      {guideOpen && <GuideDialog section={guideSectionOfLevel(levelId) ?? undefined} onClose={() => setGuideOpen(false)} />}
    </div>
  );
}
