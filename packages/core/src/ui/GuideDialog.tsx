import { useEffect, useMemo, useState } from 'react';
import { AssetImage } from '../assets/AssetImage';
import { fmt } from '../content/characters';
import { guideFigure, guideSectionsFor, guideText, huongDan, type GuideDevice, type GuideFigure } from '../content/huongDan';
import { Button } from './Button';
import { GuideArt } from './GuideArt';
import { Panel } from './Panel';
import { rich } from './rich';

/** Điện thoại hay máy tính: cảm ứng là con trỏ thô (`pointer: coarse`). */
export function detectGuideDevice(): GuideDevice {
  if (typeof window === 'undefined' || !window.matchMedia) return 'may';
  return window.matchMedia('(pointer: coarse)').matches ? 'dt' : 'may';
}

export interface GuideDialogProps {
  /** Phần mở đầu tiên (id trong `GUIDE_SECTIONS`); không có hoặc không đúng thì phần đầu. Id của một phần riêng (`rieng`, như "man-2") thì hộp chỉ có đúng phần đó (xem `guideSectionsFor`). */
  section?: string;
  onClose: () => void;
  /** Ép theo thiết bị (dùng khi xem thử); mặc định tự nhận */
  device?: GuideDevice;
}

/** Một hình của trang: ảnh chụp thật (`ui/huong-dan/<id>`, thiếu thì ô màu thay thế) hoặc hình minh họa SVG. */
export function GuideFigureView({ figure, className = '' }: { figure: GuideFigure; className?: string }) {
  // Cao tối đa 44% chiều cao màn hình (48% khi điện thoại nằm ngang) để cả hộp vừa một màn hình, không phải cuộn
  const frame = `mx-auto aspect-video w-full max-w-[min(100%,calc(44vh*16/9))] overflow-hidden rounded-2xl border-4 border-nau-go bg-giay [@media(max-height:500px)]:max-w-[min(100%,calc(52vh*16/9))] ${className}`;
  if ('shot' in figure) return <AssetImage path={`ui/huong-dan/${figure.shot}`} alt="" className={`${frame} object-cover`} />;
  return (
    <div className={frame}>
      <GuideArt id={figure.art} className="block size-full" />
    </div>
  );
}

/**
 * "Hướng dẫn chơi" (spec 03 mục 3.8): hộp nhiều PHẦN, mỗi phần vài TRANG (một hình và 1 đến 2 câu ngắn), chọn phần bằng các nút phía trên, lật trang bằng "Trước" và "Tiếp",
 * ở trang cuối của phần có nút "Đã hiểu". Hình và lời theo thiết bị (máy tính hay điện thoại). Điện thoại nằm ngang (thấp dưới 500 điểm ảnh): hình bên trái, lời bên phải.
 * Nội dung ở `content/huongDan.ts`; muốn thêm phần mới chỉ thêm vào đó.
 */
export function GuideDialog({ section, onClose, device }: GuideDialogProps) {
  const dev = useMemo<GuideDevice>(() => device ?? detectGuideDevice(), [device]);
  const sections = useMemo(() => guideSectionsFor(section), [section]);
  const startIndex = Math.max(0, sections.findIndex((s) => s.id === section));
  const [si, setSi] = useState(startIndex);
  const [pi, setPi] = useState(0);
  const sec = sections[si];
  const page = sec.trang[Math.min(pi, sec.trang.length - 1)];
  const last = pi >= sec.trang.length - 1;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') setPi((p) => Math.min(p + 1, sec.trang.length - 1));
      else if (e.key === 'ArrowLeft') setPi((p) => Math.max(p - 1, 0));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, sec.trang.length]);

  const pick = (i: number) => {
    setSi(i);
    setPi(0);
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-chu/50 p-3 [@media(max-height:500px)]:p-1.5" onClick={onClose} data-walk-ui data-testid="huong-dan">
      <Panel
        role="dialog"
        aria-modal="true"
        aria-label={huongDan.tieuDe}
        className="w-full max-w-3xl space-y-3 [@media(max-height:500px)]:space-y-1.5 [@media(max-height:500px)]:p-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-xl sm:text-2xl [@media(max-height:500px)]:text-lg">{huongDan.tieuDe}</h2>
          <Button variant="secondary" size="sm" onClick={onClose} aria-label={huongDan.dong} className="!min-h-9 !px-3">
            ✕
          </Button>
        </div>
        {sections.length > 1 && (
        <div role="tablist" aria-label={huongDan.cacPhan} className="flex flex-wrap gap-1.5">
          {sections.map((s, i) => (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={i === si}
              onClick={() => pick(i)}
              className={`min-h-9 cursor-pointer rounded-nut border-2 px-3 font-display text-sm font-extrabold focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-muc-tim [@media(max-height:500px)]:min-h-7 [@media(max-height:500px)]:px-2 [@media(max-height:500px)]:text-xs ${
                i === si ? 'border-nau-go-dam bg-vang text-chu' : 'border-nau-go bg-giay text-chu'
              }`}
            >
              {fmt(s.nhan)}
            </button>
          ))}
        </div>
        )}
        <div className="grid items-center gap-3 [@media(max-height:500px)]:grid-cols-2" data-testid="huong-dan-trang">
          <GuideFigureView figure={guideFigure(page, dev)} />
          <div className="space-y-2 [@media(max-height:500px)]:space-y-1">
            <h3 className="text-lg text-muc-tim-dam sm:text-xl [@media(max-height:500px)]:text-base">{fmt(sec.tieuDe)}</h3>
            <p className="text-lg leading-relaxed [@media(max-height:500px)]:text-base [@media(max-height:500px)]:leading-snug">{rich(guideText(page, dev))}</p>
          </div>
        </div>
        <div className="flex items-center justify-between gap-2">
          <Button variant="secondary" size="sm" disabled={pi === 0} onClick={() => setPi(pi - 1)}>
            {huongDan.truoc}
          </Button>
          <span className="text-sm font-bold text-nau-go-dam" aria-live="polite">
            {fmt(huongDan.trang, { n: pi + 1, tong: sec.trang.length })}
          </span>
          {last ? (
            <Button size="sm" autoFocus onClick={onClose}>
              {huongDan.xong}
            </Button>
          ) : (
            <Button size="sm" autoFocus onClick={() => setPi(pi + 1)}>
              {huongDan.sau}
            </Button>
          )}
        </div>
      </Panel>
    </div>
  );
}
