import type { CSSProperties, ReactElement } from 'react';
import { NARROW_MAX, NARROW_SPARKLES, SPARKLES, floatersFor, type Floater, type IconKind, type Variant } from './nenTrangTriLayout';
import type { NenTheme } from '../content/nenTrangTri';

/**
 * Chunk icon dùng chung của NenTrangTri: icon SVG tự vẽ (cùng phong cách: viền nâu 2,5, màu pastel) và bố trí.
 * Chỉ tải sau khi trang đã hiện (xem NenTrangTri). Chuyển động chỉ dùng CSS transform và opacity.
 */
const S = '#8a5a3b'; // viền nâu gỗ
const G = '#2f6b3a'; // viền xanh lá
const sw = { strokeWidth: 2.5, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };

const ICONS: Record<IconKind, () => ReactElement> = {
  giay: () => (
    <>
      <path d="M10 4h20l10 10v30H10z" fill="#fff8e6" stroke={S} {...sw} />
      <path d="M30 4v10h10" fill="#efe0bd" stroke={S} {...sw} />
      <path d="M16 24h18M16 31h18M16 38h12" stroke={S} {...sw} />
    </>
  ),
  la: () => (
    <>
      <path d="M6 40C14 14 30 6 44 6c-2 16-12 32-38 34z" fill="#7bbf6a" stroke={G} {...sw} />
      <path d="M8 38C20 26 30 18 40 10" stroke={G} strokeWidth={2} strokeLinecap="round" />
    </>
  ),
  xu: () => <path fillRule="evenodd" d="M24 4a20 20 0 1 0 0.01 0zM18 18h12v12H18z" fill="#f2b33d" stroke={S} {...sw} />,
  vo: () => (
    <>
      <rect x="9" y="5" width="30" height="38" rx="4" fill="#7b5fe0" stroke="#3d2a8c" {...sw} />
      <path d="M15 5v38" stroke="#3d2a8c" {...sw} />
      <path d="M27 17l2.2 4.6 5 .7-3.6 3.5.9 5-4.5-2.4-4.5 2.4.9-5-3.6-3.5 5-.7z" fill="#ffe27a" stroke="#3d2a8c" strokeWidth={1.5} strokeLinejoin="round" />
    </>
  ),
  sao: () => <path d="M24 4l5.6 12 13 1.6-9.6 9 2.6 12.9L24 32.6 12.4 39.5 15 26.6 5.4 17.6l13-1.6z" fill="#f2b33d" stroke={S} {...sw} />,
  may: () => <path d="M13 36a8 8 0 0 1-1-15.9A11 11 0 0 1 33 17a9 9 0 0 1 3 17.6z" fill="#fdfdfd" stroke="#8fb3d9" {...sw} />,
  trang: () => <path d="M30 5a19 19 0 1 0 13 29A15 15 0 0 1 30 5z" fill="#fbe7a1" stroke={S} {...sw} />,
  but: () => (
    <>
      <path d="M38 6l4 4-20 22-6 2 2-6z" fill="#d9a066" stroke={S} {...sw} />
      <path d="M12 36c-3 1-5 4-6 7 4 0 7-2 8-6z" fill="#3b2a20" stroke="#3b2a20" strokeWidth={1.5} strokeLinejoin="round" />
    </>
  ),
  trangvang: () => (
    <>
      <path d="M10 4h20l10 10v30H10z" fill="#f7d06b" stroke="#b9852c" {...sw} />
      <path d="M30 4v10h10" fill="#eab94a" stroke="#b9852c" {...sw} />
      <path d="M24 20l2.4 5 5.4.7-4 3.8 1 5.4-4.8-2.6-4.8 2.6 1-5.4-4-3.8 5.4-.7z" fill="#fff6cf" stroke="#b9852c" strokeWidth={1.5} strokeLinejoin="round" />
    </>
  ),
  den: () => (
    <>
      <path d="M24 3v6" stroke={S} {...sw} />
      <rect x="16" y="8" width="16" height="5" rx="1.5" fill="#f2b33d" stroke={S} {...sw} />
      <ellipse cx="24" cy="25" rx="14" ry="12" fill="#d94a38" stroke="#8c2417" {...sw} />
      <path d="M24 13v24M17 15c-3 6-3 14 0 20M31 15c3 6 3 14 0 20" stroke="#8c2417" strokeWidth={1.8} strokeLinecap="round" />
      <rect x="16" y="37" width="16" height="4" rx="1.5" fill="#f2b33d" stroke={S} {...sw} />
      <path d="M24 41v5" stroke="#d94a38" strokeWidth={3} strokeLinecap="round" />
    </>
  ),
  co: () => (
    <>
      <path d="M12 4v42" stroke={S} {...sw} />
      <path d="M12 7h28l-7 8 7 8H12z" fill="#d94a38" stroke="#8c2417" {...sw} />
      <path d="M22 15l1.6 3.4 3.7.5-2.7 2.6.7 3.7-3.3-1.8-3.3 1.8.7-3.7-2.7-2.6 3.7-.5z" fill="#ffe27a" strokeWidth={0} />
    </>
  ),
  tia: () => <path d="M24 3c1.5 11 4 17 10 21-6 4-8.5 10-10 21-1.5-11-4-17-10-21 6-4 8.5-10 10-21z" fill="#ffe27a" stroke="#c9962a" strokeWidth={2} strokeLinejoin="round" />,
  khungphoi: () => (
    <>
      <path d="M8 44L22 6M40 44L26 6M8 44h32" stroke={S} strokeWidth={3} strokeLinecap="round" />
      <path d="M15 26h18" stroke={S} {...sw} />
      <rect x="14" y="27" width="8" height="12" fill="#fff8e6" stroke={S} strokeWidth={2} />
      <rect x="26" y="27" width="8" height="12" fill="#efe0bd" stroke={S} strokeWidth={2} />
    </>
  ),
  thoi: () => (
    <>
      <path d="M3 24c8-9 34-9 42 0-8 9-34 9-42 0z" fill="#c98a4b" stroke={S} {...sw} />
      <path d="M12 24h24" stroke="#7a4a2a" strokeWidth={2} strokeLinecap="round" />
      <path d="M45 24c-3-4-3-8 0-12" stroke="#7b5fe0" strokeWidth={2.5} strokeLinecap="round" />
    </>
  ),
  cuonchi: () => (
    <>
      <rect x="10" y="6" width="28" height="6" rx="2" fill="#d9a066" stroke={S} {...sw} />
      <rect x="10" y="36" width="28" height="6" rx="2" fill="#d9a066" stroke={S} {...sw} />
      <rect x="14" y="12" width="20" height="24" fill="#d94a38" stroke="#8c2417" {...sw} />
      <path d="M14 18h20M14 24h20M14 30h20" stroke="#f1a095" strokeWidth={2} />
    </>
  ),
  manhvai: () => (
    <>
      <path d="M6 10c6-4 12 4 18 0s12 4 18 0v28c-6 4-12-4-18 0s-12-4-18 0z" fill="#5fa8d3" stroke="#2d6a8f" {...sw} />
      <path d="M12 12v26M20 12v26M28 12v26M36 12v26" stroke="#e8f4fb" strokeWidth={2} strokeLinecap="round" />
    </>
  ),
  condau: () => (
    <>
      <path d="M20 4h8l2 14H18z" fill="#c98a4b" stroke={S} {...sw} />
      <rect x="10" y="18" width="28" height="9" rx="2" fill="#c98a4b" stroke={S} {...sw} />
      <rect x="12" y="27" width="24" height="9" fill="#d94a38" stroke="#8c2417" {...sw} />
      <path d="M6 44h36" stroke="#d94a38" strokeWidth={3} strokeLinecap="round" />
    </>
  ),
  khuongo: () => (
    <>
      <rect x="6" y="10" width="36" height="28" rx="3" fill="#d9a066" stroke={S} {...sw} />
      <path d="M14 18h20M14 24h20M14 30h12" stroke="#7a4a2a" strokeWidth={2.5} strokeLinecap="round" />
      <circle cx="35" cy="30" r="3" fill="#7a4a2a" />
    </>
  ),
  muc: () => (
    <>
      <path d="M14 10h20l4 8v20a4 4 0 0 1-4 4H14a4 4 0 0 1-4-4V18z" fill="#f1e2c0" stroke={S} {...sw} />
      <rect x="16" y="5" width="16" height="6" rx="2" fill="#d9a066" stroke={S} {...sw} />
      <ellipse cx="24" cy="26" rx="8" ry="6" fill="#d94a38" stroke="#8c2417" strokeWidth={2} />
    </>
  ),
  dongbac: () => (
    <>
      <path fillRule="evenodd" d="M24 4a20 20 0 1 0 0.01 0zM18 18h12v12H18z" fill="#dfe5ea" stroke="#6f7f8c" {...sw} />
      <circle cx="24" cy="24" r="15.5" fill="none" stroke="#a9b6c1" strokeWidth={1.5} />
    </>
  ),
  canh: () => (
    <>
      <path d="M6 42C14 30 24 24 42 8" stroke="#8a5a3b" strokeWidth={3.5} strokeLinecap="round" fill="none" />
      <path d="M20 31c-1-8 3-12 9-13 1 7-2 11-9 13zM30 21c0-7 4-10 10-10 0 6-3 9-10 10zM13 38c-5-2-7-6-6-11 5 1 8 5 6 11z" fill="#7bbf6a" stroke={G} strokeWidth={2} strokeLinejoin="round" />
    </>
  ),
  lacay: () => (
    <>
      <ellipse cx="24" cy="24" rx="15" ry="19" fill="#8fcf74" stroke={G} {...sw} transform="rotate(25 24 24)" />
      <path d="M13 38C21 28 27 20 35 10M22 28l6 1M25 22l6 0" stroke={G} strokeWidth={2} strokeLinecap="round" />
    </>
  ),
  trong: () => (
    <>
      <ellipse cx="24" cy="12" rx="16" ry="6" fill="#f1e2c0" stroke={S} {...sw} />
      <path d="M8 12v22c0 3.5 7 6 16 6s16-2.5 16-6V12" fill="#d94a38" stroke="#8c2417" {...sw} />
      <path d="M12 16l8 20M20 18l8 20M28 18l8 18" stroke="#f1c27a" strokeWidth={2} strokeLinecap="round" />
    </>
  ),
  hoa: () => (
    <>
      {[0, 72, 144, 216, 288].map((a) => (
        <ellipse key={a} cx="24" cy="12" rx="6" ry="9" fill="#f08aa5" stroke="#b64a6a" strokeWidth={2} transform={`rotate(${a} 24 24)`} />
      ))}
      <circle cx="24" cy="24" r="5" fill="#ffe27a" stroke="#c9962a" strokeWidth={2} />
    </>
  ),
  nonla: () => (
    <>
      <path d="M4 34C8 22 16 10 24 5c8 5 16 17 20 29-12 6-28 6-40 0z" fill="#ecd9a0" stroke={S} {...sw} />
      <path d="M24 5L10 36M24 5l14 31M24 5v33" stroke="#c9a85c" strokeWidth={1.8} strokeLinecap="round" />
      <path d="M14 36c3 6 17 6 20 0" stroke="#d94a38" strokeWidth={2.5} strokeLinecap="round" fill="none" />
    </>
  ),
};

function Glyph({ kind }: { kind: IconKind }) {
  return (
    <svg viewBox="0 0 48 48" className="size-full" fill="none">
      {ICONS[kind]()}
    </svg>
  );
}

function motionStyle(f: Floater, still: boolean): CSSProperties {
  const base: Record<string, string | number> = { left: `${f.x}%`, top: `${f.y}%` };
  if (f.side) base.width = `min(${f.size}px, 70cqw)`;
  else base.width = f.size;
  base.height = base.width;
  if (!still) {
    Object.assign(base, {
      '--dx': `${f.dx}px`,
      '--dy': `${f.dy}px`,
      '--dur': `${f.dur}s`,
      '--r0': `${f.r0}deg`,
      '--r1': `${f.r1}deg`,
      animationDelay: `${f.delay}s`,
    });
  } else {
    base.transform = `rotate(${f.r0}deg)`;
  }
  return base as CSSProperties;
}

export interface IconsProps {
  theme: NenTheme;
  variant: Variant;
  sparkle?: boolean;
}

export default function Icons({ theme, variant, sparkle = false }: IconsProps) {
  const list = floatersFor(theme, variant);
  const still = variant === 'still';
  const opacity = still ? 'opacity-[0.28]' : variant === 'sides' ? 'opacity-60' : 'opacity-45';
  const item = (f: Floater, i: number) => (
    <span
      key={i}
      className={`absolute block ${opacity} ${still ? '' : 'animate-trang-tri-troi'} ${variant === 'sides' ? '' : i >= (sparkle ? NARROW_MAX - NARROW_SPARKLES : NARROW_MAX) ? 'max-sm:hidden' : ''}`}
      style={motionStyle(f, still)}
    >
      <Glyph kind={f.kind} />
    </span>
  );

  return (
    <>
      {variant === 'sides' ? (
        // Hai khoảng trống hai bên bảng bài học (chỉ khi màn hình rộng đủ): icon không bao giờ nằm sau bảng.
        <>
          {(['l', 'r'] as const).map((side) => (
            <div
              key={side}
              className={`absolute inset-y-0 hidden min-[1296px]:block ${side === 'l' ? 'left-0' : 'right-0'}`}
              style={{ width: 'calc((100vw - 1200px) / 2)', containerType: 'inline-size' }}
            >
              {list.map((f, i) => (f.side === side ? item({ ...f, x: f.x }, i) : null))}
            </div>
          ))}
        </>
      ) : (
        list.map(item)
      )}
      {sparkle &&
        SPARKLES.map((s, i) => (
          <span
            key={`s${i}`}
            className={`animate-trang-tri-lap-lanh absolute block ${i >= NARROW_SPARKLES ? 'max-sm:hidden' : ''}`}
            style={
              {
                left: `${s.x}%`,
                top: `${s.y}%`,
                width: s.size,
                height: s.size,
                '--dur': `${s.dur}s`,
                animationDelay: `${s.delay}s`,
              } as CSSProperties
            }
          >
            <Glyph kind="tia" />
          </span>
        ))}
    </>
  );
}
