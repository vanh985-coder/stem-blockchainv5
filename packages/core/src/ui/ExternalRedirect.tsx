import { useEffect } from 'react';
import { ui } from '../content/ui';

/** Chuyển sang địa chỉ ngoài app (ví dụ từ làng về bản đồ ở hub). */
export function ExternalRedirect({ to }: { to: string }) {
  useEffect(() => {
    window.location.replace(to);
  }, [to]);
  return (
    <main className="grid min-h-screen place-items-center p-6 text-center">
      <p>
        {ui.chuyenHuong.truoc}{' '}
        <a className="font-semibold underline" href={to}>
          {ui.chuyenHuong.lienKet}
        </a>
        {ui.chuyenHuong.sau}
      </p>
    </main>
  );
}
