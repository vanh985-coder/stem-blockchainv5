import { useState } from 'react';
import { Link } from 'react-router';
import { Button, Card, Modal } from '@so-chung/core';
import { teacherTexts } from '@so-chung/core/content/teacher';
import { createClass, listClasses, type ClassInfo } from '@so-chung/core/teacher/api';
import { fill } from '@so-chung/core/teacher/text';
import { Async } from './Async';
import { CopyButton, JoinCodeCard } from './JoinCodeCard';
import { useLoad } from './useLoad';

const T = teacherTexts.lop;
const MAX_NAME = 60;

function CreateClassModal({ onClose, onCreated }: { onClose: () => void; onCreated: (c: ClassInfo) => void }) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const clean = name.trim();
    if (!clean) return setError(T.tenLopTrong);
    if (clean.length > MAX_NAME) return setError(T.tenLopQuaDai);
    setBusy(true);
    setError('');
    const r = await createClass(clean);
    setBusy(false);
    if (r.ok) onCreated(r.data);
    else setError(r.message);
  };

  return (
    <Modal isOpen onClose={busy ? undefined : onClose} title={T.taoLop} maxWidth="sm">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <label className="block space-y-1">
          <span className="text-base font-semibold">{T.tenLop}</span>
          <input
            autoFocus
            value={name}
            maxLength={MAX_NAME}
            onChange={(e) => setName(e.target.value)}
            placeholder={T.tenLopGoiY}
            className="min-h-12 w-full rounded-nut border-2 border-nau-go bg-white px-3 text-lg focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-muc-tim"
          />
        </label>
        {error && (
          <p role="alert" className="text-base font-semibold text-do-son-dam">
            {error}
          </p>
        )}
        <div className="flex flex-wrap justify-end gap-3">
          <Button variant="secondary" size="sm" onClick={onClose} disabled={busy}>
            {T.huy}
          </Button>
          <Button size="sm" type="submit" disabled={busy}>
            {busy ? T.dangTao : T.taoXong}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

/** Danh sách lớp, nút "Tạo lớp"; lớp vừa tạo hiện mã lớp thật to. */
export function ClassList({ teacherId }: { teacherId: string | null }) {
  const { state, reload } = useLoad(() => listClasses(teacherId), `classes:${teacherId ?? 'all'}`);
  const [creating, setCreating] = useState(false);
  const [justCreated, setJustCreated] = useState<ClassInfo | null>(null);

  return (
    <section className="space-y-5" aria-labelledby="ds-lop">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="ds-lop" className="text-2xl">
          {T.tieuDe}
        </h2>
        <Button size="sm" onClick={() => setCreating(true)}>
          {T.taoLop}
        </Button>
      </div>

      {justCreated && (
        <div className="space-y-2" role="status">
          <p className="text-base font-semibold text-xanh-la-dam">{fill(T.daTao, { ten: justCreated.name })}</p>
          <JoinCodeCard code={justCreated.joinCode} highlight />
        </div>
      )}

      <Async state={state} onRetry={reload}>
        {(classes) =>
          classes.length === 0 ? (
            <p className="py-4 text-base">{T.trong}</p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {classes.map((c) => (
                <li key={c.id}>
                  <Card variant="elevated" className="space-y-2">
                    <h3 className="text-xl">{c.name}</h3>
                    <p className="text-base">{fill(T.soHocSinh, { so: c.studentCount })}</p>
                    <p className="text-base">
                      {T.maLop}: <strong className="font-display text-xl tracking-widest">{c.joinCode}</strong>
                    </p>
                    <div className="flex flex-wrap items-center gap-3">
                      <Link
                        to={`/giao-vien/${c.id}`}
                        className="inline-flex min-h-11 items-center rounded-nut px-2 text-base font-semibold underline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-muc-tim"
                      >
                        {T.moLop}
                      </Link>
                      <CopyButton text={c.joinCode} label={T.saoChep} doneLabel={T.daSaoChep} />
                    </div>
                  </Card>
                </li>
              ))}
            </ul>
          )
        }
      </Async>

      {creating && (
        <CreateClassModal
          onClose={() => setCreating(false)}
          onCreated={(c) => {
            setCreating(false);
            setJustCreated(c);
            reload();
          }}
        />
      )}
    </section>
  );
}
