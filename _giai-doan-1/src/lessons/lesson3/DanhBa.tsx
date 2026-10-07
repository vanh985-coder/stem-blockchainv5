import React from 'react';
import { PEOPLE, DIRECTORY_KEYS } from './logic';
import { Avatar, CharacterType } from '../../components/ui/Avatar';
import { DraggableCard } from '../../components/game/TapOrDrag';

export interface DanhBaProps {
  highlightIndex?: number | null;
  highlightKey?: number | null;
  selectedKey?: number | null;
  onSelectKey?: (key: number) => void;
  userName?: string;
  interactive?: boolean;
  enableDrag?: boolean;
  compact?: boolean;
  className?: string;
}

export const DanhBa: React.FC<DanhBaProps> = ({
  highlightIndex = null,
  highlightKey = null,
  selectedKey = null,
  onSelectKey,
  userName,
  interactive = false,
  enableDrag = false,
  compact = false,
  className = '',
}) => {
  return (
    <div
      className={`bg-white rounded-[18px] border-2 border-[#E3E0EE] p-4 sm:p-5 shadow-sticker-sm ${className}`}
    >
      <div className="flex items-center justify-between gap-2 mb-3.5 pb-2.5 border-b border-[#F0EEF8]">
        <div className="flex items-center gap-2.5">
          <span className="text-xl">📖</span>
          <div>
            <h3 className="font-display font-black text-base sm:text-lg text-[#2A2340] leading-tight">
              Danh bạ khóa công khai
            </h3>
            <p className="text-xs text-[#6B6485]">
              Mọi người đều xem và đối chiếu được
            </p>
          </div>
        </div>
        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[#EDE9FE] text-[#5B3FD6] shrink-0">
          Công khai
        </span>
      </div>

      <div className={`grid ${compact ? 'grid-cols-2' : 'grid-cols-1 sm:grid-cols-2'} gap-3`}>
        {PEOPLE.map((person, idx) => {
          const isHighlighted =
            highlightIndex === idx || highlightKey === person.publicKey;
          const isSelected = selectedKey === person.publicKey;
          const isEm = person.id === 'em';
          const displayName = isEm ? (userName || 'Em') : undefined;

          return (
            <div
              key={person.id}
              onClick={() => {
                if (interactive && onSelectKey) {
                  onSelectKey(person.publicKey);
                }
              }}
              className={`
                flex items-center justify-between p-2.5 sm:p-3 rounded-[14px] border-2 transition-all duration-150 min-h-[56px]
                ${
                  isSelected
                    ? 'border-[#5B3FD6] bg-[#EDE9FE]/50 ring-2 ring-[#5B3FD6]/40 shadow-xs'
                    : isHighlighted
                    ? 'border-[#5B3FD6] bg-[#F5F3FF] shadow-sticker-sm ring-2 ring-[#5B3FD6]/30 animate-pulse'
                    : 'border-[#F0EEF8] bg-[#FAFAFC] hover:border-[#D0CCE0]'
                }
                ${interactive ? 'cursor-pointer active:scale-98' : ''}
              `}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Avatar
                  character={person.id as CharacterType}
                  size="sm"
                  customName={displayName}
                  showName={false}
                />
                <div className="min-w-0">
                  <div className="font-display font-bold text-sm text-[#2A2340] truncate">
                    {displayName || (
                      person.id === 'ti' ? 'Tí 🦊' :
                      person.id === 'binh' ? 'Bình 🐢' :
                      person.id === 'chi' ? 'Chi 🐇' :
                      person.id === 'an' ? 'An 🎒' :
                      person.id === 'dung' ? 'Dũng ⚽' : 'Em ⭐'
                    )}
                  </div>
                  <div className="text-xs text-[#6B6485]">Khóa công khai</div>
                </div>
              </div>

              {enableDrag ? (
                <DraggableCard
                  id={`key-${person.publicKey}`}
                  className="shrink-0"
                >
                  <div
                    className={`
                      font-mono font-black text-xl min-h-[40px] min-w-[48px] px-3.5 py-1 rounded-[10px] border-2 transition-all cursor-grab active:cursor-grabbing flex items-center justify-center
                      ${
                        isSelected || isHighlighted
                          ? 'bg-[#5B3FD6] text-white border-[#5B3FD6] ring-2 ring-[#EDE9FE] shadow-xs'
                          : 'bg-white text-[#5B3FD6] border-[#E3E0EE] hover:border-[#5B3FD6] shadow-xs'
                      }
                    `}
                    title="Kéo hoặc chạm để đưa vào Khe Khóa"
                  >
                    {person.publicKey}
                  </div>
                </DraggableCard>
              ) : (
                <div
                  className={`
                    font-mono font-black text-xl min-h-[40px] min-w-[48px] px-3.5 py-1 rounded-[10px] border-2 shrink-0 flex items-center justify-center
                    ${
                      isSelected || isHighlighted
                        ? 'bg-[#5B3FD6] text-white border-[#5B3FD6]'
                        : 'bg-white text-[#5B3FD6] border-[#E3E0EE]'
                    }
                  `}
                >
                  {person.publicKey}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
export { DIRECTORY_KEYS };
