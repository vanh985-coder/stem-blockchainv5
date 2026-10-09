import { LEVELS, Modal, fmt } from '@so-chung/core';
import { teacherTexts } from '@so-chung/core/content/teacher';
import { fetchStudentAnswers } from '@so-chung/core/teacher/api';
import { cellText, levelCell, type StudentRow } from '@so-chung/core/teacher/progress';
import { answerRate } from '@so-chung/core/teacher/quiz';
import { fill } from '@so-chung/core/teacher/text';
import { useLoad } from './useLoad';

const T = teacherTexts.chiTiet;
const STATIONS = [
  ['de', T.tramDe],
  ['tb', T.tramTb],
  ['kho', T.tramKho],
] as const;

/** Chi tiết một học sinh: sao từng trạm, điểm cao nhất từng game, tỉ lệ trả lời đúng. Chỉ có tên hiển thị, không có email. */
export function StudentDetail({ student, onClose }: { student: StudentRow; onClose: () => void }) {
  const answers = useLoad(() => fetchStudentAnswers(student.id), `answers:${student.id}`);
  const lessons = LEVELS.filter((l) => l.kind === 'lesson');
  const games = LEVELS.filter((l) => l.kind === 'game' && (l.status === 'ready' || student.levels[l.id]));

  return (
    <Modal isOpen onClose={onClose} title={fill(T.tieuDe, { ten: student.name })} maxWidth="lg">
      <div className="space-y-5 text-base">
        <p>
          {fill(T.soVang, { so: student.goldenPages })} · {fill(T.tongSao, { so: student.totalStars })}
        </p>

        <section aria-labelledby="ct-sao" className="space-y-2">
          <h4 id="ct-sao" className="text-lg font-bold">
            {T.sao}
          </h4>
          <ul className="space-y-1">
            {lessons.map((l) => {
              const lv = student.levels[l.id];
              return (
                <li key={l.id} className="rounded-[12px] bg-white/70 p-2">
                  <span className="font-semibold">{fmt(l.ten)}</span>
                  {lv ? (
                    <span className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
                      {STATIONS.map(([key, label]) => (
                        <span key={key}>
                          {label}: <strong>{fill(teacherTexts.o.sao, { so: lv.stars[key] ?? 0 })}</strong>
                        </span>
                      ))}
                    </span>
                  ) : (
                    <span className="block text-nau-go-dam">{T.chuaChoi}</span>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        <section aria-labelledby="ct-game" className="space-y-2">
          <h4 id="ct-game" className="text-lg font-bold">
            {T.diemGame}
          </h4>
          {games.length === 0 ? (
            <p className="text-nau-go-dam">{T.chuaCoGame}</p>
          ) : (
            <ul className="space-y-1">
              {games.map((l) => {
                const lv = student.levels[l.id];
                const medal = cellText(levelCell(l, lv));
                return (
                  <li key={l.id} className="rounded-[12px] bg-white/70 p-2">
                    <span className="font-semibold">{fmt(l.ten)}</span>:{' '}
                    {lv && medal ? `${fill(T.diem, { diem: lv.bestScore })} · ${medal}` : T.chuaChoi}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section aria-labelledby="ct-dung" className="space-y-1">
          <h4 id="ct-dung" className="text-lg font-bold">
            {T.tiLeDung}
          </h4>
          {answers.state.status === 'loading' && <p role="status">{T.dangTai}</p>}
          {answers.state.status === 'error' && <p role="alert" className="text-do-son-dam">{answers.state.message}</p>}
          {answers.state.status === 'ok' &&
            (() => {
              const r = answerRate(answers.state.data);
              return r ? (
                <p>{fill(T.tiLeDungGiaTri, { dung: r.correct, tong: r.total, phanTram: r.percent })}</p>
              ) : (
                <p className="text-nau-go-dam">{T.chuaTraLoi}</p>
              );
            })()}
        </section>
      </div>
    </Modal>
  );
}
