import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { asset, useManifest } from '../assets/store';
import { HUB_MAP_URL } from '../config/urls';
import { fmt } from '../content/characters';
import { VILLAGE_ORDER, levelById } from '../content/levels';
import { ui } from '../content/ui';
import { progressManager } from '../progress/singleton';
import { useProgress } from '../progress/ProgressProvider';
import type { SaveStatus } from '../progress/manager';
import { Button } from '../ui/Button';
import { DialogueBox } from '../ui/DialogueBox';
import { GuestBar } from '../ui/GuestBar';
import { LevelComplete } from '../ui/LevelComplete';
import { LevelIntro } from '../ui/LevelIntro';
import { Panel } from '../ui/Panel';
import { Stars } from '../ui/Stars';
import type { VillageId } from '../village';
import { dialogueFor, goldenPageAwarded, lessonStars, momentBeforeStation } from './flow';
import { GoldenPageScene } from './GoldenPageScene';
import { STATION_ORDER, type LessonContent, type StationId, type StationResult } from './types';

export interface StationDef {
  /** Dựng nội dung trạm; trạm gọi onComplete khi làm xong */
  render: (p: { onComplete: (r: StationResult) => void }) => ReactNode;
}

export interface LessonPage2DProps {
  /** Số màn, 1 đến 12 */
  levelId: number;
  villageId: VillageId;
  /** Ảnh nền của làng, ví dụ "scenes/bai-hoc-lang-giay" */
  background: string;
  content: LessonContent;
  stations: Record<StationId, StationDef>;
}

type Stage =
  | { kind: 'dialogue'; idx: number }
  | { kind: 'intro'; idx: number }
  | { kind: 'play'; idx: number }
  | { kind: 'stationDone'; idx: number; result: StationResult; coins: number }
  | { kind: 'saving' }
  | { kind: 'outro' }
  | { kind: 'complete' }
  | { kind: 'award' };

const TEN_TRAM = ui.baiHoc.tram;

/**
 * Khung trang bài học 2D (spec 03 mục 0, loại D): nền ảnh của làng, bảng bài học trên giấy dó,
 * thanh trên (tên màn, 3 trạm kèm sao, nút "Về bản đồ"), lời người dẫn theo thời điểm,
 * ghi tiến độ từng trạm, màn hoàn thành và cảnh trao Trang Sổ Vàng.
 */
export function LessonPage2D({ levelId, villageId, background, content, stations }: LessonPage2DProps) {
  const level = levelById(levelId);
  const villageIndex = VILLAGE_ORDER.indexOf(villageId);
  const { progress, record, saveNow, saving, goldenPages } = useProgress();
  const manifest = useManifest();

  const [stage, setStage] = useState<Stage>({ kind: 'dialogue', idx: 0 });
  const [attempt, setAttempt] = useState(0);
  const [showCards, setShowCards] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const [awardNow, setAwardNow] = useState(false);

  // Dữ liệu của lần học này: số xu nhận được, thời gian, sao từng trạm, số Trang Sổ Vàng trước khi học.
  const run = useRef({ coins: 0, timeMs: 0, stars: {} as Partial<Record<StationId, number>>, goldenBefore: goldenPages });

  const saved = progress.levels[levelId]?.stars ?? {};
  const bg = useMemo(() => (manifest ? asset(background) : null), [manifest, background]);

  // Mỗi lần đổi bước thì cuộn lên đầu trang.
  const stageKey = stage.kind + ('idx' in stage ? stage.idx : '');
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [stageKey]);

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

  const restart = () => {
    run.current = { coins: 0, timeMs: 0, stars: {}, goldenBefore: progressManager.getSnapshot().progress.game.goldenPages };
    setAttempt((a) => a + 1);
    setAwardNow(false);
    setStage({ kind: 'dialogue', idx: 0 });
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

  const goMap = () => window.location.assign(HUB_MAP_URL);

  let body: ReactNode = null;
  if (stage.kind === 'dialogue') {
    body = (
      <div className="mx-auto w-full max-w-2xl">
        <DialogueBox
          key={`d${attempt}-${stage.idx}`}
          turns={dialogueFor(content.dialogue, momentBeforeStation(stage.idx))}
          onFinish={() => setStage({ kind: 'intro', idx: stage.idx })}
        />
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
    body = <Panel className="p-2 sm:p-6" key={`p${attempt}-${id}`}>{stations[id].render({ onComplete: (r) => onStationComplete(stage.idx, r) })}</Panel>;
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
    body = (
      <div className="mx-auto w-full max-w-2xl">
        <DialogueBox key={`o${attempt}`} turns={dialogueFor(content.dialogue, 'cuoiBai')} onFinish={() => setStage({ kind: 'complete' })} />
      </div>
    );
  } else if (stage.kind === 'complete') {
    body = (
      <>
        <LevelComplete
          stars={lessonStars(run.current.stars)}
          coinsEarned={run.current.coins}
          timeSpentSec={Math.round(run.current.timeMs / 1000)}
          keyTakeaway={fmt(content.keyTakeaway)}
          onPlayAgain={restart}
          hasNextLevel={awardNow}
          nextLabel={awardNow ? ui.baiHoc.nhanTrang : ui.baiHoc.veBanDo}
          nextLessonUrl={awardNow ? undefined : HUB_MAP_URL}
          onNextLevel={() => {
            if (awardNow) setStage({ kind: 'award' });
          }}
        />
        {saveStatus === 'pending' && (
          <p role="status" className="mx-auto mt-2 max-w-xl px-4 text-center font-semibold">
            {ui.tienDo.chuaGuiDuoc}
          </p>
        )}
      </>
    );
  } else {
    body = <GoldenPageScene villageId={villageId} award={content.award} onLeave={goMap} />;
  }

  const currentIdx = 'idx' in stage ? stage.idx : stage.kind === 'saving' ? 2 : -1;

  return (
    <div className="min-h-screen bg-giay bg-cover bg-center" style={bg ? { backgroundImage: `url("${bg}")` } : undefined}>
      <div className="min-h-screen bg-giay/55">
        <GuestBar />
        <header className="mx-auto flex w-full max-w-4xl flex-wrap items-center gap-x-3 gap-y-2 p-2 sm:p-3">
          <div className="min-w-0 flex-1 basis-full sm:basis-auto">
            <h1 className="truncate font-display text-xl font-extrabold sm:text-2xl">{level ? fmt(level.ten) : ''}</h1>
          </div>
          <ol className="flex flex-1 items-stretch justify-center gap-1.5 sm:justify-start" aria-label={ui.baiHoc.cacTram}>
            {STATION_ORDER.map((id, i) => {
              const n = saved[id] ?? 0;
              const current = currentIdx === i && stage.kind !== 'complete';
              const label =
                n > 0 && !current
                  ? fmt(ui.baiHoc.tramDaXong, { tenTram: TEN_TRAM[id], sao: n })
                  : current
                    ? fmt(ui.baiHoc.tramDangLam, { tenTram: TEN_TRAM[id] })
                    : fmt(ui.baiHoc.tramChuaToi, { tenTram: TEN_TRAM[id] });
              return (
                <li
                  key={id}
                  aria-label={label}
                  aria-current={current ? 'step' : undefined}
                  className={`flex min-w-[5.5rem] flex-1 flex-col items-center rounded-nut border-2 px-2 py-1 text-center sm:flex-none ${
                    current ? 'border-muc-tim bg-muc-tim/15' : n > 0 ? 'border-xanh-la-dam bg-giay/90' : 'border-dashed border-nau-go bg-giay/70'
                  }`}
                >
                  <span className="font-display text-sm font-extrabold leading-tight">
                    <span aria-hidden="true">{current ? '▶ ' : n > 0 ? '✓ ' : ''}</span>
                    {TEN_TRAM[id]}
                  </span>
                  <Stars earned={n} size="sm" />
                </li>
              );
            })}
          </ol>
          <div className="flex items-center gap-2">
            {content.emCoBiet.length > 0 && (
              <Button variant="secondary" size="sm" onClick={() => setShowCards(true)}>
                {ui.baiHoc.emCoBiet}
              </Button>
            )}
            <Button variant="secondary" size="sm" disabled={saving} onClick={goMap}>
              {ui.baiHoc.veBanDo}
            </Button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-4xl px-1 pb-10 pt-2 sm:px-3">{body}</main>
      </div>

      {showCards && <CardsDialog cards={content.emCoBiet} onClose={() => setShowCards(false)} />}
    </div>
  );
}

/** Hộp "Em có biết?": các thẻ kiến thức của bài, xem lần lượt. */
function CardsDialog({ cards, onClose }: { cards: LessonContent['emCoBiet']; onClose: () => void }) {
  const [i, setI] = useState(0);
  const card = cards[i];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-chu/40 p-4" onClick={onClose}>
      <Panel
        role="dialog"
        aria-modal="true"
        aria-label={ui.baiHoc.emCoBiet}
        className="w-full max-w-lg space-y-3"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-sm font-bold uppercase tracking-wider text-nau-go-dam">
          {ui.baiHoc.emCoBiet} · {fmt(ui.baiHoc.theSo, { n: i + 1, tong: cards.length })}
        </p>
        <h2 className="text-2xl">{fmt(card.title)}</h2>
        <p className="text-lg leading-relaxed">{fmt(card.text)}</p>
        {card.example && <p className="rounded-xl border-2 border-vang bg-vang/15 p-3 text-base">{fmt(card.example)}</p>}
        <div className="flex flex-wrap justify-between gap-2 pt-1">
          <Button variant="secondary" size="sm" disabled={i === 0} onClick={() => setI(i - 1)}>
            {ui.baiHoc.truoc}
          </Button>
          {i < cards.length - 1 ? (
            <Button size="sm" onClick={() => setI(i + 1)}>
              {ui.baiHoc.sau}
            </Button>
          ) : (
            <Button size="sm" autoFocus onClick={onClose}>
              {ui.baiHoc.dong}
            </Button>
          )}
        </div>
      </Panel>
    </div>
  );
}
