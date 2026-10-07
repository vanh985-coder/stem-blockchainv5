import React from 'react';

export type CharacterType = 'ti' | 'binh' | 'chi' | 'an' | 'dung' | 'bi' | 'em';

export interface AvatarProps {
  character: CharacterType;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showName?: boolean;
  customName?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
  character,
  size = 'md',
  className = '',
  showName = false,
  customName,
}) => {
  const pixelSizes = {
    sm: 36,
    md: 48,
    lg: 64,
  };

  const info: Record<CharacterType, { name: string; bg: string; border: string }> = {
    ti: { name: 'Tí 🦊', bg: '#FFF0ED', border: '#E5484D' },
    binh: { name: 'Bình 🐢', bg: '#EDFAF1', border: '#1FAF5A' },
    chi: { name: 'Chi 🐇', bg: '#FDF2F8', border: '#EC4899' },
    an: { name: 'An 🎒', bg: '#EFF6FF', border: '#2E90E8' },
    dung: { name: 'Dũng ⚽', bg: '#F5F3FF', border: '#5B3FD6' },
    bi: { name: 'Bi 📘', bg: '#EDE9FE', border: '#5B3FD6' },
    em: { name: 'Em ⭐', bg: '#EDE9FE', border: '#5B3FD6' },
  };

  const dim = pixelSizes[size];
  const char = info[character];

  return (
    <div className={`inline-flex flex-col items-center gap-1 ${className}`}>
      <div
        style={{
          width: dim,
          height: dim,
          backgroundColor: char.bg,
          borderColor: char.border,
        }}
        className="rounded-full border-2 flex items-center justify-center shadow-sticker-sm overflow-hidden select-none shrink-0"
        aria-label={char.name}
      >
        {character === 'ti' && (
          // Cáo Tí
          <svg width={dim * 0.75} height={dim * 0.75} viewBox="0 0 36 36" fill="none">
            <path d="M 6 10 L 12 20 L 6 22 Z" fill="#E5484D" />
            <path d="M 30 10 L 24 20 L 30 22 Z" fill="#E5484D" />
            <circle cx="18" cy="20" r="12" fill="#FF7849" />
            <path d="M 12 26 C 14 22 22 22 24 26 Z" fill="white" />
            <ellipse cx="14" cy="18" rx="2" ry="3" fill="#2A2340" />
            <ellipse cx="22" cy="18" rx="2" ry="3" fill="#2A2340" />
            <polygon points="17,21 19,21 18,23" fill="#2A2340" />
          </svg>
        )}

        {character === 'binh' && (
          // Rùa Bình
          <svg width={dim * 0.75} height={dim * 0.75} viewBox="0 0 36 36" fill="none">
            <ellipse cx="18" cy="22" rx="12" ry="9" fill="#1FAF5A" />
            <circle cx="18" cy="12" r="6" fill="#4ADE80" />
            <circle cx="15" cy="11" r="1.5" fill="#2A2340" />
            <circle cx="21" cy="11" r="1.5" fill="#2A2340" />
            {/* Kính cận tròn */}
            <circle cx="15" cy="11" r="3.5" stroke="#2A2340" strokeWidth="1" fill="none" />
            <circle cx="21" cy="11" r="3.5" stroke="#2A2340" strokeWidth="1" fill="none" />
            <line x1="18.5" y1="11" x2="17.5" y2="11" stroke="#2A2340" strokeWidth="1" />
          </svg>
        )}

        {character === 'chi' && (
          // Thỏ Chi
          <svg width={dim * 0.75} height={dim * 0.75} viewBox="0 0 36 36" fill="none">
            {/* Tai thỏ */}
            <ellipse cx="13" cy="9" rx="3" ry="8" fill="#F472B6" />
            <ellipse cx="23" cy="9" rx="3" ry="8" fill="#F472B6" />
            <ellipse cx="13" cy="9" rx="1.5" ry="5" fill="#FDF2F8" />
            <ellipse cx="23" cy="9" rx="1.5" ry="5" fill="#FDF2F8" />
            <circle cx="18" cy="22" r="10" fill="white" stroke="#F472B6" strokeWidth="1.5" />
            <circle cx="15" cy="21" r="1.5" fill="#2A2340" />
            <circle cx="21" cy="21" r="1.5" fill="#2A2340" />
            <polygon points="17.5,23 18.5,23 18,24" fill="#F472B6" />
          </svg>
        )}

        {character === 'an' && (
          // An
          <svg width={dim * 0.75} height={dim * 0.75} viewBox="0 0 36 36" fill="none">
            <circle cx="18" cy="18" r="12" fill="#FED7AA" />
            <path d="M 6 16 C 6 10 12 8 18 8 C 24 8 30 10 30 16 Z" fill="#1E293B" />
            <circle cx="14" cy="18" r="1.5" fill="#1E293B" />
            <circle cx="22" cy="18" r="1.5" fill="#1E293B" />
            <path d="M 15 22 Q 18 25 21 22" stroke="#1E293B" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        )}

        {character === 'dung' && (
          // Dũng
          <svg width={dim * 0.75} height={dim * 0.75} viewBox="0 0 36 36" fill="none">
            <circle cx="18" cy="18" r="12" fill="#FDE68A" />
            <path d="M 7 14 C 7 8 12 6 18 6 C 24 6 29 8 29 14 Z" fill="#92400E" />
            <circle cx="14" cy="18" r="1.5" fill="#2A2340" />
            <circle cx="22" cy="18" r="1.5" fill="#2A2340" />
            <path d="M 14 22 Q 18 26 22 22" stroke="#2A2340" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        )}

        {character === 'bi' && (
          // Bi avatar thu nhỏ
          <svg width={dim * 0.75} height={dim * 0.75} viewBox="0 0 36 36" fill="none">
            <rect x="5" y="7" width="26" height="24" rx="8" fill="#5B3FD6" />
            <circle cx="13" cy="17" r="3.5" fill="white" />
            <circle cx="23" cy="17" r="3.5" fill="white" />
            <circle cx="14" cy="17" r="1.5" fill="#2A2340" />
            <circle cx="24" cy="17" r="1.5" fill="#2A2340" />
            <path d="M 15 23 Q 18 26 21 23" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        )}
        {character === 'em' && (
          // Em (học sinh)
          <svg width={dim * 0.75} height={dim * 0.75} viewBox="0 0 36 36" fill="none">
            <circle cx="18" cy="18" r="12" fill="#DDD6FE" />
            <circle cx="18" cy="14" r="5" fill="#5B3FD6" />
            <path d="M 10 28 C 10 23 14 21 18 21 C 22 21 26 23 26 28 Z" fill="#5B3FD6" />
            <polygon points="18,5 19.5,8.5 23,8.5 20,10.5 21,14 18,12 15,14 16,10.5 13,8.5 16.5,8.5" fill="#FFC21A" />
          </svg>
        )}
      </div>

      {showName && (
        <span className="font-display font-bold text-xs text-[#2A2340]">
          {customName || char.name}
        </span>
      )}
    </div>
  );
};
