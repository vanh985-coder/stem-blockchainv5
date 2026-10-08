import { useMemo, useState } from 'react';
import {
  Button,
  LEVELS,
  Panel,
  QuizCard,
  VILLAGE_ORDER,
  computeUnlock,
  fmt,
  levelById,
  pickQuestions,
  ui,
  type LevelState,
  type LevelStatus,
} from '@so-chung/core';

const TOTAL = 4;

/** QuizCard chạy 4 câu Bài 1, lấy bằng pickQuestions. */
export function QuizDemo() {
  const [seed, setSeed] = useState(1);
  const questions = useMemo(() => pickQuestions({ bai: 1, soCau: TOTAL, seed }), [seed]);
  const [index, setIndex] = useState(0);
  const [right, setRight] = useState(0);
  const finished = index >= questions.length;

  return (
    <div className="space-y-3">
      {!finished ? (
        <QuizCard
          question={questions[index]}
          caption={fmt(ui.dev.quizCau, { so: index + 1, max: questions.length })}
          onAnswer={(correct) => setRight((r) => r + (correct ? 1 : 0))}
          onContinue={() => setIndex((i) => i + 1)}
        />
      ) : (
        <Panel className="max-w-2xl space-y-3">
          <p className="font-display text-xl font-extrabold">{fmt(ui.dev.quizKetQua, { so: right, max: questions.length })}</p>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setSeed((s) => s + 1);
              setIndex(0);
              setRight(0);
            }}
          >
            {ui.dev.quizLamLai}
          </Button>
        </Panel>
      )}
    </div>
  );
}

const STATE_TEXT: Record<LevelState, string> = {
  locked: ui.moKhoa.khoa,
  open: ui.moKhoa.mo,
  done: ui.moKhoa.xong,
  'coming-soon': ui.moKhoa.sapRaMat,
};
const STATE_ICON: Record<LevelState, string> = { locked: '🔒', open: '▶', done: '✓', 'coming-soon': '⏳' };

/** Bảng 12 màn với nút giả lập, hiện kết quả của unlock.ts. */
export function UnlockDemo() {
  const [done, setDone] = useState<number[]>([]);
  const [soon, setSoon] = useState<Record<number, LevelStatus>>(() => Object.fromEntries(LEVELS.map((l) => [l.id, l.status])));
  const [teacher, setTeacher] = useState(false);
  const [saved, setSaved] = useState(0); // golden_pages đã lưu: chỉ tăng

  const result = useMemo(
    () => computeUnlock({ doneLevels: done, statuses: soon, isTeacher: teacher, goldenPages: saved }),
    [done, soon, teacher, saved],
  );
  // Ghi nhớ số trang đã trao, giống như cột golden_pages ở cơ sở dữ liệu.
  if (result.goldenPages > saved) setSaved(result.goldenPages);

  const toggleDone = (id: number) => setDone((d) => (d.includes(id) ? d.filter((x) => x !== id) : [...d, id]));
  const toggleStatus = (id: number) =>
    setSoon((s) => ({ ...s, [id]: s[id] === 'ready' ? 'coming-soon' : 'ready' }));

  return (
    <Panel className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex min-h-11 items-center gap-2 font-semibold">
          <input type="checkbox" className="size-5" checked={teacher} onChange={(e) => setTeacher(e.target.checked)} />
          {ui.dev.moKhoaGiaoVien}
        </label>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            setDone([]);
            setSaved(0);
            setTeacher(false);
            setSoon(Object.fromEntries(LEVELS.map((l) => [l.id, l.status])));
          }}
        >
          {ui.dev.moKhoaDatLai}
        </Button>
      </div>
      <p className="font-display text-lg font-extrabold">
        {fmt(ui.moKhoa.trangSoVang, { so: result.goldenPages, max: VILLAGE_ORDER.length })}
      </p>
      <p className="text-sm text-nau-go-dam">{fmt(ui.dev.moKhoaDaLuu, { so: saved })}</p>

      <ul className="space-y-2">
        {result.levels.map((u) => {
          const def = LEVELS.find((l) => l.id === u.id)!;
          const blocker = u.lockedBy ? levelById(u.lockedBy) : undefined;
          return (
            <li key={u.id} className="rounded-2xl border-2 border-nau-go/60 bg-white/50 p-3">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="font-display text-lg font-extrabold">{u.id}.</span>
                <span className="min-w-0 flex-1 font-semibold">{fmt(def.ten)}</span>
                <span className="inline-flex items-center gap-1 rounded-full border-2 border-nau-go px-2 py-0.5 text-sm font-bold">
                  <span aria-hidden="true">{STATE_ICON[u.state]}</span>
                  {STATE_TEXT[u.state]}
                </span>
              </div>
              {blocker && (
                <p className="mt-1 text-sm text-nau-go-dam">
                  {fmt(ui.moKhoa.hoanThanh, { so: blocker.id, man: fmt(blocker.ten) })}
                </p>
              )}
              <div className="mt-2 flex flex-wrap gap-2">
                <Button variant="secondary" size="sm" onClick={() => toggleDone(u.id)}>
                  {fmt(done.includes(u.id) ? ui.dev.moKhoaBoXong : ui.dev.moKhoaXongMan, { so: u.id })}
                </Button>
                <Button variant="secondary" size="sm" onClick={() => toggleStatus(u.id)}>
                  {fmt(ui.dev.moKhoaDoiStatus, { so: u.id })}: {soon[u.id] === 'ready' ? ui.dev.moKhoaStatusReady : ui.dev.moKhoaStatusSoon}
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
