import { ui } from '../../content/ui';
import { AccountPage } from './shared';

export default function PrivacyPage() {
  const p = ui.quyenRiengTu;
  return (
    <AccountPage wide page="quyenRiengTu">
      <h1 className="text-3xl">{p.tieuDe}</h1>
      <p className="text-lg">{p.gioiThieu}</p>
      {p.muc.map((m, i) => (
        <section key={m.tieuDe} className="space-y-2">
          <h2 className="text-xl">{m.tieuDe}</h2>
          <ul className="list-disc space-y-1 pl-6 text-base">
            {m.y.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          {i === p.muc.length - 1 && (
            <p>
              <a href={`mailto:${p.email}`} className="inline-flex min-h-11 items-center break-all font-bold underline">
                {p.email}
              </a>
            </p>
          )}
        </section>
      ))}
    </AccountPage>
  );
}
