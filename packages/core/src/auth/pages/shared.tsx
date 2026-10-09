import { useId, type ComponentProps, type ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { HUB_MAP_URL, URLS, hubPageUrl } from '../../config/urls';
import { ui } from '../../content/ui';
import { NenTrangTri } from '../../ui/NenTrangTri';
import { Panel } from '../../ui/Panel';
import { safeNext } from '../redirect';

/** Khung chung của các trang tài khoản. */
export function AccountPage({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return (
    <main className="grid min-h-screen place-items-center p-4">
      <NenTrangTri />
      <Panel className={['w-full space-y-4', wide ? 'max-w-2xl' : 'max-w-md'].join(' ')}>{children}</Panel>
    </main>
  );
}

/** Ô nhập có nhãn hiện rõ; cỡ chữ từ 16px để điện thoại không tự phóng to. */
export function Field({
  label,
  hint,
  ...input
}: { label: string; hint?: string } & Omit<ComponentProps<'input'>, 'className'>) {
  const id = useId();
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block font-display text-lg font-extrabold">
        {label}
      </label>
      <input
        id={id}
        aria-describedby={hint ? `${id}-h` : undefined}
        className="min-h-12 w-full rounded-nut border-2 border-nau-go bg-white/80 px-3 text-base focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-muc-tim"
        {...input}
      />
      {hint && (
        <p id={`${id}-h`} className="text-sm text-nau-go-dam">
          {hint}
        </p>
      )}
    </div>
  );
}

/** Thông báo lỗi: có biểu tượng và chữ, không chỉ dùng màu. */
export function ErrorNote({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="flex items-start gap-2 rounded-xl border-2 border-do-son-dam bg-do-son/10 p-3 font-semibold">
      <span aria-hidden="true">⚠</span>
      <span>{message}</span>
    </p>
  );
}

export function InfoNote({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="status" className="flex items-start gap-2 rounded-xl border-2 border-xanh-la-dam bg-xanh-la/15 p-3 font-semibold">
      <span aria-hidden="true">✓</span>
      <span>{message}</span>
    </p>
  );
}

/**
 * Đi tới trang sau khi đăng nhập: "next" trong địa chỉ nếu hợp lệ (cùng trang),
 * không có thì về bản đồ ở hub (/ban-do nếu đang ở hub, ngược lại sang hub).
 */
export function useGoAfterLogin(): () => void {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));
  return () => {
    if (next) navigate(next, { replace: true });
    else goToMap(navigate);
  };
}

/** Về bản đồ: nếu đang ở chính hub thì chuyển trong app, nếu ở vỏ làng thì sang hub. */
export function goToMap(navigate: ReturnType<typeof useNavigate>): void {
  if (new URL(URLS.hub).origin === location.origin) navigate('/ban-do');
  else location.assign(HUB_MAP_URL);
}

/** Tới một trang của hub: ở chính hub thì chuyển trong app, ở vỏ làng thì mở trang đó trên hub (VITE_HUB_URL). */
export function goToHub(navigate: ReturnType<typeof useNavigate>, path: string): void {
  if (new URL(URLS.hub).origin === location.origin) navigate(path);
  else location.assign(hubPageUrl(URLS, path));
}

export const t = ui.auth;
