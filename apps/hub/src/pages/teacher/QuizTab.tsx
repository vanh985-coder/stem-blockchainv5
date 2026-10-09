import { useMemo } from 'react';
import { fetchClassQuizStats } from '@so-chung/core/teacher/api';
import { teacherTexts } from '@so-chung/core/content/teacher';
import { buildQuestionStats, percent } from '@so-chung/core/teacher/quiz';
import { fill } from '@so-chung/core/teacher/text';
import { Async } from './Async';
import { useLoad } from './useLoad';

const T = teacherTexts.cauHoi;
const cellBase = 'border border-nau-go/30 px-3 py-2 text-sm';

/** Tab Câu hỏi: mỗi câu một hàng, câu có tỉ lệ đúng thấp nhất ở trên cùng. */
export function QuizTab({ classId }: { classId: string }) {
  const { state, reload } = useLoad(() => fetchClassQuizStats(classId), `quiz:${classId}`);
  return (
    <Async state={state} onRetry={reload}>
      {(rows) => <QuizTable rows={rows} />}
    </Async>
  );
}

function QuizTable({ rows }: { rows: Parameters<typeof buildQuestionStats>[0] }) {
  const stats = useMemo(() => buildQuestionStats(rows), [rows]);
  if (stats.length === 0) return <p className="py-4 text-base">{T.trong}</p>;
  return (
    <div className="space-y-3">
      <p className="text-sm">{T.ghiChu}</p>
      <div className="overflow-x-auto rounded-[14px] border-2 border-nau-go/40 bg-white/70">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="bg-giay">
              <th scope="col" className={`${cellBase} font-bold`}>
                {T.cotCau}
              </th>
              <th scope="col" className={`${cellBase} text-center font-bold`}>
                {T.cotLuot}
              </th>
              <th scope="col" className={`${cellBase} text-center font-bold`}>
                {T.cotTiLe}
              </th>
            </tr>
          </thead>
          <tbody>
            {stats.map((q) => (
              <tr key={q.id} className="odd:bg-white/60 align-top">
                <td className={cellBase}>
                  <span className="block text-sm font-semibold text-nau-go-dam">
                    {q.bai > 0 ? `${q.id} · ${fill(T.bai, { so: q.bai })}` : q.id}
                  </span>
                  {q.text}
                </td>
                <td className={`${cellBase} text-center`}>{q.total}</td>
                <td className={`${cellBase} text-center font-bold ${q.rate < 0.5 ? 'text-do-son-dam' : 'text-xanh-la-dam'}`}>
                  {percent(q.rate)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
