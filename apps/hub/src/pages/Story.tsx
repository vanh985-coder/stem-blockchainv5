import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { AssetImage, Button, Panel, STORY, fmt, ui, useAuth, useSettings, type StoryFrame } from '@so-chung/core';

/** Một khung truyện: ảnh 16:9 (tải lười, hiện dần khi cuộn tới) và lời truyện trên nền giấy dó. */
function Frame({ frame, ten }: { frame: StoryFrame; ten: string | undefined }) {
  const { settings } = useSettings();
  const ref = useRef<HTMLElement>(null);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setSeen(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setSeen(true);
          io.disconnect();
        }
      },
      { rootMargin: '0px 0px -10% 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // "Giảm chuyển động": hiện luôn, không làm mờ dần.
  const shown = seen || settings.reducedMotion;
  return (
    <figure
      ref={ref}
      className={`space-y-3 transition-opacity duration-700 ${shown ? 'opacity-100' : 'opacity-0'}`}
    >
      {/* Khung 16:9 giữ chỗ sẵn nên trang không nhảy khi ảnh về; ảnh thiếu thì thấy ô màu, lời truyện vẫn đủ. */}
      <div className="aspect-video w-full overflow-hidden rounded-bang border-4 border-nau-go bg-giay">
        <AssetImage path={frame.image} alt="" loading="lazy" className="size-full object-cover" />
      </div>
      <Panel className="text-lg leading-relaxed sm:text-xl">
        <p>{fmt(frame.text, { ten })}</p>
      </Panel>
    </figure>
  );
}

/** Trang cốt truyện /truyen (spec 04 mục 2): 14 khung cuộn dọc. */
export default function Story() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  return (
    <main className="mx-auto w-full max-w-[960px] space-y-8 p-4 pb-16">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-3xl">{ui.truyen.tieuDe}</h1>
        <Link to="/" className="inline-flex min-h-11 items-center underline">
          {ui.truyen.veTrangChu}
        </Link>
      </header>
      {STORY.map((f) => (
        <Frame key={f.n} frame={f} ten={profile?.display_name} />
      ))}
      <div className="flex justify-center pt-4">
        <Button size="lg" onClick={() => navigate('/ban-do')}>
          {ui.truyen.batDauHanhTrinh}
        </Button>
      </div>
    </main>
  );
}
