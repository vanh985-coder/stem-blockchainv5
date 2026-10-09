import { useMemo, useState } from 'react';
import { Button, Modal } from '@so-chung/core';
import { teacherTexts } from '@so-chung/core/content/teacher';
import { fetchStudentAccounts, removeStudentFromClass } from '@so-chung/core/teacher/api';
import type { StudentRow } from '@so-chung/core/teacher/progress';
import { fill } from '@so-chung/core/teacher/text';
import { Async } from './Async';
import { ResetPasswordModal } from './ResetPasswordModal';
import { useLoad } from './useLoad';

const T = teacherTexts.hocSinh;
const X = teacherTexts.xoa;

function RemoveModal({
  classId,
  className,
  student,
  onClose,
  onRemoved,
}: {
  classId: string;
  className: string;
  student: StudentRow;
  onClose: () => void;
  onRemoved: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const confirm = async () => {
    setBusy(true);
    setError('');
    const r = await removeStudentFromClass(classId, student.id);
    setBusy(false);
    if (r.ok) onRemoved();
    else setError(r.message);
  };
  return (
    <Modal isOpen onClose={busy ? undefined : onClose} title={X.tieuDe} maxWidth="sm">
      <div className="space-y-4">
        <p className="text-base">{fill(X.noiDung, { ten: student.name, lop: className })}</p>
        {error && (
          <p role="alert" className="text-base font-semibold text-do-son-dam">
            {error}
          </p>
        )}
        <div className="flex flex-wrap justify-end gap-3">
          <Button variant="secondary" size="sm" onClick={onClose} disabled={busy}>
            {X.huy}
          </Button>
          <Button variant="danger" size="sm" onClick={() => void confirm()} disabled={busy}>
            {busy ? X.dangXoa : X.dongY}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/** Tab Học sinh: danh sách, "Đặt lại mật khẩu" (chỉ tài khoản tên đăng nhập), "Xóa khỏi lớp" (có hỏi xác nhận). */
export function StudentsTab({
  classId,
  className,
  students,
  onSelect,
  onChanged,
  onNotice,
}: {
  classId: string;
  className: string;
  students: StudentRow[];
  onSelect: (s: StudentRow) => void;
  onChanged: () => void;
  onNotice: (message: string) => void;
}) {
  const ids = useMemo(() => students.map((s) => s.id), [students]);
  const accounts = useLoad(() => fetchStudentAccounts(ids), `accounts:${classId}:${ids.join(',')}`);
  const [resetting, setResetting] = useState<StudentRow | null>(null);
  const [removing, setRemoving] = useState<StudentRow | null>(null);

  if (students.length === 0) return <p className="py-4 text-base">{T.trong}</p>;

  return (
    <>
      <Async state={accounts.state} onRetry={accounts.reload}>
        {(list) => {
          const usernameOf = new Map(list.map((a) => [a.id, a.username]));
          return (
            <ul className="space-y-2">
              {students.map((s) => {
                const hasPassword = Boolean(usernameOf.get(s.id));
                return (
                  <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] border-2 border-nau-go/40 bg-white/70 p-3">
                    <div className="min-w-0">
                      <button
                        type="button"
                        onClick={() => onSelect(s)}
                        className="min-h-11 cursor-pointer break-words rounded-nut text-left text-lg font-bold text-muc-tim-dam underline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-muc-tim"
                      >
                        {s.name}
                      </button>
                      <p className="text-sm text-nau-go-dam">{hasPassword ? T.taiKhoanTen : T.taiKhoanGoogle}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {hasPassword ? (
                        <Button size="sm" variant="secondary" onClick={() => setResetting(s)}>
                          {T.datLaiMatKhau}
                        </Button>
                      ) : (
                        <span className="max-w-56 text-sm">{T.ghiChuGoogle}</span>
                      )}
                      <Button size="sm" variant="danger" onClick={() => setRemoving(s)}>
                        {T.xoaKhoiLop}
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          );
        }}
      </Async>

      {resetting && <ResetPasswordModal studentId={resetting.id} studentName={resetting.name} onClose={() => setResetting(null)} />}
      {removing && (
        <RemoveModal
          classId={classId}
          className={className}
          student={removing}
          onClose={() => setRemoving(null)}
          onRemoved={() => {
            onNotice(fill(X.xong, { ten: removing.name }));
            setRemoving(null);
            onChanged();
          }}
        />
      )}
    </>
  );
}
