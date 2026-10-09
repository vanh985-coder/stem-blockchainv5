import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Toast } from '@so-chung/core';
import { teacherTexts } from '@so-chung/core/content/teacher';
import { fetchClassProgress, getClass } from '@so-chung/core/teacher/api';
import { buildProgressTable, type StudentRow } from '@so-chung/core/teacher/progress';
import { Async } from './Async';
import { JoinCodeCard } from './JoinCodeCard';
import { ProgressTab } from './ProgressTab';
import { QuizTab } from './QuizTab';
import { StudentDetail } from './StudentDetail';
import { StudentsTab } from './StudentsTab';
import { useLoad } from './useLoad';

const T = teacherTexts;
type Tab = 'tien-do' | 'cau-hoi' | 'hoc-sinh';
const TABS: readonly { id: Tab; label: string }[] = [
  { id: 'tien-do', label: T.tab.tienDo },
  { id: 'cau-hoi', label: T.tab.cauHoi },
  { id: 'hoc-sinh', label: T.tab.hocSinh },
];

const backCls =
  'inline-flex min-h-11 items-center rounded-nut px-2 text-base font-semibold underline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-muc-tim';

/** Trang một lớp: mã lớp và 3 tab Tiến độ, Câu hỏi, Học sinh. */
export function ClassView({ classId }: { classId: string }) {
  const info = useLoad(() => getClass(classId), `class:${classId}`);
  const progress = useLoad(() => fetchClassProgress(classId), `progress:${classId}`);
  const [tab, setTab] = useState<Tab>('tien-do');
  const [selected, setSelected] = useState<StudentRow | null>(null);
  const [notice, setNotice] = useState('');

  const students = useMemo(() => (progress.state.status === 'ok' ? buildProgressTable(progress.state.data) : []), [progress.state]);

  return (
    <div className="space-y-5">
      <Link to="/giao-vien" className={backCls}>
        {T.lop.veDanhSach}
      </Link>

      <Async state={info.state} onRetry={info.reload}>
        {(cls) =>
          cls === null ? (
            <p role="alert" className="py-4 text-base font-semibold text-do-son-dam">
              {T.loiTai}
            </p>
          ) : (
            <>
              <h2 className="text-3xl">{cls.name}</h2>
              <JoinCodeCard code={cls.joinCode} />

              <div role="tablist" aria-label={cls.name} className="flex flex-wrap gap-2">
                {TABS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    role="tab"
                    id={`tab-${t.id}`}
                    aria-selected={tab === t.id}
                    aria-controls={`panel-${t.id}`}
                    onClick={() => setTab(t.id)}
                    className={`min-h-11 cursor-pointer rounded-nut border-2 px-5 font-display text-lg font-bold focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-muc-tim ${
                      tab === t.id ? 'border-muc-tim-dam bg-muc-tim-dam text-white' : 'border-nau-go bg-giay text-chu'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
                {tab === 'cau-hoi' ? (
                  <QuizTab classId={classId} />
                ) : (
                  <Async state={progress.state} onRetry={progress.reload}>
                    {() =>
                      tab === 'tien-do' ? (
                        <ProgressTab students={students} className={cls.name} onSelect={setSelected} />
                      ) : (
                        <StudentsTab
                          classId={classId}
                          className={cls.name}
                          students={students}
                          onSelect={setSelected}
                          onChanged={progress.reload}
                          onNotice={setNotice}
                        />
                      )
                    }
                  </Async>
                )}
              </div>
            </>
          )
        }
      </Async>

      {selected && <StudentDetail student={selected} onClose={() => setSelected(null)} />}
      {notice && <Toast message={notice} type="success" onClose={() => setNotice('')} />}
    </div>
  );
}
