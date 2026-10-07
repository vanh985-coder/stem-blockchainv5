import { useEffect } from 'react';

/** Chuyển sang địa chỉ ngoài app (ví dụ từ làng về bản đồ ở hub). */
export function ExternalRedirect({ to }: { to: string }) {
  useEffect(() => {
    window.location.replace(to);
  }, [to]);
  return (
    <main className="min-h-screen grid place-items-center p-6 text-center">
      <p>
        Đang chuyển về bản đồ… Nếu chưa tự chuyển, em bấm{' '}
        <a className="underline font-semibold" href={to}>
          vào đây
        </a>
        .
      </p>
    </main>
  );
}
