import { useState } from 'react';
import { Button, Modal } from '@so-chung/core';
import { teacherTexts } from '@so-chung/core/content/teacher';
import { resetStudentPassword } from '@so-chung/core/teacher/api';
import { generatePassword, isValidNewPassword } from '@so-chung/core/teacher/password';
import { fill } from '@so-chung/core/teacher/text';
import { CopyButton } from './JoinCodeCard';

const T = teacherTexts.datLai;

/**
 * Đặt lại mật khẩu cho một học sinh dùng tên đăng nhập. Giáo viên nhập hoặc bấm "Tạo ngẫu nhiên";
 * đặt xong, mật khẩu mới hiện MỘT lần để đọc cho học sinh, đóng hộp là mất (không lưu ở đâu).
 */
export function ResetPasswordModal({ studentId, studentName, onClose }: { studentId: string; studentName: string; onClose: () => void }) {
  const [password, setPassword] = useState('');
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [doneWith, setDoneWith] = useState<string | null>(null);

  const submit = async () => {
    if (!isValidNewPassword(password)) return setError(T.quaNgan);
    setBusy(true);
    setError('');
    const r = await resetStudentPassword(studentId, password);
    setBusy(false);
    if (r.ok) {
      setDoneWith(password);
      setPassword('');
    } else setError(r.message);
  };

  if (doneWith !== null) {
    return (
      <Modal isOpen onClose={onClose} title={fill(T.xong, { ten: studentName })} maxWidth="sm">
        <div className="space-y-4 text-center">
          <p className="text-base">{T.docChoEm}</p>
          <p
            className="select-all break-all rounded-[14px] border-2 border-dashed border-muc-tim bg-white px-3 py-4 font-mono text-4xl font-bold tracking-widest"
            data-testid="mat-khau-moi"
          >
            {doneWith}
          </p>
          <p className="text-base">{T.luuY}</p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <CopyButton text={doneWith} label={T.saoChep} doneLabel={T.daSaoChep} />
            <Button size="sm" onClick={onClose}>
              {T.dong}
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen onClose={busy ? undefined : onClose} title={fill(T.tieuDe, { ten: studentName })} maxWidth="sm">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <label className="block space-y-1">
          <span className="text-base font-semibold">{T.matKhauMoi}</span>
          <input
            autoFocus
            type={visible ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={T.goiY}
            autoComplete="new-password"
            spellCheck={false}
            className="min-h-12 w-full rounded-nut border-2 border-nau-go bg-white px-3 font-mono text-lg focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-muc-tim"
          />
        </label>
        <div className="flex flex-wrap gap-3">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setPassword(generatePassword());
              setVisible(true);
              setError('');
            }}
          >
            {T.taoNgauNhien}
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setVisible((v) => !v)}>
            {visible ? T.an : T.hien}
          </Button>
        </div>
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
            {busy ? T.dangDat : T.datLai}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
