import { Suspense, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { onAnswer } from '../audio/answerSignal';
import { asset, useManifest } from '../assets/store';
import { useNavigate } from 'react-router';
import { MERGED, URLS, villageWorldUrl } from '../config/urls';
import { VILLAGE_THEME } from '../content/nenTrangTri';
import { fmt } from '../content/characters';
import { VILLAGE_ORDER, levelById, levelsOfVillage } from '../content/levels';
import { ui } from '../content/ui';
import { progressManager } from '../progress/singleton';
import { useProgress } from '../progress/ProgressProvider';
import type { SaveStatus } from '../progress/manager';
import { Button } from '../ui/Button';
import { NenTrangTri } from '../ui/NenTrangTri';
import { DialogueBox } from '../ui/DialogueBox';
import { EmCoBietDialog } from '../ui/EmCoBietDialog';
import { GuestBar } from '../ui/GuestBar';
import { LevelComplete } from '../ui/LevelComplete';
import { LevelFailed } from '../ui/LevelFailed';
import { LevelIntro } from '../ui/LevelIntro';
import { Panel } from '../ui/Panel';
import { Stars } from '../ui/Stars';
import type { VillageId } from '../village';
import { dialogueFor, finalLessonStars, goldenPageAwarded, momentBeforeStation, startStationIndex, stationOpen, withMoods } from './flow';
import { choiceReactions } from '../three/choiceReactions';
import { useChoiceDelegation } from '../three/useReaction';
import { GoldenPageScene } from './GoldenPageScene';
import { LessonCharacters } from './LessonCharacters';
import { useLessonFrames } from './useLessonFrames';
import { STATION_ORDER, type LessonContent, type StationId, type StationResult } from './types';

export interface StationDef {
  /**
   * Dựng nội dung trạm. Trạm gọi onComplete khi làm xong; trạm có tim thì gọi onFail(mẹo) khi hết tim
   * (hiện màn "Hết tim mất rồi!" với nút "Thử lại" làm lại trạm đó).
   */
  render: (p: { onComplete: (r: StationResult) => void; onFail: (tip: string) => void; onTwist: () => void }) => ReactNode;
  /**
   * Nếu trạm được tải sau (`lazy(() => import(...))`), đây là hàm tải. Trang gọi nó lúc rảnh sau khi đã hiện, trước khi em tới
   * trạm, để trang đầu không phải mang mã của cả 3 trạm.
   */
  preload?: () => void;
}

export interface LessonPage2DProps {
  /** Số màn, 1 đến 12 */
  levelId: number;
  villageId: VillageId;
  /** Ảnh nền của làng, ví dụ "scenes/bai-hoc-lang-giay" */
  background: string;
  content: LessonContent;
  stations: Record<StationId, StationDef>;
  /**
   * Phát mỗi khi em nộp một câu trả lời (đúng hoặc sai) ở bất kỳ trạm nào (spec 03 mục 4). Hai khung 3D tự nghe kho
   * `choiceReactions`, không cần dùng prop này; dành cho nơi khác muốn biết (ví dụ ghi số liệu).
   */
  onAnswer?: (dung: boolean) => void;
}

type Stage =
  | { kind: 'dialogue'; idx: number }
  | { kind: 'intro'; idx: number }
  | { kind: 'play'; idx: number }
  | { kind: 'failed'; idx: number; tip: string }
  | { kind: 'stationDone'; idx: number; result: StationResult; coins: number }
  | { kind: 'saving' }
  | { kind: 'outro' }
  | { kind: 'complete' }
  | { kind: 'award' };

const TEN_TRAM = ui.baiHoc.tram;

/** Chờ bấy nhiêu ms sau khi trang hiện rồi mới nạp mã của trạm sắp tới. */
const STATION_PRELOAD_DELAY_MS = 1500;

/**
 * Khung trang bài học 2D (spec 03 mục 0, loại D): nền ảnh của làng, bảng bài học trên giấy dó,
 * thanh trên (tên màn, 3 trạm kèm sao, nút "Về bản đồ"), lời người dẫn theo thời điểm,
 * ghi tiến độ từng trạm, màn hoàn thành và cảnh trao Trang Sổ Vàng.
 */
export function LessonPage2D({ levelId, villageId, background, content, stations, onAnswer: onAnswerProp }: LessonPage2DProps) {
  const level = levelById(levelId);
  const villageIndex = VILLAGE_ORDER.indexOf(villageId);
  const { progress, record, saveNow, saving, goldenPages } = useProgress();
  const manifest = useManifest();

  // `onAnswer(dung)`: mọi lần em trả lời đúng/sai ở bất kỳ trạm nào đều đi qua sound.playCorrect/playWrong.
  const answerRef = useRef(onAnswerProp);
  answerRef.current = onAnswerProp;
  useEffect(() => onAnswer((dung) => answerRef.current?.(dung)), []);
  // Rê chuột hoặc focus vào nút nào ở trạm thì học sinh 3D nhìn và chỉ về nút đó; vào bài mới thì xóa phản ứng cũ.
  const playArea = useRef<HTMLDivElement>(null);
  useEffect(() => {
    choiceReactions.reset();
    return () => choiceReactions.reset();
  }, [levelId]);

  // Vào lại màn: bắt đầu ở trạm đầu tiên chưa có sao (đã xong cả 3 thì ở trạm Dễ).
  const [stage, setStage] = useState<Stage>(() => ({ kind: 'dialogue', idx: startStationIndex(progress.levels[levelId]?.stars ?? {}) }));
  const [attempt, setAttempt] = useState(0);
  const [showCards, setShowCards] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const [awardNow, setAwardNow] = useState(false);
  const [twistOpen, setTwistOpen] = useState(false);

  // Dữ liệu của lần học này: số xu nhận được, thời gian, sao từng trạm, số Trang Sổ Vàng trước khi học.
  const saved = progress.levels[levelId]?.stars ?? {};
  // `base`: sao đã có trước lần học này (để tính sao chung của bài khi chỉ học lại một vài trạm).
  const run = useRef({ coins: 0, timeMs: 0, stars: {} as Partial<Record<StationId, number>>, base: saved as Partial<Record<StationId, number>>, goldenBefore: goldenPages });
  const bg = useMemo(() => (manifest ? asset(background) : null), [manifest, background]);

  // Mỗi lần đổi bước thì cuộn lên đầu trang.
  const stageKey = stage.kind + ('idx' in stage ? stage.idx : '');
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [stageKey]);

  // Bài không có lời ở thời điểm này (ví dụ Bài 2 không có lời trước trạm Trung bình) thì đi thẳng bước kế.
  useEffect(() => {
    if (stage.kind === 'dialogue' && dialogueFor(content.dialogue, momentBeforeStation(stage.idx)).length === 0) {
      setStage({ kind: 'intro', idx: stage.idx });
    } else if (stage.kind === 'outro' && dialogueFor(content.dialogue, 'cuoiBai').length === 0) {
      setStage({ kind: 'complete' });
    }
  }, [stage, content.dialogue]);

  // Xong trạm thứ 3: lưu ngay, chờ xong mới đi tiếp ("Đang lưu…").
  const savingStarted = useRef(-1);
  useEffect(() => {
    if (stage.kind !== 'saving' || savingStarted.current === attempt) return;
    savingStarted.current = attempt;
    void (async () => {
      const status = await saveNow();
      const after = progressManager.getSnapshot().progress.game.goldenPages;
      setSaveStatus(status);
      setAwardNow(goldenPageAwarded(run.current.goldenBefore, after, villageIndex));
      setStage({ kind: 'outro' });
    })();
  }, [stage.kind, attempt, saveNow, villageIndex]);

  /** Bắt đầu một lần học mới từ trạm `idx` (Chơi lại, hoặc chọn trạm trên thanh trên). */
  const startAt = (idx: number) => {
    const snap = progressManager.getSnapshot().progress;
    run.current = { coins: 0, timeMs: 0, stars: {}, base: snap.levels[levelId]?.stars ?? {}, goldenBefore: snap.game.goldenPages };
    setAttempt((a) => a + 1);
    setAwardNow(false);
    setStage({ kind: 'dialogue', idx });
  };
  const restart = () => startAt(startStationIndex(progressManager.getSnapshot().progress.levels[levelId]?.stars ?? {}));

  // Đang làm dở hoặc đang xem kết quả trạm thì được chọn trạm khác; lúc lưu, nói lời kết, nhận trang thì không.
  const canPick =
    stage.kind === 'dialogue' || stage.kind === 'intro' || stage.kind === 'play' || stage.kind === 'failed' || stage.kind === 'stationDone' || stage.kind === 'complete';
  const pickStation = (i: number) => {
    if (!canPick || !stationOpen(saved, i)) return;
    if (stage.kind === 'complete') startAt(i);
    else {
      // Giữ nguyên lần học đang chạy (xu, thời gian), chỉ đổi trạm và dựng lại trạm từ đầu.
      setAttempt((a) => a + 1);
      setStage({ kind: 'dialogue', idx: i });
    }
  };

  const onStationComplete = (idx: number, r: StationResult) => {
    const id = STATION_ORDER[idx];
    // Ghi ngay (máy ngay, đẩy sau 2 giây): bỏ dở giữa chừng vẫn giữ sao các trạm đã xong.
    const { coinsEarned } = record(levelId, { stars: { [id]: r.stars } });
    run.current.coins += coinsEarned;
    run.current.timeMs += r.timeMs;
    run.current.stars[id] = r.stars;
    setStage({ kind: 'stationDone', idx, result: r, coins: coinsEarned });
  };

  // Rời bài thì về làng trong thế giới mở ở hub (`/cho?tu=<làng>`, cạnh các biển gỗ), và có "Chơi tiếp: [game 1]" nếu game 1 đã làm xong.
  const navigate = useNavigate();
  const goVillage = () => {
    const url = villageWorldUrl(URLS, villageId, MERGED);
    if (MERGED) navigate(url);
    else window.location.assign(url);
  };
  const goMap = goVillage;
  const leaveLabel = ui.langScene.veLang;
  const villageLevels = levelsOfVillage(villageId);
  const nextGame = villageLevels[villageLevels.findIndex((l) => l.id === levelId) + 1];
  const playNextGame = nextGame && nextGame.status === 'ready' ? { label: fmt(ui.langScene.choiTiep, { man: fmt(nextGame.ten) }), onClick: () => navigate(`/lang/${villageId}/man/${nextGame.id}`) } : undefined;

  // Hai khung 3D hai bên bảng: ẩn khi màn hẹp, giảm chuyển động, máy yếu, tải lỗi hoặc FPS thấp (frames.ts).
  // Có khung thì bảng thu nhỏ để chừa chỗ (quyết định lúc mở trang, giữ nguyên khi khung bị ẩn về sau).
  const frames = useLessonFrames(stage.kind === 'award');
  const zoomStyle = frames.zoom === null ? undefined : ({ '--lz': frames.zoom } as CSSProperties);
  const boardMax = frames.zoom === null ? 'max-w-4xl min-[1280px]:max-w-[calc(1200px/var(--lz))]' : 'max-w-4xl';
  useChoiceDelegation(playArea, stage.kind === 'play' && frames.visible);

  // Mã của trạm tải sau: nạp lúc rảnh khi em đang đọc lời thoại hoặc giới thiệu của trạm đó, để tới trạm không phải chờ.
  const stationsRef = useRef(stations);
  stationsRef.current = stations;
  const preloadIdx = stage.kind === 'dialogue' || stage.kind === 'intro' ? stage.idx : -1;
  useEffect(() => {
    if (preloadIdx < 0) return;
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number; cancelIdleCallback?: (id: number) => void };
    const load = () => stationsRef.current[STATION_ORDER[preloadIdx]]?.preload?.();
    let idle: number | undefined;
    const t = setTimeout(() => {
      if (w.requestIdleCallback) idle = w.requestIdleCallback(load, { timeout: 3000 });
      else load();
    }, STATION_PRELOAD_DELAY_MS);
    return () => {
      clearTimeout(t);
      if (idle !== undefined) w.cancelIdleCallback?.(idle);
    };
  }, [preloadIdx]);

  let body: ReactNode = null;
  if (stage.kind === 'dialogue') {
    const moment = momentBeforeStation(stage.idx);
    const turns = withMoods(dialogueFor(content.dialogue, moment), moment);
    body = turns.length === 0 ? null : (
      <div className="mx-auto flex w-full max-w-[960px] justify-center">
        <DialogueBox key={`d${attempt}-${stage.idx}`} turns={turns} onFinish={() => setStage({ kind: 'intro', idx: stage.idx })} />
      </div>
    );
  } else if (stage.kind === 'intro') {
    const meta = content.stations[STATION_ORDER[stage.idx]];
    body = (
      <LevelIntro
        title={fmt(meta.tieuDe)}
        objective={fmt(meta.mucTieu)}
        tip={meta.meo ? fmt(meta.meo) : undefined}
        lessonName={level ? fmt(level.ten) : undefined}
        difficultyLabel={TEN_TRAM[STATION_ORDER[stage.idx]]}
        onStart={() => setStage({ kind: 'play', idx: stage.idx })}
      />
    );
  } else if (stage.kind === 'play') {
    const id = STATION_ORDER[stage.idx];
    body = (
      <div ref={playArea}>
        <Panel className="p-2 sm:p-6" key={`p${attempt}-${id}`}>
          <Suspense fallback={<p role="status" className="p-6 text-center font-semibold">{ui.chung.dangTai}</p>}>
            {stations[id].render({
              onComplete: (r) => onStationComplete(stage.idx, r),
              onFail: (tip) => setStage({ kind: 'failed', idx: stage.idx, tip }),
              onTwist: () => setTwistOpen(true),
            })}
          </Suspense>
        </Panel>
      </div>
    );
  } else if (stage.kind === 'failed') {
    body = (
      <LevelFailed
        tip={stage.tip}
        onRetry={() => {
          // Làm lại đúng trạm đó từ đầu (dựng lại đề mới)
          setAttempt((a) => a + 1);
          setStage({ kind: 'play', idx: stage.idx });
        }}
        onExit={goMap}
      />
    );
  } else if (stage.kind === 'stationDone') {
    const id = STATION_ORDER[stage.idx];
    const last = stage.idx === STATION_ORDER.length - 1;
    body = (
      <Panel className="mx-auto w-full max-w-xl space-y-4 text-center">
        <h2 className="text-2xl">{fmt(ui.baiHoc.saoTram, { tenTram: TEN_TRAM[id], sao: stage.result.stars })}</h2>
        <div className="flex justify-center">
          <Stars earned={stage.result.stars} size="lg" />
        </div>
        <div className="rounded-2xl border-2 border-muc-tim/50 bg-white/70 p-4 text-left">
          <div className="mb-1 text-sm font-bold uppercase tracking-wider text-muc-tim-dam">
            <span aria-hidden="true">✨ </span>
            {ui.baiHoc.dieuVuaHoc}
          </div>
          <p className="text-lg font-semibold leading-relaxed">{fmt(stage.result.learned)}</p>
        </div>
        <p className="font-semibold">{fmt(ui.baiHoc.xuTram, { so: stage.coins })}</p>
        <Button
          size="lg"
          autoFocus
          onClick={() => (last ? setStage({ kind: 'saving' }) : setStage({ kind: 'dialogue', idx: stage.idx + 1 }))}
        >
          {last ? ui.baiHoc.xongBai : ui.baiHoc.tramTiepTheo}
        </Button>
      </Panel>
    );
  } else if (stage.kind === 'saving') {
    body = (
      <Panel className="mx-auto w-full max-w-md text-center" role="status">
        <p className="font-display text-2xl font-extrabold">{ui.tienDo.dangLuu}</p>
      </Panel>
    );
  } else if (stage.kind === 'outro') {
    const turns = withMoods(dialogueFor(content.dialogue, 'cuoiBai'), 'cuoiBai');
    body = turns.length === 0 ? null : (
      <div className="mx-auto flex w-full max-w-[960px] justify-center">
        <DialogueBox key={`o${attempt}`} turns={turns} onFinish={() => setStage({ kind: 'complete' })} />
      </div>
    );
  } else if (stage.kind === 'complete') {
    body = (
      <>
        <LevelComplete
          stars={finalLessonStars(run.current.base, run.current.stars)}
          coinsEarned={run.current.coins}
          timeSpentSec={Math.round(run.current.timeMs / 1000)}
          keyTakeaway={fmt(content.keyTakeaway)}
          onPlayAgain={restart}
          hasNextLevel
          nextLabel={awardNow ? ui.baiHoc.nhanTrang : leaveLabel}
          nextLessonUrl={undefined}
          onNextLevel={() => {
            if (awardNow) setStage({ kind: 'award' });
            else goVillage();
          }}
          extraAction={awardNow ? undefined : playNextGame}
        />
        {saveStatus === 'pending' && (
          <p role="status" className="mx-auto mt-2 max-w-xl px-4 text-center font-semibold">
            {ui.tienDo.chuaGuiDuoc}
          </p>
        )}
      </>
    );
  } else {
    body = <GoldenPageScene villageId={villageId} award={content.award} onLeave={goMap} leaveLabel={leaveLabel} />;
  }

  const currentIdx = 'idx' in stage ? stage.idx : stage.kind === 'saving' ? 2 : -1;
  // Thẻ riêng của trạm Khó chỉ hiện khi em đang ở trạm Khó.
  const onHard = currentIdx === STATION_ORDER.length - 1 && stage.kind !== 'complete';

  return (
    // isolate: để lớp nền trang trí (z âm) nằm trên ảnh nền của làng nhưng dưới bảng bài học.
    <div className="isolate min-h-screen bg-giay bg-cover bg-center" style={bg ? { backgroundImage: `url("${bg}")` } : undefined}>
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-20 bg-giay/55" />
      {/* Icon của làng: chỉ ở 2 khoảng trống hai bên bảng (màn từ 1296px, tối đa 4 mỗi bên), không bao giờ sau bảng; cảnh trao Trang Sổ Vàng thì rải cả màn kèm tia sáng. */}
      <NenTrangTri theme={VILLAGE_THEME[villageId]} variant={stage.kind === 'award' ? 'full' : 'sides'} sparkle={stage.kind === 'award'} image={null} sideMax={frames.visible ? 2 : undefined} />
      <LessonCharacters plan={frames} />
      <div className="lesson-zoom min-h-[calc(100vh/var(--lz))]" style={zoomStyle}>
        <div className="min-h-[calc(100vh/var(--lz))]">
        <GuestBar compact />
        <header className={`mx-auto flex w-full ${boardMax} flex-wrap items-center gap-x-3 gap-y-2 p-2 sm:p-3 max-[480px]:flex-nowrap max-[480px]:gap-1.5 max-[480px]:px-2 max-[480px]:py-1`}>
          <div className="min-w-0 flex-1 basis-full sm:basis-auto max-[480px]:basis-0">
            <h1 className="truncate font-display text-xl font-extrabold sm:text-2xl max-[480px]:line-clamp-2 max-[480px]:whitespace-normal max-[480px]:text-sm max-[480px]:leading-tight">
              {level ? fmt(level.ten) : ''}
            </h1>
          </div>
          <ol className="flex flex-1 items-stretch justify-center gap-1.5 sm:min-w-max sm:justify-start max-[480px]:flex-none max-[480px]:gap-0.5" aria-label={ui.baiHoc.cacTram}>
            {STATION_ORDER.map((id, i) => {
              const n = saved[id] ?? 0;
              const current = currentIdx === i && stage.kind !== 'complete';
              const open = stationOpen(saved, i);
              const label = current
                ? fmt(ui.baiHoc.tramDangLam, { tenTram: TEN_TRAM[id] })
                : n > 0
                  ? fmt(ui.baiHoc.tramDaXong, { tenTram: TEN_TRAM[id], sao: n })
                  : open
                    ? fmt(ui.baiHoc.tramMo, { tenTram: TEN_TRAM[id] })
                    : fmt(ui.baiHoc.tramKhoa, { tenTram: TEN_TRAM[id] });
              const icon = current ? '▶' : n > 0 ? '✓' : open ? '' : '🔒';
              return (
                <li key={id} className="flex min-[480px]:min-w-[5.5rem] min-[480px]:flex-1 sm:flex-none">
                  <button
                    type="button"
                    aria-label={label}
                    aria-current={current ? 'step' : undefined}
                    disabled={!open || !canPick}
                    onClick={() => pickStation(i)}
                    className={`flex min-h-11 w-full flex-col items-center justify-center rounded-nut border-2 px-2 py-1 text-center focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-muc-tim max-[480px]:min-w-0 max-[480px]:px-0.5 max-[480px]:py-0.5 ${
                      current
                        ? 'border-muc-tim bg-muc-tim/15'
                        : n > 0
                          ? 'border-xanh-la-dam bg-giay/90'
                          : open
                            ? 'border-nau-go bg-giay/90'
                            : 'border-dashed border-nau-go bg-giay/70'
                    } ${open && canPick && !current ? 'cursor-pointer' : 'cursor-default'}`}
                  >
                    <span className="font-display text-sm font-extrabold leading-tight">
                      <span aria-hidden="true" className="max-[480px]:block max-[480px]:h-4 max-[480px]:text-xs max-[480px]:leading-4">
                        {icon}
                        <span className="min-[480px]:hidden">{icon ? '' : ' '}</span>
                      </span>
                      <span className="max-[480px]:hidden">
                        {icon ? ' ' : ''}
                        {TEN_TRAM[id]}
                      </span>
                    </span>
                    <span className="max-[480px]:hidden">
                      <Stars earned={n} size="sm" />
                    </span>
                    <span className="hidden max-[480px]:block">
                      <Stars earned={n} size="xs" />
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
          <div className="flex items-center gap-2 max-[480px]:gap-1">
            {content.emCoBiet.length > 0 && (
              <>
                <Button variant="secondary" size="sm" className="max-[480px]:hidden" onClick={() => setShowCards(true)}>
                  {ui.baiHoc.emCoBiet}
                </Button>
                <IconButton label={ui.baiHoc.emCoBiet} icon="💡" onClick={() => setShowCards(true)} />
              </>
            )}
            <Button variant="secondary" size="sm" className="max-[480px]:hidden" disabled={saving} onClick={goMap}>
              {leaveLabel}
            </Button>
            <IconButton label={leaveLabel} icon="🏡" disabled={saving} onClick={goMap} />
          </div>
        </header>

        <main className={`mx-auto w-full ${boardMax} px-1 pb-10 pt-2 sm:px-3`}>{body}</main>
      </div>

      {twistOpen && content.twist && content.twist.length > 0 && (
        <div className="fixed inset-0 z-40 grid place-items-center overflow-y-auto bg-chu/30 p-3">
          <div className="flex w-full max-w-[960px] justify-center">
            <DialogueBox key={`t${attempt}`} turns={content.twist} onFinish={() => setTwistOpen(false)} />
          </div>
        </div>
      )}
      {showCards && <EmCoBietDialog cards={onHard ? [...content.emCoBiet, ...(content.emCoBietKho ?? [])] : content.emCoBiet} onClose={() => setShowCards(false)} />}
      </div>
    </div>
  );
}

/** Nút biểu tượng cho màn hình hẹp (dưới 480px): vùng bấm 44px, có nhãn đọc cho người dùng đọc màn hình. */
function IconButton({ label, icon, onClick, disabled }: { label: string; icon: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="hidden size-11 shrink-0 cursor-pointer place-items-center rounded-nut border-2 border-nau-go bg-giay text-xl shadow-[0_3px_0_0_var(--color-nau-go)] active:translate-y-[2px] active:shadow-none disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-muc-tim max-[480px]:grid"
    >
      <span aria-hidden="true">{icon}</span>
    </button>
  );
}

