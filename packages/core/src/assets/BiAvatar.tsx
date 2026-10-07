import { useEffect, useState } from 'react';

/** Khoảng chờ giữa hai lần chớp mắt: 3–5 giây (spec 03 mục 3.5). `rand` trong [0,1). */
export function nextBlinkDelay(rand: number): number {
  return 3000 + Math.floor(rand * 2000);
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() =>
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false,
  );
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const on = () => setReduced(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return reduced;
}

export interface BiAvatarProps {
  size?: number;
  className?: string;
}

/** Bi vẽ bằng SVG: khối vuông bo tròn màu #5B3FD6 hơi phát sáng, 2 mắt trắng chớp mắt, mắt xích trên đỉnh. */
export function BiAvatar({ size = 96, className }: BiAvatarProps) {
  const reduced = usePrefersReducedMotion();
  const [blink, setBlink] = useState(false);

  useEffect(() => {
    if (reduced) {
      setBlink(false);
      return;
    }
    let t1: ReturnType<typeof setTimeout>;
    let t2: ReturnType<typeof setTimeout>;
    const schedule = () => {
      t1 = setTimeout(() => {
        setBlink(true);
        t2 = setTimeout(() => {
          setBlink(false);
          schedule();
        }, 140);
      }, nextBlinkDelay(Math.random()));
    };
    schedule();
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [reduced]);

  const eyeRy = blink ? 1.5 : 7;
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label="Bi"
      style={{ overflow: 'visible' }}
    >
      <defs>
        <filter id="bi-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="4" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <radialGradient id="bi-shine" cx="35%" cy="25%" r="80%">
          <stop offset="0%" stopColor="#8B73F0" />
          <stop offset="100%" stopColor="#5B3FD6" />
        </radialGradient>
      </defs>
      {/* mắt xích nhỏ trên đỉnh */}
      <rect x="40" y="3" width="20" height="13" rx="6.5" fill="none" stroke="#C9BCFF" strokeWidth="3.5" />
      <rect x="46" y="11" width="8" height="9" rx="3" fill="#C9BCFF" />
      {/* thân */}
      <rect x="12" y="18" width="76" height="76" rx="22" fill="url(#bi-shine)" stroke="#5B3FD6" strokeWidth="2" filter="url(#bi-glow)" />
      {/* hai mắt */}
      <ellipse cx="36" cy="54" rx="8" ry={eyeRy} fill="#fff" />
      <ellipse cx="64" cy="54" rx="8" ry={eyeRy} fill="#fff" />
    </svg>
  );
}
