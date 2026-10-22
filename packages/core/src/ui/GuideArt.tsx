import type { ReactNode } from 'react';
import { huongDan, type GuideArtId } from '../content/huongDan';

/**
 * Hình minh họa SVG do code vẽ cho "Hướng dẫn chơi" (phím, chuột, cần điều khiển, vuốt, 3 làn, kéo thẻ vào ô…). Khung 320 × 180 (16:9), không có chữ trong hình
 * ngoài tên phím (W, A, S, D, E, Shift, Space, Esc: lấy từ `huongDan.phim`). Màu theo biến màu của giao diện.
 */
export const ART_W = 320;
export const ART_H = 180;

const C = {
  ink: 'var(--color-chu)',
  wood: 'var(--color-nau-go)',
  paper: 'var(--color-giay)',
  gold: 'var(--color-vang)',
  goldDark: 'var(--color-vang-dam)',
  purple: 'var(--color-muc-tim)',
  green: 'var(--color-xanh-la)',
  red: 'var(--color-do-son)',
  road: '#d9a566',
  sky: '#cfe8f7',
  grass: '#9ccf6a',
  glass: 'rgba(255,255,255,0.55)',
} as const;

type Dir = 'up' | 'down' | 'left' | 'right';

function Key({ x, y, w = 34, h = 34, label, arrow }: { x: number; y: number; w?: number; h?: number; label?: string; arrow?: Dir }) {
  const cx = x + w / 2;
  const cy = y + h / 2;
  const t = Math.min(w, h) * 0.2;
  const tri: Record<Dir, string> = {
    up: `${cx},${cy - t * 1.2} ${cx - t * 1.2},${cy + t * 0.8} ${cx + t * 1.2},${cy + t * 0.8}`,
    down: `${cx},${cy + t * 1.2} ${cx - t * 1.2},${cy - t * 0.8} ${cx + t * 1.2},${cy - t * 0.8}`,
    left: `${cx - t * 1.2},${cy} ${cx + t * 0.8},${cy - t * 1.2} ${cx + t * 0.8},${cy + t * 1.2}`,
    right: `${cx + t * 1.2},${cy} ${cx - t * 0.8},${cy - t * 1.2} ${cx - t * 0.8},${cy + t * 1.2}`,
  };
  return (
    <g>
      <rect x={x} y={y + 4} width={w} height={h} rx={7} fill={C.wood} />
      <rect x={x} y={y} width={w} height={h} rx={7} fill="#fffaf0" stroke={C.wood} strokeWidth={2} />
      {arrow && <polygon points={tri[arrow]} fill={C.ink} />}
      {label && (
        <text x={cx} y={cy + 5.5} textAnchor="middle" fontSize={Math.min(16, w / 3.2 + 4)} fontWeight={800} fill={C.ink} fontFamily="inherit">
          {label}
        </text>
      )}
    </g>
  );
}

/** Mũi tên đậm từ (x1,y1) đến (x2,y2) */
function Arrow({ x1, y1, x2, y2, color = C.purple, width = 5 }: { x1: number; y1: number; x2: number; y2: number; color?: string; width?: number }) {
  const a = Math.atan2(y2 - y1, x2 - x1);
  const h = 11;
  const p1 = [x2 - h * Math.cos(a - 0.5), y2 - h * Math.sin(a - 0.5)];
  const p2 = [x2 - h * Math.cos(a + 0.5), y2 - h * Math.sin(a + 0.5)];
  const sx = x2 - 6 * Math.cos(a);
  const sy = y2 - 6 * Math.sin(a);
  return (
    <g>
      <line x1={x1} y1={y1} x2={sx} y2={sy} stroke={color} strokeWidth={width} strokeLinecap="round" />
      <polygon points={`${x2},${y2} ${p1[0]},${p1[1]} ${p2[0]},${p2[1]}`} fill={color} />
    </g>
  );
}

/** Ngón tay chạm: vòng tròn trong mờ với chấm giữa */
function Finger({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r={15} fill="rgba(91,63,214,0.25)" stroke={C.purple} strokeWidth={2.5} />
      <circle cx={x} cy={y} r={5} fill={C.purple} />
    </g>
  );
}

/** Điện thoại nằm ngang: khung và màn hình; trả vùng màn hình qua children */
function Phone({ children, dim }: { children?: ReactNode; dim?: 'left' | 'right' }) {
  return (
    <g>
      <rect x={22} y={14} width={276} height={152} rx={20} fill={C.ink} />
      <rect x={32} y={22} width={256} height={136} rx={10} fill={C.sky} />
      <rect x={32} y={118} width={256} height={40} rx={0} fill={C.grass} />
      <polygon points="150,158 170,158 196,118 124,118" fill={C.road} />
      {dim && <rect x={dim === 'left' ? 32 : 160} y={22} width={128} height={136} fill="rgba(59,42,32,0.38)" />}
      {children}
    </g>
  );
}

/** Bi: khối tím bo tròn, hai mắt trắng, mắt xích vàng */
function Bi({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <circle cx={0} cy={-31} r={5} fill="none" stroke={C.goldDark} strokeWidth={3} />
      <rect x={-24} y={-26} width={48} height={48} rx={13} fill={C.purple} />
      <circle cx={-9} cy={-3} r={6.5} fill="#fff" />
      <circle cx={9} cy={-3} r={6.5} fill="#fff" />
    </g>
  );
}

/** Người chơi nhìn từ phía sau: đầu tròn, thân, chân */
function Runner({ x, y, s = 1, lean = 0 }: { x: number; y: number; s?: number; lean?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s}) rotate(${lean})`}>
      <circle cx={0} cy={-34} r={9} fill="#3a2a22" />
      <rect x={-10} y={-24} width={20} height={26} rx={7} fill="#f3efe6" stroke={C.wood} strokeWidth={1.5} />
      <rect x={-9} y={2} width={7} height={16} rx={3} fill="#25356b" />
      <rect x={2} y={2} width={7} height={16} rx={3} fill="#25356b" />
    </g>
  );
}

/** Đường 3 làn nhìn từ phía sau */
function Lanes({ dim }: { dim?: boolean }) {
  return (
    <g>
      <rect x={0} y={0} width={ART_W} height={ART_H} fill={C.sky} />
      <rect x={0} y={72} width={ART_W} height={108} fill={C.grass} />
      <polygon points="140,60 180,60 290,180 30,180" fill={C.road} />
      <line x1={153} y1={60} x2={110} y2={180} stroke="#fff" strokeOpacity={0.8} strokeWidth={2.5} strokeDasharray="8 7" />
      <line x1={167} y1={60} x2={210} y2={180} stroke="#fff" strokeOpacity={0.8} strokeWidth={2.5} strokeDasharray="8 7" />
      {dim && <rect x={0} y={0} width={ART_W} height={ART_H} fill="rgba(59,42,32,0.12)" />}
    </g>
  );
}

function Hay({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return <path transform={`translate(${x} ${y}) scale(${s})`} d="M-22 0 C-20 -14 -8 -26 0 -28 C8 -26 20 -14 22 0 Z" fill="#d9b657" stroke="#a98a2f" strokeWidth={2} />;
}

function Card({ x, y, rot = 0, color = C.paper, stroke = C.wood, lift = false }: { x: number; y: number; rot?: number; color?: string; stroke?: string; lift?: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot})`}>
      {lift && <rect x={-26} y={-14} width={56} height={72} rx={7} fill="rgba(0,0,0,0.22)" />}
      <rect x={-30} y={-22} width={56} height={72} rx={7} fill={color} stroke={stroke} strokeWidth={2.5} />
      <rect x={-22} y={-12} width={40} height={9} rx={3} fill={C.wood} opacity={0.55} />
      <rect x={-22} y={4} width={40} height={9} rx={3} fill={C.wood} opacity={0.55} />
      <rect x={-22} y={20} width={40} height={9} rx={3} fill={C.wood} opacity={0.55} />
    </g>
  );
}

function Star({ x, y, r = 22, on = true }: { x: number; y: number; r?: number; on?: boolean }) {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 === 0 ? r : r * 0.45;
    return `${x + rr * Math.cos(a)},${y + rr * Math.sin(a)}`;
  }).join(' ');
  return <polygon points={pts} fill={on ? C.gold : 'none'} stroke={on ? C.goldDark : C.wood} strokeWidth={3} strokeLinejoin="round" strokeDasharray={on ? undefined : '5 4'} />;
}

function Page({ x, y, on = true }: { x: number; y: number; on?: boolean }) {
  return (
    <g>
      <rect x={x} y={y} width={52} height={64} rx={9} fill={on ? '#f9d77a' : C.paper} stroke={on ? C.goldDark : C.wood} strokeWidth={3} strokeDasharray={on ? undefined : '6 5'} />
      {on && (
        <>
          <rect x={x + 9} y={y + 12} width={34} height={6} rx={3} fill={C.goldDark} opacity={0.7} />
          <rect x={x + 9} y={y + 26} width={34} height={6} rx={3} fill={C.goldDark} opacity={0.7} />
          <rect x={x + 9} y={y + 40} width={22} height={6} rx={3} fill={C.goldDark} opacity={0.7} />
        </>
      )}
    </g>
  );
}

const K = huongDan.phim;

const ARTS: Record<GuideArtId, () => ReactNode> = {
  'phim-di-chuyen': () => (
    <g>
      <Key x={64} y={22} label={K.w} />
      <Key x={26} y={62} label={K.a} />
      <Key x={64} y={62} label={K.s} />
      <Key x={102} y={62} label={K.d} />
      <Key x={206} y={22} arrow="up" />
      <Key x={168} y={62} arrow="left" />
      <Key x={206} y={62} arrow="down" />
      <Key x={244} y={62} arrow="right" />
      <Key x={26} y={122} w={104} h={34} label={K.shift} />
      <Key x={150} y={122} w={144} h={34} label={K.space} />
    </g>
  ),
  'chuot-camera': () => (
    <g>
      <rect x={130} y={34} width={60} height={96} rx={30} fill="#fffaf0" stroke={C.wood} strokeWidth={3} />
      <line x1={130} y1={78} x2={190} y2={78} stroke={C.wood} strokeWidth={2.5} />
      <line x1={160} y1={34} x2={160} y2={78} stroke={C.wood} strokeWidth={2.5} />
      <Arrow x1={118} y1={82} x2={50} y2={82} />
      <Arrow x1={202} y1={82} x2={270} y2={82} />
      <Key x={236} y={128} w={52} h={30} label={K.esc} />
    </g>
  ),
  'can-dieu-khien': () => (
    <Phone>
      <circle cx={92} cy={112} r={34} fill="rgba(255,255,255,0.45)" stroke={C.ink} strokeWidth={3} />
      <circle cx={104} cy={100} r={15} fill={C.purple} stroke={C.ink} strokeWidth={2.5} />
      <Arrow x1={112} y1={76} x2={150} y2={52} width={4} />
      <circle cx={248} cy={116} r={21} fill={C.gold} stroke={C.ink} strokeWidth={3} />
      <polyline points="239,121 248,110 257,121" fill="none" stroke={C.ink} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={206} cy={96} r={16} fill={C.paper} stroke={C.ink} strokeWidth={3} />
      <path d="M200 100 v-9 M204 100 v-12 M208 100 v-12 M212 100 v-9 M200 100 q6 8 12 0" fill="none" stroke={C.ink} strokeWidth={2.5} strokeLinecap="round" />
    </Phone>
  ),
  'vuot-camera': () => (
    <Phone dim="left">
      <Arrow x1={190} y1={90} x2={262} y2={90} />
      <Finger x={190} y={90} />
    </Phone>
  ),
  'phim-e': () => (
    <g>
      <rect x={0} y={0} width={ART_W} height={ART_H} fill={C.sky} />
      <rect x={0} y={118} width={ART_W} height={62} fill={C.grass} />
      <Bi x={86} y={86} s={1.15} />
      <rect x={52} y={106} width={68} height={8} rx={4} fill="rgba(0,0,0,0.15)" />
      <Key x={186} y={52} w={76} h={76} label={K.e} />
      <Arrow x1={176} y1={90} x2={134} y2={90} width={4} />
    </g>
  ),
  'nut-tay': () => (
    <Phone>
      <Bi x={104} y={92} s={0.95} />
      <circle cx={246} cy={112} r={22} fill={C.paper} stroke={C.ink} strokeWidth={3} />
      <path d="M239 117 v-10 M244 117 v-14 M249 117 v-14 M254 117 v-10 M239 117 q7 10 15 0" fill="none" stroke={C.ink} strokeWidth={3} strokeLinecap="round" />
      <circle cx={246} cy={112} r={32} fill="none" stroke={C.purple} strokeWidth={3} strokeDasharray="6 5" />
      <Finger x={262} y={130} />
      <Arrow x1={170} y1={92} x2={206} y2={104} width={4} />
    </Phone>
  ),
  'ba-lan-phim': () => (
    <g>
      <Lanes />
      <Runner x={160} y={118} s={1.1} />
      <Arrow x1={125} y1={80} x2={72} y2={80} />
      <Arrow x1={195} y1={80} x2={248} y2={80} />
      <Key x={44} y={138} w={30} h={30} label={K.a} />
      <Key x={80} y={138} w={30} h={30} arrow="left" />
      <Key x={210} y={138} w={30} h={30} arrow="right" />
      <Key x={246} y={138} w={30} h={30} label={K.d} />
    </g>
  ),
  'ba-lan-vuot': () => (
    <g>
      <Lanes />
      <Runner x={160} y={112} s={1.1} />
      <Arrow x1={92} y1={140} x2={236} y2={140} />
      <Finger x={92} y={140} />
    </g>
  ),
  'nhay-truot-phim': () => (
    <g>
      <rect x={0} y={0} width={ART_W} height={ART_H} fill={C.sky} />
      <rect x={0} y={104} width={ART_W} height={76} fill={C.road} />
      <line x1={160} y1={20} x2={160} y2={170} stroke={C.wood} strokeWidth={2} strokeDasharray="4 6" opacity={0.6} />
      {/* nhảy qua đống rơm */}
      <Hay x={80} y={104} s={1.2} />
      <Runner x={80} y={44} s={0.9} />
      <path d="M40 100 Q80 14 120 100" fill="none" stroke={C.purple} strokeWidth={4} strokeDasharray="7 6" strokeLinecap="round" />
      <Key x={36} y={128} w={34} h={34} arrow="up" />
      <Key x={76} y={128} w={72} h={34} label={K.space} />
      {/* trượt qua sào cao */}
      <rect x={196} y={52} width={96} height={9} rx={4} fill="#a07a3f" stroke={C.wood} strokeWidth={2} />
      <rect x={200} y={52} width={6} height={52} fill={C.wood} />
      <rect x={282} y={52} width={6} height={52} fill={C.wood} />
      <Runner x={244} y={94} s={0.7} lean={80} />
      <Arrow x1={190} y1={118} x2={298} y2={118} width={4} />
      <Key x={206} y={134} w={30} h={30} arrow="down" />
      <Key x={244} y={134} w={30} h={30} label={K.s} />
    </g>
  ),
  'nhay-truot-vuot': () => (
    <g>
      <rect x={0} y={0} width={ART_W} height={ART_H} fill={C.sky} />
      <rect x={0} y={104} width={ART_W} height={76} fill={C.road} />
      <line x1={160} y1={20} x2={160} y2={170} stroke={C.wood} strokeWidth={2} strokeDasharray="4 6" opacity={0.6} />
      <Hay x={80} y={104} s={1.2} />
      <Runner x={80} y={44} s={0.9} />
      <path d="M40 100 Q80 14 120 100" fill="none" stroke={C.purple} strokeWidth={4} strokeDasharray="7 6" strokeLinecap="round" />
      <Arrow x1={80} y1={166} x2={80} y2={122} />
      <Finger x={80} y={166} />
      <rect x={196} y={52} width={96} height={9} rx={4} fill="#a07a3f" stroke={C.wood} strokeWidth={2} />
      <rect x={200} y={52} width={6} height={52} fill={C.wood} />
      <rect x={282} y={52} width={6} height={52} fill={C.wood} />
      <Runner x={244} y={94} s={0.7} lean={80} />
      <Arrow x1={244} y1={120} x2={244} y2={166} />
      <Finger x={244} y={120} />
    </g>
  ),
  'keo-the': () => (
    <g>
      <rect x={0} y={0} width={ART_W} height={ART_H} fill="#efe0bd" />
      <Card x={44} y={96} />
      <Card x={112} y={96} />
      <rect x={168} y={74} width={56} height={72} rx={7} fill="none" stroke={C.green} strokeWidth={3.5} strokeDasharray="8 6" />
      <g transform="translate(236 40)">
        <Card x={0} y={0} rot={-9} color="#fffaf0" stroke={C.purple} lift />
      </g>
      <path d="M232 70 Q212 86 200 100" fill="none" stroke={C.purple} strokeWidth={4} strokeLinecap="round" strokeDasharray="7 6" />
      <polygon points="196,108 200,92 210,102" fill={C.purple} />
      <Finger x={250} y={34} />
    </g>
  ),
  'soi-the': () => (
    <g>
      <rect x={0} y={0} width={ART_W} height={ART_H} fill="#efe0bd" />
      <Card x={64} y={92} />
      <Card x={140} y={92} color="#fde2dd" stroke={C.red} />
      <circle cx={230} cy={64} r={28} fill={C.glass} stroke={C.ink} strokeWidth={5} />
      <line x1={250} y1={86} x2={282} y2={124} stroke={C.ink} strokeWidth={9} strokeLinecap="round" />
      <path d="M216 64 l10 10 l18 -20" fill="none" stroke={C.green} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={186} cy={30} r={15} fill={C.red} />
      <path d="M180 24 l12 12 M192 24 l-12 12" stroke="#fff" strokeWidth={4} strokeLinecap="round" />
      <circle cx={110} cy={30} r={15} fill={C.green} />
      <path d="M103 30 l6 6 l11 -12" fill="none" stroke="#fff" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
    </g>
  ),
  'ro-trang': () => (
    <g>
      <rect x={0} y={0} width={ART_W} height={ART_H} fill="#efe0bd" />
      <Card x={60} y={92} />
      <g transform="translate(120 56)">
        <Card x={0} y={0} rot={-8} color="#fde2dd" stroke={C.red} lift />
      </g>
      <path d="M170 44 Q210 52 224 96" fill="none" stroke={C.purple} strokeWidth={4} strokeLinecap="round" strokeDasharray="7 6" />
      <polygon points="228,106 216,90 232,90" fill={C.purple} />
      <path d="M200 110 L292 110 L278 168 L214 168 Z" fill="#c99a5b" stroke={C.wood} strokeWidth={3.5} strokeLinejoin="round" />
      <path d="M205 128 H287 M209 146 H283 M232 112 L226 166 M258 112 L258 166 M280 112 L286 166" stroke={C.wood} strokeWidth={2.5} fill="none" />
    </g>
  ),
  sao: () => (
    <g>
      <rect x={0} y={0} width={ART_W} height={ART_H} fill="#fbf1d6" />
      <Star x={90} y={96} r={40} />
      <Star x={160} y={84} r={46} />
      <Star x={230} y={96} r={40} on={false} />
    </g>
  ),
  'bong-den': () => (
    <g>
      <rect x={0} y={0} width={ART_W} height={ART_H} fill="#fbf1d6" />
      <circle cx={160} cy={78} r={42} fill="#ffe27a" stroke={C.goldDark} strokeWidth={4} />
      <rect x={142} y={118} width={36} height={22} rx={5} fill="#c9c4b8" stroke={C.wood} strokeWidth={3} />
      <rect x={146} y={142} width={28} height={10} rx={5} fill={C.wood} />
      <path d="M150 112 q-6 -22 10 -22 q16 0 10 22" fill="none" stroke={C.goldDark} strokeWidth={3} strokeLinecap="round" />
      <path d="M160 18 v-10 M108 34 l-8 -8 M212 34 l8 -8 M90 80 h-12 M230 80 h12" stroke={C.gold} strokeWidth={5} strokeLinecap="round" />
    </g>
  ),
  'cuon-giay': () => (
    <g>
      <rect x={0} y={0} width={ART_W} height={ART_H} fill={C.sky} />
      <rect x={0} y={138} width={ART_W} height={42} fill={C.grass} />
      <polygon points="146,0 174,0 190,148 130,148" fill="#ffe27a" opacity={0.55} />
      <ellipse cx={160} cy={150} rx={44} ry={9} fill="#ffe27a" opacity={0.8} />
      <g transform="rotate(-14 160 108)">
        <rect x={118} y={92} width={84} height={30} rx={14} fill="#fff1c2" stroke={C.goldDark} strokeWidth={3} />
        <rect x={110} y={88} width={14} height={38} rx={6} fill={C.wood} />
        <rect x={196} y={88} width={14} height={38} rx={6} fill={C.wood} />
        <path d="M132 102 h56 M132 112 h40" stroke={C.purple} strokeWidth={4} strokeLinecap="round" />
      </g>
      <path d="M96 60 l8 8 M224 60 l-8 8 M80 100 h-12 M240 100 h12 M160 40 v-14" stroke={C.gold} strokeWidth={5} strokeLinecap="round" />
    </g>
  ),
  'ban-do-nho': () => (
    <g>
      <rect x={0} y={0} width={ART_W} height={ART_H} fill={C.sky} />
      <circle cx={96} cy={94} r={70} fill="#cfe2a6" stroke={C.wood} strokeWidth={5} />
      <clipPath id="gd-ban-do-nho">
        <circle cx={96} cy={94} r={66} />
      </clipPath>
      <g clipPath="url(#gd-ban-do-nho)">
        <circle cx={96} cy={94} r={34} fill="#ead9aa" />
        <circle cx={96} cy={94} r={12} fill="#dcc78f" />
        <path d="M96 20 V168 M26 94 H166" stroke="#c9915b" strokeWidth={9} />
        <path d="M146 26 q-18 40 -2 70 q14 30 26 56" stroke="#6fb7d8" strokeWidth={15} fill="none" strokeLinecap="round" />
      </g>
      <rect x={90} y={26} width={12} height={12} rx={3} fill={C.green} stroke={C.ink} strokeWidth={1.5} />
      <rect x={90} y={150} width={12} height={12} rx={3} fill="#9a948a" stroke={C.ink} strokeWidth={1.5} />
      <rect x={32} y={88} width={12} height={12} rx={3} fill="#9a948a" stroke={C.ink} strokeWidth={1.5} />
      <rect x={148} y={88} width={12} height={12} rx={3} fill="#9a948a" stroke={C.ink} strokeWidth={1.5} />
      <circle cx={96} cy={32} r={13} fill="none" stroke={C.red} strokeWidth={3.5} />
      <path d="M96 78 L108 108 L96 100 L84 108 Z" fill={C.purple} stroke="#fff" strokeWidth={2.5} strokeLinejoin="round" />
      <circle cx={96} cy={24} r={10} fill="#fff" stroke={C.wood} strokeWidth={2} />
      <path d="M96 17 L101 28 L91 28 Z" fill={C.ink} />
      <rect x={196} y={20} width={104} height={78} rx={10} fill={C.paper} stroke={C.wood} strokeWidth={4} />
      <circle cx={248} cy={34} r={8} fill="none" stroke="#7a9d57" strokeWidth={2} strokeDasharray="4 3" />
      <circle cx={248} cy={84} r={8} fill="none" stroke="#7a9d57" strokeWidth={2} strokeDasharray="4 3" />
      <circle cx={222} cy={59} r={8} fill="none" stroke="#7a9d57" strokeWidth={2} strokeDasharray="4 3" />
      <circle cx={274} cy={59} r={8} fill="none" stroke="#7a9d57" strokeWidth={2} strokeDasharray="4 3" />
      <circle cx={248} cy={59} r={6} fill="#ead9aa" />
      <path d="M248 40 V78 M228 59 H268" stroke="#c9915b" strokeWidth={3} />
      <Key x={226} y={118} w={44} h={44} label={K.m} />
      <Arrow x1={248} y1={114} x2={248} y2={104} width={3} />
    </g>
  ),
  'bon-trang': () => (
    <g>
      <rect x={0} y={0} width={ART_W} height={ART_H} fill="#fbf1d6" />
      <Page x={22} y={52} />
      <Page x={92} y={52} />
      <Page x={162} y={52} />
      <Page x={232} y={52} />
      <path d="M48 30 l4 8 l8 4 l-8 4 l-4 8 l-4 -8 l-8 -4 l8 -4 Z M258 150 l3 6 l6 3 l-6 3 l-3 6 l-3 -6 l-6 -3 l6 -3 Z" fill={C.gold} />
    </g>
  ),
};

export interface GuideArtProps {
  id: GuideArtId;
  className?: string;
}

/** Hình minh họa của một trang hướng dẫn (trang trí: đã có lời chú thích bên cạnh nên ẩn với phần mềm đọc màn hình). */
export function GuideArt({ id, className }: GuideArtProps) {
  return (
    <svg viewBox={`0 0 ${ART_W} ${ART_H}`} className={className} aria-hidden="true" focusable="false" data-art={id}>
      {ARTS[id]()}
    </svg>
  );
}
