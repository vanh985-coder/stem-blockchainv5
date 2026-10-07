import React from 'react';

export type MascotMood = 'vui' | 'suy_nghi' | 'buon' | 'an_mung' | 'ngac_nhien';

export interface MascotProps {
  mood?: MascotMood;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  speechBubble?: string;
}

export const Mascot: React.FC<MascotProps> = ({
  mood = 'vui',
  size = 'md',
  className = '',
  speechBubble,
}) => {
  const pixelSizes = {
    sm: 64,
    md: 96,
    lg: 128,
    xl: 160,
  };

  const dim = pixelSizes[size];

  return (
    <div className={`relative inline-flex items-center select-none ${className}`}>
      {/* Bong bóng lời thoại nếu có */}
      {speechBubble && (
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 whitespace-nowrap bg-white border-2 border-[#5B3FD6] text-[#2A2340] text-xs sm:text-sm font-display font-bold py-1.5 px-3 rounded-full shadow-sticker z-20 animate-bounce">
          {speechBubble}
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-[#5B3FD6]" />
        </div>
      )}

      {/* SVG Linh vật Bi */}
      <svg
        width={dim}
        height={dim}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label={`Linh vật Bi tâm trạng ${mood}`}
      >
        {/* Mắt xích nhỏ trên đỉnh đầu Bi */}
        <g id="head-chain">
          <rect
            x="43"
            y="2"
            width="14"
            height="18"
            rx="7"
            stroke="#FFC21A"
            strokeWidth="3.5"
            fill="none"
          />
          <path d="M 50 16 L 50 20" stroke="#FFC21A" strokeWidth="3" strokeLinecap="round" />
        </g>

        {/* Thân Bi: khối vuông bo tròn màu mực tím với góc bo lớn */}
        <rect
          x="10"
          y="18"
          width="80"
          height="76"
          rx="24"
          fill="#5B3FD6"
        />
        {/* Điểm nhấn highlight nhẹ ở đỉnh thân */}
        <rect
          x="16"
          y="22"
          width="68"
          height="14"
          rx="7"
          fill="white"
          fillOpacity="0.15"
        />

        {/* Hai má hồng dễ thương */}
        <ellipse cx="24" cy="64" rx="6" ry="3.5" fill="#FFA8AA" fillOpacity="0.75" />
        <ellipse cx="76" cy="64" rx="6" ry="3.5" fill="#FFA8AA" fillOpacity="0.75" />

        {/* MẮT & MIỆNG THEO BIỂU CẢM (MOOD) */}
        {mood === 'vui' && (
          <>
            {/* Mắt to tròn vui vẻ */}
            <circle cx="36" cy="50" r="10" fill="white" />
            <circle cx="64" cy="50" r="10" fill="white" />
            {/* Con ngươi */}
            <circle cx="38" cy="49" r="5" fill="#2A2340" />
            <circle cx="66" cy="49" r="5" fill="#2A2340" />
            {/* Đốm sáng trong mắt */}
            <circle cx="40" cy="47" r="2" fill="white" />
            <circle cx="68" cy="47" r="2" fill="white" />
            {/* Nụ cười vui vẻ */}
            <path
              d="M 40 64 Q 50 73 60 64"
              stroke="white"
              strokeWidth="4"
              strokeLinecap="round"
              fill="none"
            />
          </>
        )}

        {mood === 'suy_nghi' && (
          <>
            {/* Mắt liếc lên suy nghĩ */}
            <circle cx="36" cy="49" r="10" fill="white" />
            <circle cx="64" cy="49" r="10" fill="white" />
            <circle cx="40" cy="45" r="5" fill="#2A2340" />
            <circle cx="68" cy="45" r="5" fill="#2A2340" />
            {/* Lông mày hơi nhíu */}
            <path d="M 28 36 L 42 39" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M 58 39 L 72 36" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
            {/* Miệng mím lại trầm tư */}
            <path
              d="M 44 66 Q 50 64 56 67"
              stroke="white"
              strokeWidth="3.5"
              strokeLinecap="round"
              fill="none"
            />
          </>
        )}

        {mood === 'buon' && (
          <>
            {/* Mắt nhìn xuống */}
            <circle cx="36" cy="52" r="10" fill="white" />
            <circle cx="64" cy="52" r="10" fill="white" />
            <circle cx="36" cy="55" r="5" fill="#2A2340" />
            <circle cx="64" cy="55" r="5" fill="#2A2340" />
            {/* Giọt mồ hôi lo lắng */}
            <path
              d="M 80 40 C 80 40 76 46 76 49 C 76 51 78 53 80 53 C 82 53 84 51 84 49 C 84 46 80 40 80 40 Z"
              fill="#2E90E8"
            />
            {/* Miệng mếu */}
            <path
              d="M 40 68 Q 50 60 60 68"
              stroke="white"
              strokeWidth="3.5"
              strokeLinecap="round"
              fill="none"
            />
          </>
        )}

        {mood === 'an_mung' && (
          <>
            {/* Mắt cười tít ^ ^ */}
            <path
              d="M 28 50 Q 36 40 44 50"
              stroke="white"
              strokeWidth="4"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M 56 50 Q 64 40 72 50"
              stroke="white"
              strokeWidth="4"
              strokeLinecap="round"
              fill="none"
            />
            {/* Miệng cười mở to rạng rỡ */}
            <path
              d="M 38 60 Q 50 78 62 60 Z"
              fill="#E5484D"
              stroke="white"
              strokeWidth="2.5"
            />
            {/* Chiếc răng nhỏ dễ thương */}
            <rect x="47" y="60" width="6" height="4" rx="2" fill="white" />
          </>
        )}

        {mood === 'ngac_nhien' && (
          <>
            {/* Mắt mở to tròn */}
            <circle cx="36" cy="48" r="12" fill="white" />
            <circle cx="64" cy="48" r="12" fill="white" />
            <circle cx="36" cy="48" r="5" fill="#2A2340" />
            <circle cx="64" cy="48" r="5" fill="#2A2340" />
            {/* Miệng chữ O ngạc nhiên */}
            <circle cx="50" cy="67" r="7" fill="white" />
          </>
        )}
      </svg>
    </div>
  );
};
